<!--
  市住更局 —— 体检成果 编辑页（某成果目录的清单明细，原型图2）

  路由(RESTful,隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/achievement/{id}({id}=成果目录主键)
   - 组件位置:/urban-health-check/urban/achievement/_id/list
   - ?view=1 查看态；目录已提交(submitStatus=1)整页只读
  「表头不固定」的落地：明细表格列按成果类型动态切换——
   问题/资源/意愿清单(表11):序号/分析描述/对应一级维度/程度范围/关联指标项数
   需求清单(表13):序号/需求问题/满意度/维度/指标项名称（仅查看）
   储备库(表14):项目名称/维度/措施/方向/时序/类型/责任部门（仅查看）
  本期开放维护的仅问题/资源清单（新增/编辑/删除明细、自动代入）；其余类型只读展示。
  接口：achievementInfo/DetailList/DetailSave/DetailDelete/Submit/Generate/Export。
-->
<template>
  <PageWrapper>
    <!-- 顶部黄条信息栏（只读展示；编辑态待提交时提供「提交结果」） -->
    <Card class="mb-3">
      <div
        class="flex items-center justify-between px-4 py-3 flex-wrap gap-y-2"
        style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px"
      >
        <div class="flex items-center flex-wrap" style="column-gap: 48px">
          <span>体检年份：<span class="font-medium">{{ catalog?.setYear ?? '-' }}年</span></span>
          <span>成果类型：<span class="font-medium">{{ catalog?.achievementType ?? '-' }}</span></span>
          <span>清单明细数量：<span class="font-medium">{{ catalog?.itemCount ?? 0 }} {{ isItem ? '条' : '项' }}</span></span>
        </div>
        <a-button v-if="!readOnly" type="primary" :loading="submitting" @click="handleSubmitCatalog">
          提交结果
        </a-button>
        <Tag v-else-if="isSubmitted" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
      </div>
    </Card>

    <!-- 筛选卡（一级维度本地过滤，仅问题/资源/意愿清单类型） -->
    <Card v-if="isItem" class="mb-3">
      <div class="flex items-center flex-wrap" style="column-gap: 12px">
        <span class="filter-label">对应一级维度</span>
        <Select
          v-model:value="filterDim"
          placeholder="请选择"
          allow-clear
          :options="dimOptions"
          style="width: 200px"
        />
        <a-button type="primary" @click="applyFilter">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>
    </Card>

    <!-- 清单明细表格（列按成果类型动态切换） -->
    <Card>
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #toolbar>
          <div class="flex items-center w-full justify-between">
            <a-button v-if="canEdit" type="primary" @click="handleForm({ isNewRecord: true })">
              <Icon icon="i-fluent:add-12-filled" /> 新增
            </a-button>
            <div v-else />
            <div class="flex items-center">
              <a-button v-if="canEdit" class="mr-2" :loading="generating" @click="handleGenerate">自动代入</a-button>
              <a-button @click="handleExport">批量导出</a-button>
            </div>
          </div>
        </template>
        <template #firstColumn="{ record }">
          <a v-if="isItem" @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.analysisDesc">
            {{ record.analysisDesc }}
          </a>
          <span v-else>{{ record.analysisDesc ?? record.questionText ?? record.projectName }}</span>
        </template>
        <template #scopeLevel="{ record }">
          <Tag v-if="record.scopeLevel" :color="scopeColor(record.scopeLevel)" style="border-radius: 10px">
            {{ record.scopeLevel }}
          </Tag>
          <span v-else>-</span>
        </template>
        <template #indicatorCount="{ record }">
          <span v-if="record.indicatorList?.length">{{ record.indicatorList.length }} 项</span>
          <span v-else>-</span>
        </template>
        <template #satisfactionRate="{ record }">
          <span v-if="record.satisfactionRate != null" :style="record.satisfactionRate < 80 ? 'color:#cf1322' : ''">
            {{ record.satisfactionRate }}%
          </span>
          <span v-else>-</span>
        </template>
      </BasicTable>
    </Card>

    <!-- 明细抽屉（仅问题/资源/意愿清单类型；含关联指标项维护） -->
    <InputForm
      v-if="isItem"
      :read-only="readOnly"
      :indicator-items="indicatorItems"
      @register="registerDrawer"
      @success="handleSuccess"
    />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementIdList">
  import { computed, onActivated, onMounted, ref, unref } from 'vue';
  import { Card, Select, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorListLightBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import type { Achievement, AchievementDetail } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    achievementDetailDelete,
    achievementDetailList,
    achievementExport,
    achievementGenerate,
    achievementInfo,
    achievementSubmit,
    isItemType,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import { SUBMIT_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { params, query } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const catalogId = ((params.id ?? params.code) as string) || '';
  /** 查看态（列表「查看」进入 ?view=1） */
  const isView = String(query.view ?? '') === '1';

  const { showMessage, createConfirm } = useMessage();
  const { setTitle } = useTabs(router);

  /** 目录信息与明细 */
  const catalog = ref<Achievement | undefined>();
  const details = ref<AchievementDetail[]>([]);

  const isItem = computed(() => isItemType(catalog.value?.achievementType));
  const isSubmitted = computed(() => String(catalog.value?.submitStatus) === SUBMIT_STATUS.SUBMITTED);
  /** 查看态或已提交 → 整页只读；非问题/资源/意愿类型仅查看（本期不开放维护） */
  const readOnly = computed(() => isView || isSubmitted.value || !isItem.value);
  /** 可维护 = 问题/资源/意愿且未提交且非查看态 */
  const canEdit = computed(() => !readOnly.value);

  /** 关联体系的指标项全集（明细抽屉选择关联指标项 / 维度下拉） */
  const indicatorItems = ref<Indicator[]>([]);

  onMounted(load);

  /** 标签页激活时刷新（keep-alive 下再次进入）；首次激活跳过 */
  let skipFirstActivate = true;
  onActivated(() => {
    if (skipFirstActivate) {
      skipFirstActivate = false;
      return;
    }
    load();
  });

  async function load() {
    try {
      const info = await achievementInfo(catalogId);
      const { detailList, ...catalogRow } = info;
      catalog.value = catalogRow as Achievement;
      details.value = (detailList as AchievementDetail[]) ?? [];
      setTitle(`${isView ? '查看' : '编辑'} · ${info.achievementType ?? '体检成果'}`);
      setColumns(columnsFor(info.achievementType));
      if (isItemType(info.achievementType) && info.indicatorSetId) {
        loadIndicatorItems(info.indicatorSetId);
      }
    } catch (e: any) {
      showMessage(e?.message || '加载成果信息失败', 'error');
    }
  }

  async function loadIndicatorItems(setId: string) {
    try {
      indicatorItems.value = await indicatorListLightBySet(setId);
    } catch (e: any) {
      showMessage(e?.message || '指标项清单加载失败', 'error');
    }
  }

  // ==================== 动态列（表头按成果类型切换） ====================

  /** 程度范围 Tag 配色 */
  function scopeColor(level: string) {
    if (level === '严重') return 'error';
    if (level === '一般严重') return 'warning';
    return 'processing';
  }

  const itemColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '分析描述', dataIndex: 'analysisDesc', slot: 'firstColumn', minWidth: 320, ellipsis: true },
    { title: '对应一级维度', dataIndex: 'firstDimensionName', width: 130, align: 'center' },
    { title: '程度范围', dataIndex: 'scopeLevel', width: 110, align: 'center', slot: 'scopeLevel' },
    { title: '关联指标项', dataIndex: 'indicatorCount', width: 110, align: 'center', slot: 'indicatorCount' },
  ];

  const demandColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '需求问题', dataIndex: 'questionText', slot: 'firstColumn', minWidth: 300, ellipsis: true },
    { title: '满意度（%）', dataIndex: 'satisfactionRate', width: 110, align: 'center', slot: 'satisfactionRate' },
    { title: '对应一级维度', dataIndex: 'firstDimensionName', width: 130, align: 'center' },
    { title: '对应二级维度', dataIndex: 'secondDimensionName', width: 130, align: 'center' },
    { title: '对应指标项', dataIndex: 'indicatorItemName', width: 220, ellipsis: true },
  ];

  const stockColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '项目名称', dataIndex: 'projectName', slot: 'firstColumn', minWidth: 200, ellipsis: true },
    { title: '项目维度', dataIndex: 'projectDimension', width: 110, align: 'center' },
    { title: '措施', dataIndex: 'measure', width: 140, ellipsis: true },
    { title: '所属方向', dataIndex: 'updateDirection', width: 120, align: 'center' },
    { title: '实施时序', dataIndex: 'implementTiming', width: 110, align: 'center' },
    { title: '项目类型', dataIndex: 'projectType', width: 110, align: 'center' },
    { title: '责任部门', dataIndex: 'responsibilityDept', width: 130, ellipsis: true },
  ];

  function columnsFor(type?: string): BasicColumn[] {
    if (type === '需求清单') return demandColumns;
    if (type === '更新项目储备建议库') return stockColumns;
    return itemColumns;
  }

  // ==================== 筛选（一级维度本地过滤） ====================

  const filterDim = ref<string>();
  const appliedDim = ref<string>();

  const dimOptions = computed(() => {
    const names = new Set<string>();
    details.value.forEach((d) => d.firstDimensionName && names.add(d.firstDimensionName));
    return [...names].sort().map((name) => ({ label: name, value: name }));
  });

  function applyFilter() {
    appliedDim.value = filterDim.value;
  }

  function resetFilter() {
    filterDim.value = undefined;
    appliedDim.value = undefined;
  }

  const filteredDetails = computed(() => {
    const dim = appliedDim.value;
    if (!dim) return details.value;
    return details.value.filter((d) => d.firstDimensionName === dim);
  });

  // ==================== 表格 ====================

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload, setColumns }] = useTable({
    dataSource: filteredDetails,
    columns: itemColumns,
    actionColumn: {
      width: 150,
      actions: (record: Recordable) => [
        {
          label: '查看',
          ifShow: () => isItem.value,
          onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
        },
        {
          label: '编辑',
          ifShow: () => canEdit.value,
          onClick: () => handleForm({ ...record, isNewRecord: false }),
        },
        {
          label: '删除',
          color: 'error',
          ifShow: () => canEdit.value,
          popConfirm: { title: '是否确认删除该明细？', confirm: () => handleDelete(record) },
        },
      ],
    } as BasicColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // info 接口的明细行不带 catalogId，抽屉保存必需 → 注入页面持有的目录主键
    setDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openDrawer(true, { ...record, catalogId });
  }

  /** 明细保存成功回调：回读目录与明细（数量同步） */
  async function handleSuccess() {
    await load();
    reload();
  }

  async function handleDelete(record: Recordable) {
    try {
      await achievementDetailDelete([record.id]);
      showMessage('删除成功');
      await load();
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  // ==================== 提交 / 自动代入 / 导出 ====================

  const submitting = ref(false);
  async function handleSubmitCatalog() {
    submitting.value = true;
    try {
      await achievementSubmit(catalogId);
      showMessage('提交成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  /** 自动代入（先清后插）：问题/资源/意愿=指标结果中评估不足/一般的指标项 */
  const generating = ref(false);
  function handleGenerate() {
    createConfirm({
      iconType: 'warning',
      title: '自动代入确认',
      content: {
        content:
          '将清空当前全部清单明细，并按关联指标体系的指标项结果（评估为不足/一般）重新生成，是否继续？',
      },
      onOk: async () => {
        generating.value = true;
        try {
          const { generateCount } = await achievementGenerate(catalogId);
          showMessage(`自动代入完成，共生成 ${generateCount} 条明细`);
          await load();
          reload();
        } catch (e: any) {
          showMessage(e?.message || '自动代入失败', 'error');
        } finally {
          generating.value = false;
        }
      },
    });
  }

  async function handleExport() {
    await achievementExport(catalogId);
  }
</script>
<style lang="less" scoped>
  .filter-label {
    color: rgba(0, 0, 0, 0.88);
  }
</style>
