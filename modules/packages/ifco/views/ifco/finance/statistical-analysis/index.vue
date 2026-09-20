<!--
  ifco —— 资金统计分析（/ifco/finance/statistical-analysis/index）

  投融资管理 · 资金统计分析。筛选栏（时间轴 年月 至 年月 + 统计汇总；右侧一键
  导出（占位）。筛选控件为演示态——图表数字照设计稿静态抄录，不随筛选联动）+
  七张图表卡（两列栅格，末卡通栏）：
  ①各行政区统计区间项目数量分布图（柱状图，单位: 个）
  ②五改项目分类数量（环形图，单位: 个，中心=项目总数）
  ③五改项目分类总投资占比图（环形图，单位: 万元，中心=总投资折亿）
  ④五改项目总投资、年度计划投资、统计区间累计完成投资（分组柱状图，单位: 万元）
  ⑤统计区间到位资金全渠道分类统计图（环形图 八渠道，单位: 万元）
  ⑥各行政区总投资、年度计划投资、累计完成投资、到位资金分布图（分组柱状图，单位: 万元）
  ⑦各行政区统计区间内投资进度、资金到位率及月完成投资额（柱线混合图，双 Y 轴，
   单位: %/万元，通栏）。
  每卡头部：行政区下拉 + 柱状图/图表切换按钮（均为演示态，切换提示待接入）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/finance（照设计稿抄录/派生）。

  菜单注册（上级菜单「投融资管理」）：
   - 菜单名称：资金统计分析
   - 链接地址：/ifco/finance/statistical-analysis/index
   - 组件位置：/ifco/finance/statistical-analysis/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 筛选栏：时间轴（年月 至 年月）+ 统计汇总；右侧一键导出 -->
    <div class="flex flex-wrap items-center gap-12px bg-white rd-8px px-20px py-14px shadow-sm">
      <span class="text-14px text-gray-600">时间轴</span>
      <Select v-model:value="startYear" :options="yearOptions" style="width: 90px" />
      <Select v-model:value="startMonth" :options="monthOptions" style="width: 80px" />
      <span class="text-14px text-gray-600">至</span>
      <Select v-model:value="endYear" :options="yearOptions" style="width: 90px" />
      <Select v-model:value="endMonth" :options="monthOptions" style="width: 80px" />
      <span class="ml-16px text-14px text-gray-600">统计汇总</span>
      <Select v-model:value="summaryMode" :options="summaryOptions" style="width: 150px" />
      <a-button class="ml-auto" @click="handleTodo('一键导出')"> 一键导出 </a-button>
    </div>

    <!-- 七张图表卡（末卡通栏） -->
    <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
      <div
        v-for="card in chartCards"
        :key="card.key"
        class="bg-white rd-8px px-20px py-16px shadow-sm"
        :class="card.full ? 'lg:col-span-2' : ''"
      >
        <div class="flex flex-wrap items-center justify-between gap-8px">
          <div class="text-15px font-600 text-gray-900">
            {{ card.title }}
            <span class="ml-4px text-12px font-400 text-gray-400">单位: {{ card.unit }}</span>
          </div>
          <div class="flex items-center gap-8px">
            <Select
              v-model:value="cardDistrict[card.key]"
              :options="districtOptions"
              size="small"
              style="width: 110px"
              @change="handleCardDistrictChange"
            />
            <a-button size="small" type="primary"> 柱状图 </a-button>
            <a-button size="small" @click="handleTodo('图表切换')"> 图表 </a-button>
          </div>
        </div>
        <div :ref="chartRefs[card.key]" class="h-300px"></div>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceStatisticalAnalysisIndex">
  import { onMounted, reactive, ref, shallowRef } from 'vue';
  import type { Ref } from 'vue';
  import { Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useECharts } from '@jeesite/core/hooks/web/useECharts';
  import {
    DISTRICT_FUND_GROUPED,
    DISTRICT_OPTIONS,
    DISTRICT_PROJECT_COUNTS,
    FIVE_REFORM_COUNTS,
    FIVE_REFORM_GROUPED,
    FIVE_REFORM_INVESTS,
    FUND_CHANNELS,
    MONTHLY_FUND_TREND,
  } from '@jeesite/ifco/api/ifco/finance';

  const { showMessage } = useMessage();

  // ── 筛选栏（演示态：图表数字静态，不随筛选联动） ─────────────────────
  const yearOptions = [{ label: '2026', value: '2026' }];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }));
  const summaryOptions = [
    { label: '综合图', value: 'overall' },
    { label: '分项统计图表', value: 'detail' },
  ];

  const startYear = ref('2026');
  const startMonth = ref(3);
  const endYear = ref('2026');
  const endMonth = ref(6);
  const summaryMode = ref('detail');
  const districtOptions = [...DISTRICT_OPTIONS];

  /** 每卡行政区下拉（演示态：仅全市口径数据） */
  const cardDistrict = reactive<Record<string, string>>({});

  function handleCardDistrictChange() {
    showMessage('演示数据为全市口径，行政区筛选待后端接入');
  }

  // ── 图表实例（七个 div ref + useECharts，onMounted 统一渲染） ────────
  const chartRefs: Record<string, Ref<HTMLDivElement | null>> = {
    districtCount: shallowRef(null),
    fiveReformCount: shallowRef(null),
    fiveReformInvest: shallowRef(null),
    fiveReformGrouped: shallowRef(null),
    fundChannels: shallowRef(null),
    districtFundGrouped: shallowRef(null),
    monthlyTrend: shallowRef(null),
  };

  const { setOptions: setDistrictCountOptions } = useECharts(chartRefs.districtCount as Ref<HTMLDivElement>);
  const { setOptions: setFiveReformCountOptions } = useECharts(chartRefs.fiveReformCount as Ref<HTMLDivElement>);
  const { setOptions: setFiveReformInvestOptions } = useECharts(chartRefs.fiveReformInvest as Ref<HTMLDivElement>);
  const { setOptions: setFiveReformGroupedOptions } = useECharts(chartRefs.fiveReformGrouped as Ref<HTMLDivElement>);
  const { setOptions: setFundChannelsOptions } = useECharts(chartRefs.fundChannels as Ref<HTMLDivElement>);
  const { setOptions: setDistrictFundGroupedOptions } = useECharts(
    chartRefs.districtFundGrouped as Ref<HTMLDivElement>,
  );
  const { setOptions: setMonthlyTrendOptions } = useECharts(chartRefs.monthlyTrend as Ref<HTMLDivElement>);

  const PALETTE = ['#2B5CE6', '#22A45D', '#F5A623', '#7B61FF', '#4FC3F7', '#FF7D9C', '#95DE64', '#FF9C6E'];

  /** 环形图 options（中心指标 + 右侧图例带 数值/占比） */
  function donutOptions(data: { label: string; value: number }[], centerText: string, centerSub: string) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return {
      tooltip: { trigger: 'item' as const },
      legend: {
        orient: 'vertical' as const,
        right: 0,
        top: 'middle',
        formatter: (name: string) => {
          const item = data.find((row) => row.label === name);
          const percent = item ? Math.round((item.value / total) * 1000) / 10 : 0;
          return `${name}  ${item?.value.toLocaleString('zh-CN') ?? 0}  ${percent}%`;
        },
      },
      title: {
        text: centerText,
        subtext: centerSub,
        left: '32%',
        top: '40%',
        textAlign: 'center' as const,
        textStyle: { fontSize: 20, fontWeight: 600, color: '#262626' },
        subtextStyle: { fontSize: 12, color: '#8c8c8c' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['42%', '68%'],
          center: ['32%', '50%'],
          label: { show: false },
          data: data.map((item, index) => ({
            name: item.label,
            value: item.value,
            itemStyle: { color: PALETTE[index % PALETTE.length] },
          })),
        },
      ],
    };
  }

  const chartCards = [
    { key: 'districtCount', title: '各行政区统计区间项目数量分布图', unit: '个', full: false },
    { key: 'fiveReformCount', title: '各行政区统计区间五改项目分类数量', unit: '个', full: false },
    { key: 'fiveReformInvest', title: '五改项目分类总投资占比图', unit: '万元', full: false },
    {
      key: 'fiveReformGrouped',
      title: '五改项目总投资、年度计划投资、统计区间累计完成投资',
      unit: '万元',
      full: false,
    },
    { key: 'fundChannels', title: '统计区间到位资金全渠道分类统计图', unit: '万元', full: false },
    {
      key: 'districtFundGrouped',
      title: '各行政区总投资、年度计划投资、统计区间累计完成投资、统计区间到位资金分布图',
      unit: '万元',
      full: false,
    },
    { key: 'monthlyTrend', title: '各行政区统计区间内投资进度、资金到位率及月完成投资额', unit: '%/万元', full: true },
  ] as const;

  onMounted(() => {
    for (const card of chartCards) {
      if (cardDistrict[card.key] === undefined) cardDistrict[card.key] = '';
    }

    // ① 各行政区项目数量（柱状图）
    setDistrictCountOptions({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 10, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: DISTRICT_PROJECT_COUNTS.map((row) => row.district) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '项目数量',
          type: 'bar',
          data: DISTRICT_PROJECT_COUNTS.map((row) => row.count),
          itemStyle: { color: '#2B5CE6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
          label: { show: true, position: 'top', color: '#595959' },
        },
      ],
    });

    // ② 五改项目分类数量（环形图，中心=项目总数）
    const totalCount = FIVE_REFORM_COUNTS.reduce((sum, item) => sum + item.value, 0);
    setFiveReformCountOptions(donutOptions(FIVE_REFORM_COUNTS, String(totalCount), '项目总数(个)'));

    // ③ 五改分类总投资占比（环形图，中心=总投资折亿）
    const totalInvest = FIVE_REFORM_INVESTS.reduce((sum, item) => sum + item.value, 0);
    setFiveReformInvestOptions(
      donutOptions(FIVE_REFORM_INVESTS, `${(totalInvest / 10000).toFixed(1)}亿`, '总投资(万元)'),
    );

    // ④ 五改 总投资/年度计划/累计完成（分组柱状图）
    setFiveReformGroupedOptions({
      tooltip: { trigger: 'axis' },
      legend: { data: ['总投资', '年度计划投资', '累计完成投资'], top: 0 },
      grid: { left: 60, right: 10, top: 36, bottom: 40 },
      xAxis: {
        type: 'category',
        data: FIVE_REFORM_GROUPED.map((row) => row.label),
        axisLabel: { interval: 0, fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '总投资',
          type: 'bar',
          data: FIVE_REFORM_GROUPED.map((row) => row.total),
          itemStyle: { color: '#2B5CE6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 22,
        },
        {
          name: '年度计划投资',
          type: 'bar',
          data: FIVE_REFORM_GROUPED.map((row) => row.yearPlan),
          itemStyle: { color: '#22A45D', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 22,
        },
        {
          name: '累计完成投资',
          type: 'bar',
          data: FIVE_REFORM_GROUPED.map((row) => row.completed),
          itemStyle: { color: '#F5A623', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 22,
        },
      ],
    });

    // ⑤ 到位资金全渠道分类（环形图，中心=到位资金折亿）
    const totalArrived = FUND_CHANNELS.reduce((sum, item) => sum + item.value, 0);
    setFundChannelsOptions(donutOptions(FUND_CHANNELS, `${(totalArrived / 10000).toFixed(1)}亿`, '到位资金(万元)'));

    // ⑥ 各行政区 四指标（分组柱状图）
    setDistrictFundGroupedOptions({
      tooltip: { trigger: 'axis' },
      legend: { data: ['总投资', '年度计划投资', '累计完成投资', '到位资金'], top: 0 },
      grid: { left: 60, right: 10, top: 36, bottom: 30 },
      xAxis: { type: 'category', data: DISTRICT_FUND_GROUPED.map((row) => row.district) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '总投资',
          type: 'bar',
          data: DISTRICT_FUND_GROUPED.map((row) => row.total),
          itemStyle: { color: '#2B5CE6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18,
        },
        {
          name: '年度计划投资',
          type: 'bar',
          data: DISTRICT_FUND_GROUPED.map((row) => row.yearPlan),
          itemStyle: { color: '#22A45D', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18,
        },
        {
          name: '累计完成投资',
          type: 'bar',
          data: DISTRICT_FUND_GROUPED.map((row) => row.completed),
          itemStyle: { color: '#F5A623', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18,
        },
        {
          name: '到位资金',
          type: 'bar',
          data: DISTRICT_FUND_GROUPED.map((row) => row.arrived),
          itemStyle: { color: '#7B61FF', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 18,
        },
      ],
    });

    // ⑦ 月完成投资额（柱）+ 投资进度/资金到位率（线，右轴）（通栏）
    setMonthlyTrendOptions({
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

  /** 占位操作（TODO：随导出/图表切换后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
