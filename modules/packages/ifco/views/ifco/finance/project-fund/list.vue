<!--
  ifco —— 项目资金管理（/ifco/finance/project-fund/index）

  投融资管理 · 项目资金管理。顶部三张汇总卡（按区划/按片区/按项目汇总查询——
  卡即单选 select，点选切换查询形态，经路由 ?mode= 持久化，默认区划；卡片样式
  同在库项目管理统计卡：白卡，选中=蓝描边浅蓝底+对勾；汇总周期行 + 口径统计行，
  区划卡带进度条）+ 三张 BasicTable（v-show
  不销毁，各自搜索表单与列）：
  - 区划（真实口径统计，api/ifco/finance fetchDistrictFundStats：既在实施库且
    年度计划已采纳的项目）：行政区/在库项目数量(随统计期)/总投资(实施库投资
    估算)/本年度计划完成投资(采纳行)/本年度累计完成投资(最新月度填报)/统计
    周期内累计完成投资(逐月当月完成加和)/年度投资进度(进度条)/本年度累计
    实际到位资金(资金填报 r104 当年加和)/统计周期内累计已到位资金(r104 逐月
    加和)/年度资金到位率(进度条)；末行全市合计；开始月份限 2026-10 起、
    结束月份默认当前月，默认显示本年度统计数据；
  - 片区（真实口径统计，api/ifco/finance fetchAreaFundStats：既在实施库且年度
    计划已采纳的项目按片区汇总，片区外零星项目不进片区表；片区编号/行政区/
    片区批次/功能定位/片区总体投资估算取自策划方案填报，方案缺项回退项目行）：
    片区编号/行政区/片区名称/片区批次/片区功能定位/项目数量(随统计期)/片区
    总体投资估算(方案 invest)/本年度计划完成投资(采纳行加和)/本年度累计完成
    投资(最新月度填报加和)/统计周期内累计完成投资(逐月当月完成加和)/年度
    投资进度(进度条)/本年度累计实际到位资金(资金填报 r104 当年加和)/统计
    周期内累计已到位资金(r104 逐月加和)/年度资金到位率(进度条)；月份口径
    同区划形态（开始月份限 2026-10 起、结束月份默认当前月）；
  - 项目（真实口径统计，api/ifco/finance fetchProjectFundStats：实施库 ∩
    年度计划已采纳，一行一项目，按项目编号排序）：复选框/项目编号/项目名称/
    行政区/片区名称/片区批次/五改分类/项目归属/片区总体投资估算(所属片区
    策划方案值)/项目投资估算/本年度计划完成投资(采纳行)/本年度累计完成投资
    (最新月度填报)/统计周期内累计完成投资/年度投资进度/本年度累计实际到位
    资金/统计周期内累计已到位资金/年度资金到位率；月份口径同区划形态；
  汇总卡/趋势图仍为内存假数据（后端未介入，刷新即恢复）；
  时间轴（开始/结束月份）在区划/片区/项目三形态参与统计（见上口径）；
  一键导出（占位）。区划形态工具栏另有 查看趋势图（弹窗 ECharts：各月 投资进度/
  资金到位率/月完成投资额，演示口径同资金统计分析）。
  行政区/片区名称/项目名称/项目归属/片区批次/五改分类为本地过滤。

  菜单注册（上级菜单「投融资管理」）：
   - 菜单名称：项目资金管理
   - 链接地址：/ifco/finance/project-fund/index
   - 组件位置：/ifco/finance/project-fund/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三张汇总卡：卡即单选 select（路由 ?mode=），默认按区划汇总查询；卡片样式同在库项目管理统计卡 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-3">
      <div
        v-for="card in FUND_MODE_CARDS"
        :key="card.key"
        class="cursor-pointer bg-white rd-8px b-1 b-solid px-20px py-16px shadow-sm transition-colors"
        :class="selectedMode === card.key ? 'b-#1677ff bg-#f0f7ff' : 'b-gray-100 hover:b-gray-300'"
        @click="handleCardClick(card.key)"
      >
        <div class="flex items-center justify-between">
          <span class="text-15px font-600" :class="selectedMode === card.key ? 'text-#1677ff' : 'text-gray-900'">
            {{ card.label }}
          </span>
          <span v-if="selectedMode === card.key" class="i-ant-design:check-circle-filled text-16px text-#1677ff"></span>
        </div>
        <div class="mt-4px text-12px text-gray-400">{{ card.period }}</div>
        <div v-if="card.progress !== undefined" class="mt-10px flex items-center gap-12px">
          <div class="h-10px w-140px overflow-hidden rd-full bg-gray-100">
            <div class="h-full rd-full bg-#1677ff" :style="{ width: `${card.progress}%` }"></div>
          </div>
          <span class="text-12px text-gray-600">{{ card.progress }}%</span>
        </div>
        <div class="mt-10px flex flex-col gap-4px text-13px text-gray-600">
          <span v-for="line in card.lines" :key="line">{{ line }}</span>
        </div>
      </div>
    </div>

    <!-- 区划形态 -->
    <div v-show="selectedMode === 'district'">
      <BasicTable @register="registerDistrictTable">
        <template #toolbar>
          <a-button @click="trendVisible = true"> 查看趋势图 </a-button>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #district="{ record }">
          <span :class="record.district === '全市合计' ? 'font-600' : ''">{{ record.district }}</span>
        </template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #yearArrivalRate="{ record }">
          <Progress :percent="record.yearArrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>

    <!-- 片区形态 -->
    <div v-show="selectedMode === 'area'">
      <BasicTable @register="registerAreaTable">
        <template #toolbar>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #batch="{ record }">{{ batchLabel(record.batch) }}</template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #yearArrivalRate="{ record }">
          <Progress :percent="record.yearArrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>

    <!-- 项目形态 -->
    <div v-show="selectedMode === 'project'">
      <BasicTable @register="registerProjectTable">
        <template #toolbar>
          <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
        </template>
        <template #batch="{ record }">{{ batchLabel(record.batch) }}</template>
        <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
        <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
        <template #yearProgressRate="{ record }">
          <Progress :percent="record.yearProgressRate" size="small" style="max-width: 110px" />
        </template>
        <template #yearArrivalRate="{ record }">
          <Progress :percent="record.yearArrivalRate" size="small" style="max-width: 110px" />
        </template>
      </BasicTable>
    </div>

    <!-- 区划汇总趋势图弹窗（各月 投资进度/资金到位率/月完成投资额；演示口径同资金统计分析） -->
    <Modal v-model:open="trendVisible" title="区划汇总趋势图" :width="860" :footer="null">
      <div ref="trendRef" class="h-360px w-full"></div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceProjectFundIndex">
  import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
  import type { Ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import dayjs from 'dayjs';
  import { Modal, Progress } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useECharts } from '@jeesite/core/hooks/web/useECharts';
  import { BATCH_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import { useFiveReformTypeOptions, useProjectAffiliationOptions } from '../../shared/ifco-dicts';
  import {
    DISTRICT_FUND_ROWS,
    FUND_MODE_CARDS,
    MONTHLY_FUND_TREND,
    PORTFOLIO_START_MONTH,
    fetchAreaFundStats,
    fetchDistrictFundStats,
    fetchProjectFundStats,
    fiveReformLabel,
    projectAffiliationLabel,
    batchLabel,
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

  // ── 区划汇总趋势图（弹窗；各月 投资进度/资金到位率/月完成投资额，演示口径同资金统计分析） ──
  const trendVisible = ref(false);
  const trendRef = shallowRef<HTMLDivElement>();
  const { setOptions: setTrendOptions } = useECharts(trendRef as Ref<HTMLDivElement>);

  watch(trendVisible, async (open) => {
    if (!open) return;
    // 弹窗内容挂载后再渲染图表（useECharts 对零高元素自带重试，双保险）
    await nextTick();
    setTrendOptions({
      tooltip: { trigger: 'axis' },
      legend: { data: ['月完成投资额', '投资进度(全市平均)', '资金到位率(全市平均)'], top: 0 },
      grid: { left: 70, right: 60, top: 36, bottom: 30 },
      xAxis: { type: 'category', data: MONTHLY_FUND_TREND.map((row) => row.month) },
      yAxis: [
        { type: 'value', name: '万元' },
        { type: 'value', name: '%', max: 100, splitLine: { show: false } },
      ],
      series: [
        {
          name: '月完成投资额',
          type: 'bar',
          data: MONTHLY_FUND_TREND.map((row) => row.monthCompleted),
          itemStyle: { color: '#2B5CE6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 40,
        },
        {
          name: '投资进度(全市平均)',
          type: 'line',
          yAxisIndex: 1,
          data: MONTHLY_FUND_TREND.map((row) => row.progressRate),
          itemStyle: { color: '#F5A623' },
          smooth: true,
        },
        {
          name: '资金到位率(全市平均)',
          type: 'line',
          yAxisIndex: 1,
          data: MONTHLY_FUND_TREND.map((row) => row.arrivalRate),
          itemStyle: { color: '#22A45D' },
          smooth: true,
        },
      ],
    });
  });

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
  const affiliationOptions = useProjectAffiliationOptions();
  const batchOptions = [...BATCH_OPTIONS];
  const fiveReformOptions = useFiveReformTypeOptions();

  // ── 区划形态（真实口径统计：实施库 ∩ 年度计划已采纳；列口径见文件头注释） ──
  const districtColumns: BasicColumn[] = [
    { title: '行政区', dataIndex: 'district', width: 120, fixed: 'left', slot: 'district' },
    { title: '在库项目数量(个)', dataIndex: 'projectCount', width: 130, align: 'right' },
    { title: '总投资（亿元）', dataIndex: 'totalInvest', width: 120, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearPlanInvest', width: 170, align: 'right' },
    { title: '本年度累计完成投资（亿元）', dataIndex: 'yearAccumulatedInvest', width: 170, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 140, slot: 'yearProgressRate' },
    { title: '本年度累计实际到位资金（亿元）', dataIndex: 'yearArrivedFunds', width: 190, align: 'right' },
    { title: '统计周期内累计已到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 200, align: 'right' },
    { title: '年度资金到位率', dataIndex: 'yearArrivalRate', width: 130, fixed: 'right', slot: 'yearArrivalRate' },
  ];

  /** 统计期月份限制：开始月份自 2026-10 起（业务口径），结束月份不早于开始可选 */
  function portfolioMonthDisabled(current: dayjs.Dayjs) {
    return current.isBefore(dayjs(`${PORTFOLIO_START_MONTH}-01`), 'month');
  }

  const [registerDistrictTable, { setTableData: setDistrictData, getForm: getDistrictForm }] = useTable({
    dataSource: [],
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
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
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
    // 真实口径统计：开始/结束月份与行政区参与（缺省统计期=[2026-10, 当前月]，本年度口径字段不随统计期变化）
    handleSearchInfoFn: (params: Recordable) => {
      applyDistrictStats(params);
      return params;
    },
  });

  /** 区划汇总统计（异步接数；行政区筛选=只留该区行，不筛选时含末行全市合计） */
  async function applyDistrictStats(params: Recordable) {
    let rows;
    try {
      rows = await fetchDistrictFundStats(String(params.startMonth ?? ''), String(params.endMonth ?? ''));
    } catch (e) {
      showMessage((e as Error)?.message || '区划汇总统计加载失败');
      setDistrictData([]);
      return;
    }
    setDistrictData(params.district ? rows.filter((row) => row.district === params.district) : rows);
  }

  /** 默认统计期：2026-10 → 当前月（当前月早于 2026-10 时取 2026-10），默认显示本年度统计数据（区划/片区/项目三形态同口径） */
  onMounted(() => {
    const now = dayjs().format('YYYY-MM');
    const endMonth = now > PORTFOLIO_START_MONTH ? now : PORTFOLIO_START_MONTH;
    const defaults = { startMonth: PORTFOLIO_START_MONTH, endMonth };
    getDistrictForm().setFieldsValue(defaults);
    getAreaForm().setFieldsValue(defaults);
    getProjectForm().setFieldsValue(defaults);
    applyDistrictStats(defaults);
    applyAreaStats(defaults);
    applyProjectStats(defaults);
  });

  // ── 片区形态（真实口径统计：实施库 ∩ 年度计划已采纳，按片区汇总；列口径见文件头注释） ──
  const areaColumns: BasicColumn[] = [
    { title: '片区编号', dataIndex: 'areaCode', width: 100, fixed: 'left' },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'areaName', width: 110, fixed: 'left' },
    { title: '片区批次', dataIndex: 'batch', width: 90, slot: 'batch' },
    { title: '片区功能定位', dataIndex: 'orientation', width: 130 },
    { title: '项目数量(个)', dataIndex: 'projectCount', width: 100, align: 'right' },
    { title: '片区总体投资估算（亿元）', dataIndex: 'areaTotalInvest', width: 160, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearPlanInvest', width: 170, align: 'right' },
    { title: '本年度累计完成投资（亿元）', dataIndex: 'yearAccumulatedInvest', width: 170, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 130, slot: 'yearProgressRate' },
    { title: '本年度累计实际到位资金（亿元）', dataIndex: 'yearArrivedFunds', width: 190, align: 'right' },
    { title: '统计周期内累计已到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 200, align: 'right' },
    { title: '年度资金到位率', dataIndex: 'yearArrivalRate', width: 130, fixed: 'right', slot: 'yearArrivalRate' },
  ];

  const [registerAreaTable, { setTableData: setAreaData, getForm: getAreaForm }] = useTable({
    dataSource: [],
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
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtFilterOptions, allowClear: true },
        },
        { label: '片区名称', field: 'areaName', component: 'Input' },
        {
          label: '统计类型',
          field: 'statisticType',
          component: 'Select',
          componentProps: { options: statisticTypeOptions, allowClear: true },
        },
      ],
    },
    // 真实口径统计：开始/结束月份与行政区/片区名称参与（缺省统计期=[2026-10, 当前月]）
    handleSearchInfoFn: (params: Recordable) => {
      applyAreaStats(params);
      return params;
    },
  });

  /** 片区汇总统计（异步接数；行政区=精确过滤，片区名称=模糊过滤） */
  async function applyAreaStats(params: Recordable) {
    let rows;
    try {
      rows = await fetchAreaFundStats(String(params.startMonth ?? ''), String(params.endMonth ?? ''));
    } catch (e) {
      showMessage((e as Error)?.message || '片区汇总统计加载失败');
      setAreaData([]);
      return;
    }
    const keyword = String(params.areaName ?? '').trim();
    setAreaData(
      rows.filter(
        (row) =>
          (!params.district || row.district === params.district) && (!keyword || row.areaName.includes(keyword)),
      ),
    );
  }

  // ── 项目形态（真实口径统计：实施库 ∩ 年度计划已采纳，一行一项目；列口径见文件头注释） ──
  const projectColumns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 210, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'areaName', width: 100 },
    { title: '片区批次', dataIndex: 'batch', width: 90, slot: 'batch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '片区总体投资估算（亿元）', dataIndex: 'areaTotalInvest', width: 160, align: 'right' },
    { title: '项目投资估算（亿元）', dataIndex: 'projectInvestEstimate', width: 140, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearPlanInvest', width: 170, align: 'right' },
    { title: '本年度累计完成投资（亿元）', dataIndex: 'yearAccumulatedInvest', width: 170, align: 'right' },
    { title: '统计周期内累计完成投资（亿元）', dataIndex: 'periodCompletedInvest', width: 200, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgressRate', width: 130, slot: 'yearProgressRate' },
    { title: '本年度累计实际到位资金（亿元）', dataIndex: 'yearArrivedFunds', width: 190, align: 'right' },
    { title: '统计周期内累计已到位资金（亿元）', dataIndex: 'periodArrivedFunds', width: 200, align: 'right' },
    { title: '年度资金到位率', dataIndex: 'yearArrivalRate', width: 130, fixed: 'right', slot: 'yearArrivalRate' },
  ];

  const [registerProjectTable, { setTableData: setProjectData, getForm: getProjectForm }] = useTable({
    dataSource: [],
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
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
        },
        {
          label: '结束月份',
          field: 'endMonth',
          component: 'MonthPicker',
          componentProps: {
            valueFormat: 'YYYY-MM',
            placeholder: '请选择',
            disabledDate: portfolioMonthDisabled,
          },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtFilterOptions, allowClear: true },
        },
        { label: '片区名称', field: 'areaName', component: 'Input' },
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '项目归属',
          field: 'projectAffiliation',
          component: 'Select',
          componentProps: () => ({ options: affiliationOptions.value, allowClear: true }),
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: batchOptions, allowClear: true },
        },
        {
          label: '五改分类',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: () => ({ options: fiveReformOptions.value, allowClear: true }),
        },
      ],
    },
    // 真实口径统计：开始/结束月份与各维度本地过滤（缺省统计期=[2026-10, 当前月]）
    handleSearchInfoFn: (params: Recordable) => {
      applyProjectStats(params);
      return params;
    },
  });

  /** 项目汇总统计（异步接数；行政区/归属/批次/五改=精确过滤，片区/项目名称=模糊过滤） */
  async function applyProjectStats(params: Recordable) {
    let rows;
    try {
      rows = await fetchProjectFundStats(String(params.startMonth ?? ''), String(params.endMonth ?? ''));
    } catch (e) {
      showMessage((e as Error)?.message || '项目汇总统计加载失败');
      setProjectData([]);
      return;
    }
    const areaKeyword = String(params.areaName ?? '').trim();
    const nameKeyword = String(params.projectName ?? '').trim();
    setProjectData(
      rows.filter(
        (row) =>
          (!params.district || row.district === params.district) &&
          (!areaKeyword || row.areaName.includes(areaKeyword)) &&
          (!nameKeyword || row.projectName.includes(nameKeyword)) &&
          (!params.projectAffiliation || row.projectAffiliation === params.projectAffiliation) &&
          (!params.batch || row.batch === params.batch) &&
          (!params.fiveReformType || row.fiveReformType === params.fiveReformType),
      ),
    );
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
<style scoped>
  /* 表头换行显示（窄列长列名自动折行，如「统计周期内累计完成投资」；antd th 默认 nowrap） */
  :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
