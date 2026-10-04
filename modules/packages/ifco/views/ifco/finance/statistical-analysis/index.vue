<!--
  ifco —— 资金统计分析（/ifco/finance/statistical-analysis/index）

  投融资管理 · 资金统计分析。筛选栏（时间轴：开始月份 至 结束月份 + 查询；开始
  月份限 2026-10 起，结束月份默认当前月——当前月早于 2026-10 时取 2026-10，口径
  同项目资金管理；无统计汇总选项、无一键导出按钮）+ 五张图表卡（两列栅格，末卡
  通栏）：
  ①各行政区年度投资进度统计（柱线混合，双 Y 轴：本年度计划完成投资/本年度累计
    完成投资柱状=投资额（亿元）左轴 + 年度投资进度折线=%右轴；X 轴各行政区；
    数据 fetchDistrictFundStats，剔除全市合计行）
  ②各行政区年度实际资金到位率统计（柱线混合，双 Y 轴：本年度计划完成投资/
    本年度累计实际到位资金柱状=投资额（亿元）左轴 + 资金到位率折线=%右轴；
    X 轴各行政区；数据 fetchDistrictFundStats）
  ③项目本年度实际到位资金分类统计（环形图，单位: 亿元，中心=合计折示；
    七分类=中央预算内投资/省级预算资金/市级及以下预算资金/地方政府一般债券/
    地方政府专项债券/社会资本/其他资金，取资金分类管理资金填报逐月值按本年度
    月份加和 fetchFundCategoryStats；默认全市，卡头行政区筛选）
  ④五改项目分类总投资占比图（环形图，单位: 亿元；按项目汇总查询行的五改分类
    × 项目投资估算加和 fetchProjectFundStats，随查询时间段重新统计；默认当年
    全市，卡头行政区筛选）
  ⑤资金流向图（桑基图，通栏，单位: 亿元；资金分类 → 五改分类 的统计期实际
    到位资金连线 fetchFundFlowStats，随查询时间段变化；默认全市，卡头行政区筛选）
  行政区/五改分类为本地过滤；查询时间段经 PORTFOLIO_START_MONTH 口径归一
  （见 api/ifco/finance portfolioPeriod）。资金填报为会话内存登记，未填报时
  ③⑤显示暂无数据。

  菜单注册（上级菜单「投融资管理」）：
   - 菜单名称：资金统计分析
   - 链接地址：/ifco/finance/statistical-analysis/index
   - 组件位置：/ifco/finance/statistical-analysis/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 筛选栏：时间轴（开始月份 2026-10 起 至 结束月份默认当前月）+ 查询；无统计汇总/一键导出 -->
    <div class="flex flex-wrap items-center gap-12px bg-white rd-8px px-20px py-14px shadow-sm">
      <span class="text-14px text-gray-600">时间轴</span>
      <DatePicker
        v-model:value="startMonth"
        picker="month"
        value-format="YYYY-MM"
        placeholder="开始月份"
        :allow-clear="false"
        :disabled-date="portfolioMonthDisabled"
        style="width: 140px"
      />
      <span class="text-14px text-gray-600">至</span>
      <DatePicker
        v-model:value="endMonth"
        picker="month"
        value-format="YYYY-MM"
        placeholder="结束月份"
        :allow-clear="false"
        :disabled-date="portfolioMonthDisabled"
        style="width: 140px"
      />
      <a-button type="primary" :loading="loading" @click="handleQuery"> 查询 </a-button>
    </div>

    <!-- 五张图表卡（末卡桑基图通栏） -->
    <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
      <!-- ① 各行政区年度投资进度统计 -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm">
        <div class="text-15px font-600 text-gray-900">
          各行政区年度投资进度统计
          <span class="ml-4px text-12px font-400 text-gray-400">单位: 亿元/%</span>
        </div>
        <div ref="progressRef" class="h-300px"></div>
      </div>

      <!-- ② 各行政区年度实际资金到位率统计 -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm">
        <div class="text-15px font-600 text-gray-900">
          各行政区年度实际资金到位率统计
          <span class="ml-4px text-12px font-400 text-gray-400">单位: 亿元/%</span>
        </div>
        <div ref="arrivalRef" class="h-300px"></div>
      </div>

      <!-- ③ 项目本年度实际到位资金分类统计 -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-8px">
          <div class="text-15px font-600 text-gray-900">
            项目本年度实际到位资金分类统计
            <span class="ml-4px text-12px font-400 text-gray-400">单位: 亿元</span>
          </div>
          <Select
            v-model:value="fundDistrict"
            :options="districtCardOptions"
            size="small"
            style="width: 150px"
            @change="handleFundDistrictChange"
          />
        </div>
        <div ref="fundCategoryRef" class="h-300px"></div>
      </div>

      <!-- ④ 五改项目分类总投资占比图 -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-8px">
          <div class="text-15px font-600 text-gray-900">
            五改项目分类总投资占比图
            <span class="ml-4px text-12px font-400 text-gray-400">单位: 亿元</span>
          </div>
          <Select
            v-model:value="investDistrict"
            :options="districtCardOptions"
            size="small"
            style="width: 150px"
            @change="handleInvestDistrictChange"
          />
        </div>
        <div ref="fiveInvestRef" class="h-300px"></div>
      </div>

      <!-- ⑤ 资金流向图（通栏） -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm lg:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-8px">
          <div class="text-15px font-600 text-gray-900">
            资金流向图
            <span class="ml-4px text-12px font-400 text-gray-400">单位: 亿元</span>
          </div>
          <Select
            v-model:value="flowDistrict"
            :options="districtCardOptions"
            size="small"
            style="width: 150px"
            @change="handleFlowDistrictChange"
          />
        </div>
        <div ref="flowRef" class="h-360px"></div>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceStatisticalAnalysisIndex">
  import { onMounted, ref, shallowRef } from 'vue';
  import type { Ref } from 'vue';
  import dayjs from 'dayjs';
  import NP from 'number-precision';
  import { DatePicker, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useECharts } from '@jeesite/core/hooks/web/useECharts';
  import { DISTRICTS, FIVE_REFORM_TYPE_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    PORTFOLIO_START_MONTH,
    fetchDistrictFundStats,
    fetchFundCategoryStats,
    fetchFundFlowStats,
    fetchProjectFundStats,
    fiveReformLabel,
    type DistrictFundStatRow,
    type FundFlowLink,
    type ProjectFundStatRow,
  } from '@jeesite/ifco/api/ifco/finance';

  const { showMessage } = useMessage();

  // ── 筛选栏（开始月份限 2026-10 起，结束月份默认当前月；口径同项目资金管理） ──
  const nowMonth = dayjs().format('YYYY-MM');
  const startMonth = ref(PORTFOLIO_START_MONTH);
  const endMonth = ref(nowMonth > PORTFOLIO_START_MONTH ? nowMonth : PORTFOLIO_START_MONTH);
  const loading = ref(false);

  /** 统计期月份限制：开始/结束月份自 2026-10 起（业务口径） */
  function portfolioMonthDisabled(current: dayjs.Dayjs) {
    return current.isBefore(dayjs(`${PORTFOLIO_START_MONTH}-01`), 'month');
  }

  /** 卡头行政区选项（③④⑤；''=全市） */
  const districtCardOptions = [{ label: '全市', value: '' }, ...DISTRICTS.map((name) => ({ label: name, value: name }))];
  const fundDistrict = ref('');
  const investDistrict = ref('');
  const flowDistrict = ref('');

  // ── 图表实例（五个 div ref + useECharts） ────────────────────────────
  const progressRef = shallowRef<HTMLDivElement | null>(null);
  const arrivalRef = shallowRef<HTMLDivElement | null>(null);
  const fundCategoryRef = shallowRef<HTMLDivElement | null>(null);
  const fiveInvestRef = shallowRef<HTMLDivElement | null>(null);
  const flowRef = shallowRef<HTMLDivElement | null>(null);

  const { setOptions: setProgressOptions } = useECharts(progressRef as Ref<HTMLDivElement>);
  const { setOptions: setArrivalOptions } = useECharts(arrivalRef as Ref<HTMLDivElement>);
  const { setOptions: setFundCategoryOptions } = useECharts(fundCategoryRef as Ref<HTMLDivElement>);
  const { setOptions: setFiveInvestOptions } = useECharts(fiveInvestRef as Ref<HTMLDivElement>);
  const { setOptions: setFlowOptions } = useECharts(flowRef as Ref<HTMLDivElement>);

  const PALETTE = ['#2B5CE6', '#22A45D', '#F5A623', '#7B61FF', '#4FC3F7', '#FF7D9C', '#95DE64', '#FF9C6E'];
  /** 五改分类节点配色（桑基图右侧；与资金分类的 PALETTE 区分） */
  const FIVE_PALETTE = ['#0E7C66', '#13C2C2', '#9254DE', '#FA8C16', '#EB2F96'];

  /** 暂无数据占位 option（行集为空/全零时） */
  function emptyOptions() {
    return {
      title: {
        text: '暂无数据',
        left: 'center' as const,
        top: 'middle' as const,
        textStyle: { color: '#8c8c8c', fontSize: 14, fontWeight: 400 },
      },
    };
  }

  /** 行政区柱线混合图（柱=投资额左轴亿元，线=比率右轴%；X 轴各行政区标签旋转 45°） */
  function districtMixOptions(
    rows: DistrictFundStatRow[],
    bars: { name: string; color: string; pick: (row: DistrictFundStatRow) => number }[],
    line: { name: string; color: string; pick: (row: DistrictFundStatRow) => number },
  ) {
    if (!rows.length) return emptyOptions();
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: [...bars.map((bar) => bar.name), line.name], top: 0 },
      grid: { left: 70, right: 56, top: 40, bottom: 84 },
      xAxis: {
        type: 'category' as const,
        data: rows.map((row) => row.district),
        axisLabel: { interval: 0, fontSize: 11, rotate: 45 },
      },
      yAxis: [
        { type: 'value' as const, name: '投资额（亿元）' },
        { type: 'value' as const, name: '%', axisLabel: { formatter: '{value}%' }, splitLine: { show: false } },
      ],
      series: [
        ...bars.map((bar) => ({
          name: bar.name,
          type: 'bar' as const,
          data: rows.map(bar.pick),
          itemStyle: { color: bar.color, borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 22,
        })),
        {
          name: line.name,
          type: 'line' as const,
          yAxisIndex: 1,
          data: rows.map(line.pick),
          itemStyle: { color: line.color },
          smooth: true,
        },
      ],
    };
  }

  /** 环形图 option（中心合计 + 右侧图例带 数值/占比；total=0 时暂无数据） */
  function donutOptions(data: { label: string; value: number }[], centerSub: string) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!total) return emptyOptions();
    return {
      tooltip: { trigger: 'item' as const, valueFormatter: (value: unknown) => `${String(value)} 亿元` },
      legend: {
        orient: 'vertical' as const,
        right: 0,
        top: 'middle' as const,
        formatter: (name: string) => {
          const item = data.find((row) => row.label === name);
          const percent = item ? Math.round((item.value / total) * 1000) / 10 : 0;
          return `${name}  ${item?.value.toLocaleString('zh-CN') ?? 0}亿元  ${percent}%`;
        },
      },
      title: {
        text: total.toLocaleString('zh-CN'),
        subtext: centerSub,
        left: '30%',
        top: '40%',
        textAlign: 'center' as const,
        textStyle: { fontSize: 18, fontWeight: 600, color: '#262626' },
        subtextStyle: { fontSize: 12, color: '#8c8c8c' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['42%', '68%'],
          center: ['30%', '50%'],
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

  /** 资金流向桑基图 option（左=资金分类，右=五改分类；连线值=统计期实际到位资金亿元） */
  function flowOptions(links: FundFlowLink[]) {
    if (!links.length) return emptyOptions();
    const sourceNodes = [...new Set(links.map((link) => link.source))].map((name, index) => ({
      name,
      itemStyle: { color: PALETTE[index % PALETTE.length] },
    }));
    const fiveOrder: string[] = FIVE_REFORM_TYPE_OPTIONS.map((option) => option.label);
    const targetNodes = [...new Set(links.map((link) => link.target))]
      .sort((a, b) => {
        const indexA = fiveOrder.indexOf(a);
        const indexB = fiveOrder.indexOf(b);
        return (indexA === -1 ? fiveOrder.length : indexA) - (indexB === -1 ? fiveOrder.length : indexB);
      })
      .map((name, index) => ({ name, itemStyle: { color: FIVE_PALETTE[index % FIVE_PALETTE.length] } }));
    return {
      tooltip: { trigger: 'item' as const, valueFormatter: (value: unknown) => `${String(value)} 亿元` },
      series: [
        {
          type: 'sankey' as const,
          left: 16,
          right: 190,
          top: 16,
          bottom: 16,
          nodeAlign: 'justify' as const,
          nodeGap: 14,
          emphasis: { focus: 'adjacency' as const },
          data: [...sourceNodes, ...targetNodes],
          links,
          label: { fontSize: 12, color: '#333' },
          lineStyle: { color: 'gradient' as const, curveness: 0.5 },
        },
      ],
    };
  }

  // ── 数据装填与渲染 ───────────────────────────────────────────────────
  /** 查询结果缓存（①②区划汇总剔除全市合计行；④项目汇总行集），行政区筛选为本地过滤 */
  let districtRows: DistrictFundStatRow[] = [];
  let projectRows: ProjectFundStatRow[] = [];

  function renderProgress() {
    setProgressOptions(
      districtMixOptions(
        districtRows,
        [
          { name: '本年度计划完成投资', color: '#2B5CE6', pick: (row) => row.yearPlanInvest },
          { name: '本年度累计完成投资', color: '#22A45D', pick: (row) => row.yearAccumulatedInvest },
        ],
        { name: '年度投资进度', color: '#F5A623', pick: (row) => row.yearProgressRate },
      ),
    );
  }

  function renderArrival() {
    setArrivalOptions(
      districtMixOptions(
        districtRows,
        [
          { name: '本年度计划完成投资', color: '#2B5CE6', pick: (row) => row.yearPlanInvest },
          { name: '本年度累计实际到位资金', color: '#7B61FF', pick: (row) => row.yearArrivedFunds },
        ],
        { name: '资金到位率', color: '#22A45D', pick: (row) => row.yearArrivalRate },
      ),
    );
  }

  /** ③ 到位资金七分类（固定分类顺序；全零显示暂无数据） */
  async function renderFundCategory() {
    let stats;
    try {
      stats = await fetchFundCategoryStats(fundDistrict.value);
    } catch (e) {
      showMessage((e as Error)?.message || '到位资金分类统计加载失败');
      return;
    }
    setFundCategoryOptions(donutOptions(stats, '本年累计到位(亿元)'));
  }

  /** ④ 五改分类 × 项目投资估算加和（行政区=本地过滤；零值分类不进饼图） */
  function renderFiveInvest() {
    const rows = projectRows.filter((row) => !investDistrict.value || row.district === investDistrict.value);
    const byType = new Map<string, number>();
    for (const row of rows) {
      const label = fiveReformLabel(row.fiveReformType);
      if (!label) continue;
      byType.set(label, NP.round(NP.plus(byType.get(label) ?? 0, row.projectInvestEstimate), 2));
    }
    const order: string[] = FIVE_REFORM_TYPE_OPTIONS.map((option) => option.label);
    const data = [...byType.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => {
        const indexA = order.indexOf(a[0]);
        const indexB = order.indexOf(b[0]);
        return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
      })
      .map(([label, value]) => ({ label, value }));
    setFiveInvestOptions(donutOptions(data, '总投资(亿元)'));
  }

  /** ⑤ 资金流向桑基图（资金分类 → 五改分类，统计期实际到位资金） */
  async function renderFlow() {
    let links;
    try {
      links = await fetchFundFlowStats(startMonth.value, endMonth.value, flowDistrict.value);
    } catch (e) {
      showMessage((e as Error)?.message || '资金流向统计加载失败');
      return;
    }
    setFlowOptions(flowOptions(links));
  }

  /** 查询：按时间段拉取 ①②（区划汇总）④（项目汇总）底数并渲染五图（③⑤自带口径） */
  async function handleQuery() {
    loading.value = true;
    try {
      const [districtStats, projectStats] = await Promise.all([
        fetchDistrictFundStats(startMonth.value, endMonth.value),
        fetchProjectFundStats(startMonth.value, endMonth.value),
      ]);
      districtRows = districtStats.filter((row) => row.district !== '全市合计');
      projectRows = projectStats;
    } catch (e) {
      showMessage((e as Error)?.message || '统计分析数据加载失败');
      loading.value = false;
      return;
    }
    loading.value = false;
    renderProgress();
    renderArrival();
    renderFundCategory();
    renderFiveInvest();
    renderFlow();
  }

  /** ③④⑤ 卡头行政区筛选（③⑤行集会话缓存，切换不重复请求后端） */
  function handleFundDistrictChange() {
    renderFundCategory();
  }

  function handleInvestDistrictChange() {
    renderFiveInvest();
  }

  function handleFlowDistrictChange() {
    renderFlow();
  }

  onMounted(handleQuery);
</script>
