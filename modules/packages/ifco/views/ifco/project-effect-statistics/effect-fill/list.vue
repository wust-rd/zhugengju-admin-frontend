<!--
  ifco —— 项目实施成效填报（/ifco/effect-fill/list）

  与项目进展填报（progress-fill）的结构差异（后端定案）：
  - **没有类目维度**：不分一级/二级类目 tab、没有总览 tab；
    一张转置表直接填写各项目的全部成效指标（行 = 全部指标，列 = 项目）。
  - 「一、～八、」八个节标题行仅作长表分组展示（加粗、不填写），不是类目表头；
  - 「数|面积」双值行(226/227/245/246)：后端拆 a/b 两键，本页合并为一行两个输入框；
  - 全部数据行直接填报（InputNumber），无汇总行/count 行/数量合计级录入行，
    「其中：/数量合计中：」仅为名称前缀与视觉层级，不参与自动求和；
  - 数据按「年份 × 季度 × 报送单位」组织（默认第一个有权限的单位），
    带入标记成效域独立计数（与进展域互不影响）。

  对接后端 modules/ifco（接口文档 v4 第 4 节）：
  - 进入页面拉成效指标字典 + 单位（复用进展域字典接口）+ 整包填报数据；
  - 保存按项目列颗粒度（saveEffectProject，双值拆 a/b 两键提交）；
    编辑完一列点列头对钩即存，顶部「保存」把全部脏列依次落库；
  - 删除有 id 的列调 deleteEffectProject；带入调 bringIn（服务端限一次）。

  其余约定（列级编辑/新增项目 Modal+自动滚右/带入锁删/空值置空/奇偶淡青列/
  表格区域内滚动 scroll.y+固定指标名称列/Excel 导出）与进展填报一致，见 progress-fill/list.vue 头注释。

  菜单注册(菜单名称「项目成效填报」):
   - 链接地址:/ifco/effect-fill/list
   - 组件位置:/ifco/effect-fill/list(与链接地址一致)
