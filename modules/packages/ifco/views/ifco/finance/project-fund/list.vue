<!--
  ifco —— 项目资金管理（/ifco/finance/project-fund/index）

  投融资管理 · 项目资金管理。顶部三张汇总卡（按区划/按片区/按项目汇总查询——
  卡即单选 select，点选切换查询形态，经路由 ?mode= 持久化，默认区划；橙色胶囊
  标签 + 汇总周期行 + 口径统计行，区划卡带进度条）+ 三张 BasicTable（v-show
  不销毁，各自搜索表单与列）：
  - 区划：行政区/在库项目数量/总投资/年度计划投资/统计周期内累计完成投资/
    年度投资进度(进度条)/统计周期内累计已到位资金/资金到位率(进度条)；末行全市合计；
  - 片区：片区编号/行政区/片区名称/片区批次/片区功能定位/项目数量/片区总体投资
    估算/累计已完成投资/本年度计划完成投资/统计周期内累计完成投资/年度投资进度/累计
    已到位资金/资金到位率；
  - 项目：复选框/项目编号/项目名称/行政区/片区名称/片区批次/五改分类/项目归属/
    片区总体投资估算/项目投资估算/本年度计划完成投资/累计完成投资/年度投资进度/
    累计到位资金/资金到位率。
  三表共用 时间轴（开始/结束月份 MonthPicker，暂未参与过滤）+ 一键导出（占位）；
  行政区/片区名称/项目名称/项目归属/片区批次/五改分类为本地过滤。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/finance（内存假数据，统计行
  照设计稿口径演示；刷新即恢复）。

  菜单注册（上级菜单「投融资管理」）：
   - 菜单名称：项目资金管理
   - 链接地址：/ifco/finance/project-fund/index
   - 组件位置：/ifco/finance/project-fund/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三张汇总卡：卡即单选 select（路由 ?mode=），默认按区划汇总查询 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-3">
      <div
        v-for="card in FUND_MODE_CARDS"
        :key="card.key"
        class="cursor-pointer rd-8px b-1 b-solid px-20px py-16px transition-colors"
        :class="selectedMode === card.key ? 'b-#d46b08 bg-white shadow-md' : 'b-gray-100 bg-#f0f7f4 hover:b-gray-300'"
        @click="handleCardClick(card.key)"
      >
        <div class="flex items-center justify-between">
          <span class="rd-full b-1 b-solid b-#d46b08 bg-white px-12px py-2px text-14px text-#d46b08">
            {{ card.label }}
          </span>
          <span v-if="selectedMode === card.key" class="i-ant-design:check-circle-filled text-16px text-#d46b08"></span>
        </div>
        <div class="mt-10px text-13px text-gray-500">{{ card.period }}</div>
        <div v-if="card.progress !== undefined" class="mt-8px flex items-center gap-12px">
          <div class="h-10px w-140px overflow-hidden rd-full bg-gray-100">
            <div class="h-full rd-full bg-#1677ff" :style="{ width: `${card.progress}%` }"></div>
          </div>
          <span class="text-12px text-gray-600">{{ card.progress }}%</span>
        </div>
        <div class="mt-8px flex flex-col gap-4px text-13px text-gray-600">
          <span v-for="line in card.lines" :key="line">{{ line }}</span>
        </div>
      </div>
    </div>

    <!-- 区划形态 -->
    <div v-show="selectedMode === 'district'">
      <BasicTable @register="registerDistrictTable">
        <template #toolbar>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #district="{ record }">
          <span :class="record.district === '全市合计' ? 'font-600' : ''">{{ record.district }}</span>
        </template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #arrivalRate="{ record }">
          <Progress :percent="record.arrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>

    <!-- 片区形态 -->
    <div v-show="selectedMode === 'area'">
      <BasicTable @register="registerAreaTable">
        <template #toolbar>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #arrivalRate="{ record }">
          <Progress :percent="record.arrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>

    <!-- 项目形态 -->
    <div v-show="selectedMode === 'project'">
      <BasicTable @register="registerProjectTable">
        <template #toolbar>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
        <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
        <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #arrivalRate="{ record }">
          <Progress :percent="record.arrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceProjectFundIndex">
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Progress } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    FIVE_REFORM_TYPE_OPTIONS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import {
    DISTRICT_FUND_ROWS,
    FUND_MODE_CARDS,
    filterAreaFundRows,
    filterDistrictFundRows,
    filterProjectFundRows,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FundMode,
  } from '@jeesite/ifco/api/ifco/finance';

  const { showMessage } = useMessage();
  const route = useRoute();
  const router = useRouter();

  const DEFAULT_MODE: FundMode = 'district';

  const selectedMode = computed(
    () => (FUND_MODE_CARDS.some((card) => card.key === route.query.mode) ? route.query.mode : DEFAULT_MODE) as FundMode,
  );

  /** 汇总卡点选（单选）：只改 URL，形态切换由 computed 联动 */
  function handleCardClick(key: FundMode) {
    if (selectedMode.value === key) return;
    router.replace({ query: { ...route.query, mode: key } });
  }

  // ── 共用搜索字段口径 ────────────────────────────────────────────────
  const districtFilterOptions = [
    { label: '全部', value: '' },
    ...DISTRICT_FUND_ROWS.filter((row) => row.district !== '全市合计').map((row) => ({
      label: row.district,
      value: row.district,
    })),
  ];
  const statisticTypeOptions = [
    { label: '按投资进度', value: 'invest' },
    { label: '按资金到位', value: 'arrival' },
  ];
  const affiliationOptions = [...PROJECT_AFFILIATION_OPTIONS];
  const batchOptions = [...RENEWAL_AREA_BATCH_OPTIONS];
  const fiveReformOptions = [...FIVE_REFORM_TYPE_OPTIONS];

  // ── 区划形态 ────────────────────────────────────────────────────────
  const districtColumns: BasicColumn[] = [
    { title: '行政区', dataIndex: 'district', width: 120, fixed: 'left', slot: 'district' },
    { title: '在库项目数量(个)', dataIndex: 'projectCount', width: 130, align: 'right' },
    { title: '总投资（亿元）', dataIndex: 'totalInvest', width: 120, align: 'right' },
    { title: '年度计划投资（亿元）', dataIndex: 'yearPlanInvest', width: 150, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 140, slot: 'yearProgressRate' },
    { title: '统计周期内累计已到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 200, align: 'right' },
    { title: '资金到位率', dataIndex: 'arrivalRate', width: 130, fixed: 'right', slot: 'arrivalRate' },
  ];

  const [registerDistrictTable, { setTableData: setDistrictData }] = useTable({
    dataSource: filterDistrictFundRows({}),
    columns: districtColumns,
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '开始月份',
          field: 'startMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtFilterOptions, allowClear: true },
        },
        {
          label: '统计类型',
          field: 'statisticType',
          component: 'Select',
          componentProps: { options: statisticTypeOptions, allowClear: true },
        },
      ],
    },
    // 无后端：行政区本地过滤（时间轴/统计类型暂未参与，见文件头注释）
    handleSearchInfoFn: (params: Recordable) => {
      setDistrictData(filterDistrictFundRows(params));
      return params;
    },
  });

  // ── 片区形态 ────────────────────────────────────────────────────────
  const areaColumns: BasicColumn[] = [
    { title: '片区编号', dataIndex: 'areaCode', width: 100, fixed: 'left' },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 110, fixed: 'left' },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '片区功能定位', dataIndex: 'orientation', width: 110 },
    { title: '项目数量(个)', dataIndex: 'projectCount', width: 100, align: 'right' },
    { title: '片区总体投资估算（亿元）', dataIndex: 'areaTotalInvest', width: 160, align: 'right' },
    { title: '累计已完成投资（亿元）', dataIndex: 'accumulatedCompletedInvest', width: 150, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearInvestPlan', width: 140, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 130, slot: 'yearProgressRate' },
    { title: '统计周期内累计已到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 200, align: 'right' },
    { title: '资金到位率', dataIndex: 'arrivalRate', width: 120, fixed: 'right', slot: 'arrivalRate' },
  ];

  const [registerAreaTable, { setTableData: setAreaData }] = useTable({
    dataSource: filterAreaFundRows({}),
    columns: areaColumns,
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '开始月份',
          field: 'startMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtFilterOptions, allowClear: true },
        },
        { label: '片区名称', field: 'renewalAreaName', component: 'Input' },
        {
          label: '统计类型',
          field: 'statisticType',
          component: 'Select',
          componentProps: { options: statisticTypeOptions, allowClear: true },
        },
      ],
    },
    handleSearchInfoFn: (params: Recordable) => {
      setAreaData(filterAreaFundRows(params));
      return params;
    },
  });

  // ── 项目形态 ────────────────────────────────────────────────────────
  const projectColumns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 210, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '片区总体投资估算（亿元）', dataIndex: 'areaTotalInvest', width: 160, align: 'right' },
    { title: '项目投资估算（亿元）', dataIndex: 'projectInvestEstimate', width: 140, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearInvestPlan', width: 140, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 130, slot: 'yearProgressRate' },
    { title: '统计周期内累计到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 190, align: 'right' },
    { title: '资金到位率', dataIndex: 'arrivalRate', width: 120, fixed: 'right', slot: 'arrivalRate' },
  ];

  const [registerProjectTable, { setTableData: setProjectData }] = useTable({
    dataSource: filterProjectFundRows({}),
    columns: projectColumns,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '开始月份',
          field: 'startMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: { valueFormat: 'YYYY-MM', placeholder: '请选择' },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtFilterOptions, allowClear: true },
        },
        { label: '片区名称', field: 'renewalAreaName', component: 'Input' },
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '项目归属',
          field: 'projectAffiliation',
          component: 'Select',
          componentProps: { options: affiliationOptions, allowClear: true },
        },
        {
          label: '片区批次',
          field: 'renewalAreaBatch',
          component: 'Select',
          componentProps: { options: batchOptions, allowClear: true },
        },
        {
          label: '五改分类',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: { options: fiveReformOptions, allowClear: true },
        },
      ],
    },
    handleSearchInfoFn: (params: Recordable) => {
      setProjectData(filterProjectFundRows(params));
      return params;
    },
  });

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
