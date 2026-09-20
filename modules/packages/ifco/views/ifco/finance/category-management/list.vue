<!--
  ifco —— 资金分类管理（/ifco/finance/category-management/index）

  投融资管理 · 资金分类管理。顶部黄横幅（当前填报周期与截止天数 + 填报进度条 +
  待填报/已填报统计；右侧 选择年份 + 一键导出（占位））+ BasicTable（项目名称/
  五改分类/当前建设阶段/填报状态 搜索表单；16 列；年度投资进度=进度条、资金偏离度
  提醒/填报状态=标签）。操作列按填报状态变化：待填报/待提交=查看+编辑，已提交=
  仅查看（exhaustive 分支）。查看/编辑走资金分类填报抽屉 form.vue（资金基本情况 +
  资金到位情况指标网格）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/finance（内存假数据，共 6 行；
  刷新即恢复）。当前建设阶段搜索字段暂未参与过滤（行数据无该字段，随设计稿核对后补）。

  菜单注册（上级菜单「投融资管理」）：
   - 菜单名称：资金分类管理
   - 链接地址：/ifco/finance/category-management/index
   - 组件位置：/ifco/finance/category-management/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 填报周期黄横幅：截止提醒 + 填报进度条 + 待/已填报统计；右侧 选择年份 + 一键导出 -->
    <div class="b-l-4px b-l-solid b-l-#d46b08 bg-#fff7e6 rd-8px px-20px py-14px shadow-sm">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-8px">
        <span class="text-15px text-gray-800">
          当前填报周期{{ FUND_FILL_PERIOD.year }}年{{ FUND_FILL_PERIOD.month }}月，距离填报截止天数{{
            FUND_FILL_PERIOD.deadlineDays
          }}天
        </span>
        <div class="flex min-w-280px flex-1 items-center gap-12px">
          <div class="h-10px w-160px overflow-hidden rd-full bg-white">
            <div class="h-full rd-full bg-#1677ff" :style="{ width: `${fillProgress}%` }"></div>
          </div>
          <span class="text-13px text-gray-600">
            待填报<span class="mx-2px text-16px font-700 text-#d46b08">{{ pendingCount }}</span
            >/已填报<span class="mx-2px text-16px font-700 text-#1677ff">{{ submittedCount }}</span>
          </span>
        </div>
        <div class="ml-auto flex items-center gap-8px">
          <span class="text-14px text-gray-600">选择年份</span>
          <Select v-model:value="year" :options="yearOptions" style="width: 100px" @change="handleTodo('切换年份')" />
          <a-button type="primary" @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </div>
      </div>
    </div>

    <!-- 列表：搜索表单 + 表格 -->
    <BasicTable @register="registerTable">
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
      <template #yearProgressRate="{ record }">
        <Progress :percent="record.yearProgressRate" size="small" style="max-width: 120px" />
      </template>
      <template #fundDeviation="{ record }">
        <Tag v-bind="fundDeviationTagProps(record.fundDeviation)" style="border-radius: 10px">
          {{ record.fundDeviation }}
        </Tag>
      </template>
      <template #fillStatus="{ record }">
        <Tag v-bind="fundFillStatusTagProps(record.fillStatus)" style="border-radius: 10px">
          {{ record.fillStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/编辑一体资金分类填报抽屉 -->
    <FundForm @register="registerDrawer" @success="refresh" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceCategoryManagementIndex">
  import { computed, ref } from 'vue';
  import { Progress, Select, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { FIVE_REFORM_TYPE_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    CONSTRUCTION_STAGE_OPTIONS,
    FUND_FILL_PERIOD,
    FUND_FILL_STATUS_OPTIONS,
    FUND_ITEMS,
    filterFundItems,
    fundDeviationTagProps,
    fundFillStatusTagProps,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FundAction,
    type FundFillStatus,
  } from '@jeesite/ifco/api/ifco/finance';
  import FundForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 填报进度（待填报/已提交按行数据实时统计） ────────────────────────
  const pendingCount = computed(() => FUND_ITEMS.filter((item) => item.fillStatus === '待填报').length);
  const submittedCount = computed(() => FUND_ITEMS.filter((item) => item.fillStatus !== '待填报').length);
  const fillProgress = computed(() =>
    FUND_ITEMS.length ? Math.round((submittedCount.value / FUND_ITEMS.length) * 100) : 0,
  );

  const year = ref('2026');
  const yearOptions = [{ label: '2026', value: '2026' }];

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧，填报状态/操作固定右侧；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 210, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '项目投资估算(亿元)', dataIndex: 'investEstimate', width: 130, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 130, align: 'right' },
    { title: '年度累计完成投资(亿元)', dataIndex: 'yearAccumulatedInvest', width: 150, align: 'right' },
    { title: '当月完成投资(亿元)', dataIndex: 'monthCompletedInvest', width: 130, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 140, slot: 'yearProgressRate' },
    { title: '资金偏离度提醒', dataIndex: 'fundDeviation', width: 110, slot: 'fundDeviation' },
    { title: '填报状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  /** 操作列按钮按填报状态变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByStatus(status: FundFillStatus): FundAction[] {
    switch (status) {
      case '待填报':
      case '待提交':
        return ['查看', '编辑'];
      case '已提交':
        return ['查看'];
    }
  }

  const actionColumn: BasicColumn = {
    width: 140,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByStatus(record.fillStatus as FundFillStatus).map((action: FundAction) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 查看走只读表单、编辑走可写表单；showFooter 打开前预设（硬性规则） */
  function handleAction(action: FundAction, record: Recordable) {
    const isView = action === '查看';
    setDrawerProps({ showFooter: !isView });
    openDrawer(true, { ...record, isView });
  }

  const fiveReformOptions = [...FIVE_REFORM_TYPE_OPTIONS];
  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const statusOptions = FUND_FILL_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterFundItems({}),
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '五改分类',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: { options: fiveReformOptions, allowClear: true },
        },
        {
          label: '当前建设阶段',
          field: 'constructionStage',
          component: 'Select',
          componentProps: { options: stageOptions, allowClear: true },
        },
        {
          label: '填报状态',
          field: 'fillStatus',
          component: 'Select',
          componentProps: { options: statusOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤（当前建设阶段暂未参与，见文件头注释）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterFundItems(params));
      return params;
    },
  });

  /** 保存/提交后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterFundItems(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