-->
<template>
  <PageWrapper content-full-height content-class="flex flex-col overflow-hidden">
    <PeriodDeadlineNote :year="year" :quarter="quarter" :deadline="fillDeadline" />
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <PeriodSelects v-model:year="year" v-model:quarter="quarter" @change="handleFilterChange" />
          <template v-if="reportUnitOptions.length > 1">
            <span class="ml-6 text-gray-500">项目报送单位</span>
            <Select
              v-model:value="reportUnit"
              :options="reportUnitOptions"
              placeholder="请选择"
              show-search
              option-filter-prop="label"
              class="ml-2 w-52"
              @change="handleFilterChange"
            />
            <span v-if="!unitEditable" class="ml-2 text-orange-500">只读查看</span>
          </template>
          <span v-if="fillExpired" class="ml-6 text-orange-500"> 已过填报截止，仅可查看 </span>
        </div>
        <div class="flex items-center">
          <a-button v-if="canFill" :disabled="loading" @click="handleBringIn"> 带入上一季度填写的项目列 </a-button>
          <a-button type="primary" class="ml-2" v-if="canFill" @click="handleAddProject">
            <Icon icon="i-fluent:add-12-filled" /> 新增
          </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button
            v-if="canExportAllProjects"
            class="ml-2"
            :loading="exportingAll"
            @click="handleExportAll"
          >
            导出所有项目
          </a-button>
          <a-button v-if="canFill" type="primary" class="ml-2" :loading="saving" @click="handleSave"> 保存 </a-button>
        </div>
      </div>
    </Card>

    <Card class="fill-page-card flex-1 min-h-0">
      <div ref="tableWrapRef" class="flex-1 min-h-0">
        <Table
          :columns="tableColumns"
          :data-source="FILL_ROWS"
          :loading="loading"
          :scroll="{ x: scrollX, y: tableBodyY }"
          :components="TABLE_COMPONENTS"
          :pagination="false"
          bordered
          size="small"
          row-key="key"
        />
      </div>
    </Card>

    <Modal v-model:open="bringModalOpen" title="带入上一季度填写的项目列" centered :footer="null" width="800">
      <div class="pt-2 text-gray-600">
        为方便用户填写，系统设计了带入上一季度填写的项目列功能，用户可直接在同名项目列上更新数据。
      </div>
      <div class="mt-5 flex items-center justify-between gap-3">
        <a-button color="danger" variant="solid" :disabled="bringing" @click="handleForceBringIn">
          强制带入，覆盖数据
        </a-button>
        <div class="flex flex-col gap-2">
          <a-button type="primary" :loading="bringing" @click="doBringIn('normal')">
            带入上一季度填写的项目列
          </a-button>
          <a-button :disabled="bringing" @click="doBringIn('names')"> 仅带入项目名称，值由我自己填写 </a-button>
        </div>
      </div>
    </Modal>

    <AddProjectDrawer @register="registerAddDrawer" @success="handleAddSaved" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoEffectFillList">
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
  import type { EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
  import {
    EFFECT_INDICATORS,
    UNITS,
    bringInPrevPeriod,
    ensureEffectDicts,
    loadEffectFillData,
    quarterLabel,
  } from '@jeesite/ifco/api/ifco/effect-fill';
  import { CAN_EXPORT_ALL_PROJECTS, loadAllEffectProjects } from '@jeesite/ifco/api/ifco/effect-fill';
  import { Card, Input, Modal, Select, Table } from 'antdv-next';
  import { computed, nextTick, onMounted, reactive, ref } from 'vue';
  import { createBringInController } from '../../shared/bring-in';
  import { useFillDeadline } from '../../shared/fill-deadline';
  import { PeriodDeadlineNote } from '@jeesite/shared/components/period-deadline-note';
  import { useCurrentPeriod } from '../../shared/period-options';
  import PeriodSelects from '../../shared/PeriodSelects.vue';
  import type { FillRow } from './cell-renderers';
  import { createCellRenderers } from './cell-renderers';
  import { exportEffectAllProjectsExcel, exportEffectExcel } from './export-excel';
  import AddProjectDrawer from './add-project-drawer.vue';
  import { createFillEditing } from './fill-editing';
  import { createTableColumns } from './table-columns';
  import { useTableBodyHeight } from '../../shared/table-viewport';

  const { showMessage } = useMessage();

  // ── 填报周期:年份 + 季度(默认当前;选项与年份切换修正见 shared/PeriodSelects) ─
  const { year, quarter } = useCurrentPeriod();
  /** 项目报送单位(存单位编码;默认第一个有权限的单位) */
  const reportUnit = ref<string>();
  const reportUnitOptions = computed(() => UNITS.map((unit) => ({ label: unit.name, value: unit.code })));
  /** 当前所选单位是否可填报(false=主管单位只读查看其他单位,隐藏全部写入口) */
  const unitEditable = computed(() => UNITS.find((unit) => unit.code === reportUnit.value)?.editable !== false);
  // ── 填报截止(共用 composable,纯前端拦截):超期该周期仅可查看 ──
  const { fillDeadline, fillExpired, canFill } = useFillDeadline(year, quarter, unitEditable);

  // ── 数据加载:字典一次 + (年份×季度×单位)整包(成效域无类目维度) ────────
  const loading = ref(false);
  const unitData = ref<EffectUnitData>();
  const broughtIn = ref(false);

  async function loadFill() {
    if (!reportUnit.value) return;
    loading.value = true;
    try {
      const res = await loadEffectFillData(year.value, quarter.value, reportUnit.value);
      unitData.value = res.unitData;
      broughtIn.value = res.broughtIn;
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载成效填报数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      await ensureEffectDicts();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载字典失败');
      return;
    }
    if (!reportUnit.value) reportUnit.value = UNITS[0]?.code;
    await loadFill();
  });

  // ── 编辑状态机 / 渲染函数 / 表格列(各自模块,共用同一份列宽登记) ──────
  const colWidths = reactive<Record<string, number>>({});
  const editing = createFillEditing({
    year,
    quarter,
    reportUnit,
    unitEditable: canFill,
    unitData,
    reload: loadFill,
    colWidths,
    showMessage,
  });
  const renderers = createCellRenderers({ quarter, unitEditable: canFill, showMessage, editing });
  const table = createTableColumns({ unitData, editingColKey: editing.editingColKey, colWidths, renderers });

  const { saving, dirtyCols, resetEditState, handleFilterChange, autoPersistDirty, handleSave } = editing;
  const TABLE_COMPONENTS = table.TABLE_COMPONENTS;
  const tableColumns = table.tableColumns;
  const scrollX = table.scrollX;

  // ── 新增项目:分步 Drawer(第一步选八个大类之一,第二步填该类别指标行,立即落库) ──
  const tableWrapRef = ref<HTMLDivElement>();
  // 表格视口高度:容器 flex-1 实测,详见 shared/table-viewport
  const tableBodyY = useTableBodyHeight(tableWrapRef);
  const [registerAddDrawer, { openDrawer: openAddDrawer }] = useDrawer();

  function handleAddProject() {
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    if (!reportUnit.value) return;
    openAddDrawer(true, {
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value,
    });
  }

  /** 抽屉保存成功回调:落库后的列(key=服务端 projectId)追加到表格最右并滚动露出 */
  function handleAddSaved(col: ProjectColumn) {
    if (!unitData.value) return;
    unitData.value.projects.push(col);
    nextTick(() => {
      const scroller = tableWrapRef.value?.querySelector('.ant-table-content, .ant-table-body');
      if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
      }
    });
  }

  // ── 带入上一季度(服务端复制;成效域独立计数,普通模式每周期×单位限一次) ─
  const { bringModalOpen, bringing, handleBringIn, doBringIn, handleForceBringIn } = createBringInController({
    reportUnit,
    year,
    quarter,
    loading,
    broughtIn,
    bringInApi: bringInPrevPeriod,
    autoPersistDirty,
    reload: loadFill,
    resetEditState,
    clearDirty: () => dirtyCols.clear(),
    quarterLabel,
    showMessage,
  });

  // ── 导出 ────────────────────────────────────────────────────────────
  const exporting = ref(false);
  /** 仅超管/综合协调组可见（/dict/units 的 exportAll 标记） */
  const canExportAllProjects = CAN_EXPORT_ALL_PROJECTS;
  const exportingAll = ref(false);

  async function handleExportAll() {
    if (exportingAll.value || loading.value) return;
    exportingAll.value = true;
    try {
      await ensureEffectDicts();
      const units = await loadAllEffectProjects(year.value, quarter.value);
      const projectCount = units.reduce((sum, unit) => sum + unit.projects.length, 0);
      if (!projectCount) {
        showMessage(`${year.value} 年${quarterLabel(quarter.value)}暂无任何单位填报项目`);
        return;
      }
      await exportEffectAllProjectsExcel({ year: year.value, quarter: quarter.value, units });
      showMessage(`已导出 ${quarterLabel(quarter.value)}全部项目（共 ${units.length} 个单位、${projectCount} 个项目）`);
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '导出失败');
    } finally {
      exportingAll.value = false;
    }
  }

  async function handleExport() {
    if (exporting.value || !unitData.value) return;
    exporting.value = true;
    try {
      await exportEffectExcel({
        year: year.value,
        quarter: quarter.value,
        unitName: UNITS.find((unit) => unit.code === reportUnit.value)?.name,
        unitData: unitData.value,
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报`);
    } finally {
      exporting.value = false;
    }
  }

  // ── 表格行与卡片标题 ────────────────────────────────────────────────
  const FILL_ROWS = computed<FillRow[]>(() =>
    EFFECT_INDICATORS.map((item) => ({
      key: item.key,
      kind: item.kind,
      name: item.name,
      unit: item.unit,
      code: item.code,
    })),
  );
</script>

<style>
  .fill-page-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .fill-page-card > .ant-card-body {
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* 节标题行(一、～八、)加粗,不加背景色 */
  .effect-fill-row-section {
    font-weight: 600;
  }

  /* 奇数项目列淡青底色(提升横向辨识度);优先级低于其后的编辑列样式 */
  .effect-fill-col-alt {
    background: #e6f7fa;
  }

  .effect-fill-col-editing {
    background: #f0f7ff;
  }

  .effect-fill-col-name {
    white-space: nowrap;
  }

  /* 编辑本列 icon 常驻蓝色;删除 icon 灰色、悬停变蓝 */
  .effect-fill-icon-edit {
    color: #1677ff;
    cursor: pointer;
  }

  .effect-fill-icon-edit:hover {
    color: #4096ff;
  }

  .effect-fill-icon {
    color: #8c8c8c;
    cursor: pointer;
  }

  .effect-fill-icon:hover {
    color: #1677ff;
  }
</style>
