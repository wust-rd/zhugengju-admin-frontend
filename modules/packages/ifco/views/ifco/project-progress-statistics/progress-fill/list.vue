<!--
  ifco —— 项目进展填报（/ifco/progress-fill/list）

  页面结构:Card 工具栏(填报年份/填报季度/项目报送单位 | 新增项目/导出/保存)
  → 一级类目 RadioGroup(总览 + 8 大类,按钮样式,可换行)
  → 嵌套类目二级 RadioGroup(仅「老旧街区、老旧厂区、城中村等更新改造」)
  → 表格卡片(标题行右侧放「带入上一季度填写的项目列」按钮,仅非总览显示)
  → 转置填报表格:行 = 指标(第一列指标名称,缩进 = 层级 × 全角空格),列 = 项目。

  核心交互(对接后端 modules/ifco,契约见接口文档 v4):
  - 进入页面拉取字典(指标/类目/单位,单位已按数据权限过滤)+ 整包填报数据;
  - 默认整表为只读文本,点击项目列头「编辑」图标进入该列编辑态(同时仅一列;
    数值行 InputNumber,文字行 Input);自动行始终只读:
    4 个汇总行按构成行求和、「城市更新项目总数」= 项目列数(前端实时计算展示);
  - 「新增就业岗位」(r23)= 普通填报行:每项目列各自填写,小计/合计自动求和;
  - 保存:编辑完一列点列头对钩图标即存该列(saveProject,值全量同步);
    顶部「保存」按钮把全部已修改列依次落库;
  - 新增:Drawer 表单一次填项目名称 + 全部可录入指标行(add-project-drawer),
    保存即落库,成功后以服务端 projectId 为列 key 追加最右,不进表格编辑态;
  - 删除:有 id 的列调 deleteProject 后移除,未落库的临时列直接移除;
    二三四季度「带入」生成的列不可删,一季度带入上一年四季度的列可删;
  - 带入:调 bringIn(每周期×单位限一次,服务端校验),成功后整包重载;
  - 总览 tab 只读,按类目汇总:简单类目一列,嵌套类目拆三个二级子列,合计列固定第 4 列位。

  菜单注册(菜单名称「项目进展填报」):
   - 链接地址:/ifco/progress-fill/list
   - 组件位置:/ifco/progress-fill/list(与链接地址一致)
  指标清单与汇总口径见 @jeesite/ifco/api/ifco/progress-fill,Excel 导出见同目录 export-excel.ts。
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
          <a-button
            type="primary"
            class="ml-2"
            :disabled="loading"
            v-if="!isOverview && canFill"
            @click="handleAddProject"
          >
            <Icon icon="i-fluent:add-12-filled" /> 新增
          </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button v-if="canFill" type="primary" class="ml-2" :loading="saving" @click="handleSave"> 保存 </a-button>
        </div>
      </div>
    </Card>

    <Card class="fill-page-card flex-1 min-h-0">
      <RadioGroup
        v-model:value="activeCategory"
        :options="categoryOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
      <RadioGroup
        v-if="subOptions.length"
        v-model:value="activeSub"
        :options="subOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
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

    <AddProjectDrawer @register="registerAddDrawer" @success="handleAddSaved" />

    <Modal v-model:open="bringModalOpen" title="带入上一季度填写的项目列" centered :footer="null" width="600">
      <div class="pt-2 text-gray-600">
        为方便用户填写，系统设计了带入上一季度填写的项目列功能，用户可直接在同名项目列上更新数据。
      </div>
      <div class="mt-12 flex items-end justify-between gap-3">
        <a-button type="primary" danger :disabled="bringing" @click="handleForceBringIn"> 强制带入，覆盖数据 </a-button>
        <div class="flex flex-col gap-2">
          <a-button :disabled="bringing" @click="doBringIn('names')"> 仅带入项目名称，值由我自己填写 </a-button>
          <a-button type="primary" :loading="bringing" @click="doBringIn('normal')">
            带入上一季度填写的项目列
          </a-button>
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProgressFillList">
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type { PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
  import {
    CATEGORIES,
    CATEGORY_MAP,
    INDICATORS,
    UNITS,
    bringInPrevPeriod,
    ensureProgressDicts,
    loadProgressFillData,
    quarterLabel,
  } from '@jeesite/ifco/api/ifco/progress-fill';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Card, InputNumber, Modal, RadioGroup, Select, Table } from 'antdv-next';
  import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
  import { createBringInController } from '../../shared/bring-in';
  import { useFillDeadline } from '../../shared/fill-deadline';
  import { PeriodDeadlineNote } from '@jeesite/shared/components/period-deadline-note';
  import { useCurrentPeriod } from '../../shared/period-options';
  import PeriodSelects from '../../shared/PeriodSelects.vue';
  import AddProjectDrawer from './add-project-drawer.vue';
  import type { FillRow } from './cell-renderers';
  import { createCellRenderers } from './cell-renderers';
  import { exportProgressFillExcel } from './export-excel';
  import { createFillEditing } from './fill-editing';
  import { createTableColumns } from './table-columns';
  import { useTableBodyHeight } from '../../shared/table-viewport';

  const { showMessage } = useMessage();

  // ── 填报周期:年份 + 季度(默认当前;选项与年份切换修正见 shared/PeriodSelects) ─
  const { year, quarter } = useCurrentPeriod();
  /** 项目报送单位(存单位编码;切换即切换数据集;默认第一个有权限的单位) */
  const reportUnit = ref<string>();
  const reportUnitOptions = computed(() => UNITS.map((unit) => ({ label: unit.name, value: unit.code })));
  /** 当前所选单位是否可填报(false=主管单位只读查看其他单位,隐藏全部写入口) */
  const unitEditable = computed(() => UNITS.find((unit) => unit.code === reportUnit.value)?.editable !== false);
  // ── 填报截止(共用 composable,纯前端拦截):超期该周期仅可查看 ──
  const { fillDeadline, fillExpired, canFill } = useFillDeadline(year, quarter, unitEditable);

  // ── 类目选择:一级 + 嵌套二级 ────────────────────────────────────────
  const categoryOptions = computed(() => CATEGORIES.map((cat) => ({ label: cat.label, value: cat.key })));
  const activeCategory = ref('overview');
  const activeSub = ref<string>();
  const subOptions = computed(() =>
    (CATEGORY_MAP[activeCategory.value]?.children ?? []).map((item) => ({
      label: item.label,
      value: item.key,
    })),
  );
  // 嵌套类目切换时,二级默认选第一个叶子
  watch(subOptions, (options) => {
    if (options.length && !options.some((item) => item.value === activeSub.value)) {
      activeSub.value = options[0].value;
    }
  });

  /** 当前生效的叶子类目(总览返回 null) */
  const activeLeaf = computed(() => {
    if (activeCategory.value === 'overview') return null;
    const category = CATEGORY_MAP[activeCategory.value];
    return category?.children ? CATEGORY_MAP[activeSub.value ?? ''] : category;
  });
  const isOverview = computed(() => activeLeaf.value === null);

  // ── 数据加载:字典一次 + (年份×季度×单位)整包 ─────────────────────────
  const loading = ref(false);
  const periodData = ref<PeriodFillData>();
  const broughtIn = ref(false);

  async function loadFill() {
    if (!reportUnit.value) return;
    loading.value = true;
    try {
      const res = await loadProgressFillData(year.value, quarter.value, reportUnit.value);
      periodData.value = res.periodData;
      broughtIn.value = res.broughtIn;
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载填报数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      await ensureProgressDicts();
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
    activeLeaf,
    periodData,
    reload: loadFill,
    colWidths,
    showMessage,
  });
  const renderers = createCellRenderers({ quarter, unitEditable: canFill, showMessage, editing });
  const table = createTableColumns({
    activeLeaf,
    isOverview,
    periodData,
    editingColKey: editing.editingColKey,
    colWidths,
    renderers,
  });

  const { saving, dirtyCols, resetEditState, handleFilterChange, autoPersistDirty, handleSave } = editing;
  const TABLE_COMPONENTS = table.TABLE_COMPONENTS;
  const tableColumns = table.tableColumns;
  const scrollX = table.scrollX;

  // 切换类目:先把未保存的脏列自动落库,再退出编辑态(填一列保存一列)
  watch([activeCategory, activeSub], async () => {
    await autoPersistDirty();
    resetEditState();
  });

  // ── 新增项目:Drawer 表单(项目名称+可录入指标行),保存即落库,成功后追加最右列 ──
  const tableWrapRef = ref<HTMLDivElement>();
  // 表格视口高度:容器 flex-1 实测,详见 shared/table-viewport
  const tableBodyY = useTableBodyHeight(tableWrapRef);
  const [registerAddDrawer, { openDrawer: openAddDrawer }] = useDrawer();

  function handleAddProject() {
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    const leaf = activeLeaf.value;
    if (!leaf || !reportUnit.value) return;
    openAddDrawer(true, {
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value,
      leafKey: leaf.key,
      tabProjectCount: periodData.value?.[leaf.key]?.projects.length ?? 0,
    });
  }

  /** 抽屉保存成功回调:落库后的列(key=服务端 projectId)追加到当前类目最右并滚动露出 */
  function handleAddSaved(col: ProjectColumn) {
    const leaf = activeLeaf.value;
    if (!leaf || !periodData.value) return;
    const tab = periodData.value[leaf.key] ?? (periodData.value[leaf.key] = { projects: [], totals: {} });
    tab.projects.push(col);
    nextTick(() => {
      const scroller = tableWrapRef.value?.querySelector('.ant-table-content, .ant-table-body');
      if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
      }
    });
  }

  // ── 带入上一季度(服务端复制全部叶子类目;普通模式每周期×单位限一次) ────
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

  async function handleExport() {
    if (exporting.value || !periodData.value) return;
    exporting.value = true;
    try {
      await exportProgressFillExcel({
        year: year.value,
        quarter: quarter.value,
        unitName: UNITS.find((unit) => unit.code === reportUnit.value)?.name,
        periodData: periodData.value,
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报`);
    } finally {
      exporting.value = false;
    }
  }

  // ── 表格行与卡片标题 ────────────────────────────────────────────────
  const FILL_ROWS = computed<FillRow[]>(() =>
    INDICATORS.map((item) => ({
      key: item.key,
      kind: item.kind,
      name: item.name,
      unit: item.unit,
      code: item.code,
    })),
  );
</script>

<style scoped>
  .progress-fill-radios {
    row-gap: 8px;
  }
</style>

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
  /* 奇数项目列淡青底色(提升横向辨识度);优先级低于其后的汇总行/编辑列样式 */
  .progress-fill-col-alt {
    background: #f0fafa;
  }

  /* 汇总/项目数等自动行仅加粗,不加背景色;编辑中的项目列浅蓝底 */
  .progress-fill-row-sum {
    font-weight: 600;
  }

  .progress-fill-col-editing {
    background: #d5e3f2;
  }

  .progress-fill-col-name {
    white-space: nowrap;
  }

  /* 编辑本列 icon 常驻蓝色;删除 icon 灰色、悬停变蓝 */
  .progress-fill-icon-edit {
    color: #1677ff;
    cursor: pointer;
  }

  .progress-fill-icon-edit:hover {
    color: #4096ff;
  }

  .progress-fill-icon {
    color: #8c8c8c;
    cursor: pointer;
  }

  .progress-fill-icon:hover {
    color: #1677ff;
  }
</style>
