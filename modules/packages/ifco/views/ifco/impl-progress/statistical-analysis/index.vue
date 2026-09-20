<!--
  ifco —— 统计分析（/ifco/impl-progress/statistical-analysis）

  实施进度跟踪 · 统计分析。筛选栏（统计年度/行政区/五改类型 + 查询 + 导出统计年报）
  + 六个页签（按行政区统计=本页实做：指标信息行 + 左侧分组柱状图（各区年度投资
  总额 vs 累计完成投资，echarts，X 轴标签下方灰字=各区项目个数）+ 右侧各区投资
  完成率进度条 + 最低区提示框 + 分区·分建设状态明细表；其余页签待设计稿后接入，
  先占位）。项目进度状态统计/难堵点协调督办统计 两页签带红色角标（照设计稿）。

  统计数字照市级设计稿抄录（江岸/硚口/青山/洪山/其他区合计，行政区筛选时
  图表与明细联动过滤）；后端接入后换统计接口。当前无后端：查询为本地过滤，
  导出占位。

  菜单注册（菜单名称「统计分析」）：
   - 链接地址：/ifco/impl-progress/statistical-analysis/index
   - 组件位置：/ifco/impl-progress/statistical-analysis/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-12px bg-white rd-8px px-20px py-14px shadow-sm">
      <span class="text-14px text-gray-600">统计年度</span>
      <Select v-model:value="filterYear" :options="yearOptions" style="width: 130px" />
      <span class="text-14px text-gray-600">行政区</span>
      <Select v-model:value="filterDistrict" :options="districtFilterOptions" style="width: 160px" />
      <span class="text-14px text-gray-600">五改类型</span>
      <Select v-model:value="filterFiveReformType" :options="fiveReformFilterOptions" style="width: 150px" />
      <a-button type="primary" @click="handleQuery"> 查询 </a-button>
      <a-button @click="handleTodo('导出统计年报')"> 导出统计年报 </a-button>
    </div>

    <!-- 页签（仅「按行政区统计」实做，其余占位） -->
    <div class="bg-white rd-8px px-8px py-4px shadow-sm">
      <Tabs v-model:active-key="activeTab">
        <TabPane key="district" tab="按行政区统计" />
        <TabPane key="fiveReform" tab="按五改分类统计" />
        <TabPane key="stage" tab="按建设状态统计" />
        <TabPane key="fill" tab="填报记录数量统计" />
        <TabPane key="progress" tab="项目进度状态统计">
          <template #tab> 项目进度状态统计 <Badge :count="109" :number-style="badgeStyle" /> </template>
        </TabPane>
        <TabPane key="block" tab="难堵点协调督办统计">
          <template #tab> 难堵点协调督办统计 <Badge :count="47" :number-style="badgeStyle" /> </template>
        </TabPane>
      </Tabs>
    </div>

    <!-- 按行政区统计 -->
    <template v-if="activeTab === 'district'">
      <!-- 指标信息行 -->
      <div class="flex flex-wrap items-baseline justify-between bg-white rd-8px px-20px py-12px shadow-sm">
        <div class="text-14px text-gray-800">
          <span class="font-600">{{ applied.year }} 年度</span>
          <span class="ml-16px text-gray-500">指标：项目个数 / 年度投资总额 / 累计完成投资 / 投资完成率</span>
        </div>
        <div class="text-12px text-gray-400">单位：项·亿元</div>
      </div>

      <!-- 双图区：左 分组柱状图（echarts）；右 各区投资完成率进度条 -->
      <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
        <div class="bg-white rd-8px px-20px py-16px shadow-sm">
          <div class="text-15px font-600 text-gray-900">各区年度投资总额 vs 累计完成投资</div>
          <div ref="barChartRef" class="h-320px mt-8px"></div>
        </div>
        <div class="bg-white rd-8px px-20px py-16px shadow-sm">
          <div class="text-15px font-600 text-gray-900">各区投资完成率对比</div>
          <div class="mt-12px flex flex-col gap-10px">
            <div v-for="row in rateRows" :key="row.name" class="flex items-center gap-12px text-13px">
              <span class="w-90px shrink-0 text-right text-gray-700">{{ row.name }}</span>
              <div class="h-10px flex-1 overflow-hidden rd-full bg-gray-100">
                <div class="h-full rd-full" :style="{ width: `${row.rate}%`, backgroundColor: row.color }"></div>
              </div>
              <span class="w-40px shrink-0 text-gray-800">{{ row.rate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最低完成率提示框 -->
      <div class="b-l-4px b-l-solid b-l-#d46b08 bg-#fff7e6 rd-4px px-16px py-10px text-14px text-gray-800">
        {{ lowestHint }}
      </div>

      <!-- 分区 · 分建设状态明细 -->
      <div class="bg-white rd-8px px-20px py-16px shadow-sm">
        <div class="text-15px font-600 text-gray-900">分区 · 分建设状态明细</div>
        <div class="mt-2px text-12px text-gray-400">项目总数 = 未开工 + 已开工 + 已竣工</div>
        <table class="mt-12px w-full text-14px">
          <thead>
            <tr class="b-b-1 b-b-solid b-gray-200 text-gray-500">
              <th class="py-8px text-left font-500">行政区</th>
              <th class="py-8px text-left font-500">建设状态</th>
              <th class="py-8px text-right font-500">项目个数</th>
              <th class="py-8px text-right font-500">年度投资总额(亿)</th>
              <th class="py-8px text-right font-500">累计完成投资(亿)</th>
              <th class="py-8px text-left font-500" style="padding-left: 32px">投资完成率</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="area in detailRows" :key="area.district">
              <tr class="b-b-1 b-b-solid b-gray-100 bg-gray-50 font-600">
                <td class="py-8px text-gray-800">{{ area.district }}</td>
                <td class="py-8px text-gray-800">项目总数</td>
                <td class="py-8px text-right text-gray-800">{{ area.projectCount }}</td>
                <td class="py-8px text-right text-gray-800">{{ area.yearPlan }}</td>
                <td class="py-8px text-right text-gray-800">{{ area.completed }}</td>
                <td class="py-8px" style="padding-left: 32px">
                  <div class="flex items-center gap-8px">
                    <div class="h-8px w-120px overflow-hidden rd-full bg-gray-100">
                      <div class="h-full rd-full bg-#1677ff" :style="{ width: `${area.rate}%` }"></div>
                    </div>
                    <span class="text-12px text-gray-600">{{ area.rate }}%</span>
                  </div>
                </td>
              </tr>
              <tr v-for="stage in area.stages" :key="stage.stage" class="b-b-1 b-b-solid b-gray-100">
                <td></td>
                <td class="py-6px text-gray-600">
                  <span
                    class="mr-6px inline-block h-6px w-6px rd-full"
                    :style="{ backgroundColor: stage.color }"
                  ></span>
                  {{ stage.stage }}
                </td>
                <td class="py-6px text-right text-gray-600">{{ stage.count }}</td>
                <td class="py-6px text-right text-gray-600">{{ stage.plan }}</td>
                <td class="py-6px text-right text-gray-600">{{ stage.done }}</td>
                <td class="py-6px" style="padding-left: 32px">
                  <div class="flex items-center gap-8px">
                    <div class="h-6px w-120px overflow-hidden rd-full bg-gray-100">
                      <div class="h-full rd-full bg-gray-300" :style="{ width: `${stage.rate}%` }"></div>
                    </div>
                    <span class="text-12px text-gray-500">{{ stage.rate }}%</span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 其余页签：待设计稿占位 -->
    <div v-else class="flex h-200px items-center justify-center bg-white rd-8px shadow-sm">
      <div class="flex flex-col items-center gap-8px text-gray-400">
        <span class="i-ant-design:pie-chart-outlined text-32px"></span>
        <span class="text-14px">{{ activeTabLabel }}：待设计稿，功能建设中</span>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressStatisticalAnalysis">
  import { computed, onMounted, ref, shallowRef, watch } from 'vue';
  import type { Ref } from 'vue';
  import { Badge, Select, TabPane, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useECharts } from '@jeesite/core/hooks/web/useECharts';
  import { DISTRICTS, FIVE_REFORM_TYPE_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';

  const { showMessage } = useMessage();

  // ── 筛选 ────────────────────────────────────────────────────────────
  const yearOptions = [{ label: '2026 年度', value: '2026' }];
  const districtFilterOptions = [
    { label: '全市', value: '全市' },
    ...DISTRICTS.map((name) => ({ label: name, value: name })),
  ];
  const fiveReformFilterOptions = [
    { label: '全部', value: '' },
    ...FIVE_REFORM_TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  ];

  const filterYear = ref('2026');
  const filterDistrict = ref('全市');
  const filterFiveReformType = ref('');

  /** 查询应用的筛选值（Select 变化不即时生效，点「查询」后应用） */
  const applied = ref({ year: '2026', district: '全市', fiveReformType: '' });

  function handleQuery() {
    applied.value = {
      year: filterYear.value,
      district: filterDistrict.value,
      fiveReformType: filterFiveReformType.value,
    };
    showMessage('查询完成（本地演示数据）');
  }

  // ── 统计数据（照市级设计稿抄录；行政区筛选联动过滤） ─────────────────
  type StageRow = { stage: string; color: string; count: number; plan: number; done: number; rate: number };
  type AreaStat = {
    district: string;
    projectCount: number;
    yearPlan: number;
    completed: number;
    rate: number;
    stages: StageRow[];
  };

  const STAGE_COLORS = { unstarted: '#bfbfbf', started: '#1677ff', finished: '#22a45d' } as const;

  function buildArea(
    district: string,
    projectCount: number,
    yearPlan: number,
    completed: number,
    stages: Omit<StageRow, 'rate'>[],
  ): AreaStat {
    const rate = Math.round((completed / yearPlan) * 100);
    return {
      district,
      projectCount,
      yearPlan,
      completed,
      rate,
      stages: stages.map((stage) => ({ ...stage, rate: Math.round((stage.done / stage.plan) * 100) })),
    };
  }

  const AREA_STATS: AreaStat[] = [
    buildArea('江岸区', 286, 168, 96, [
      { stage: '未开工', color: STAGE_COLORS.unstarted, count: 68, plan: 42, done: 3 },
      { stage: '已开工', color: STAGE_COLORS.started, count: 192, plan: 108, done: 78 },
      { stage: '已竣工', color: STAGE_COLORS.finished, count: 26, plan: 18, done: 15 },
    ]),
    buildArea('硚口区', 214, 126, 76, [
      { stage: '未开工', color: STAGE_COLORS.unstarted, count: 46, plan: 26, done: 6 },
      { stage: '已开工', color: STAGE_COLORS.started, count: 142, plan: 88, done: 60 },
      { stage: '已竣工', color: STAGE_COLORS.finished, count: 26, plan: 12, done: 10 },
    ]),
    buildArea('青山区', 172, 98, 55, [
      { stage: '未开工', color: STAGE_COLORS.unstarted, count: 40, plan: 24, done: 4 },
      { stage: '已开工', color: STAGE_COLORS.started, count: 112, plan: 66, done: 46 },
      { stage: '已竣工', color: STAGE_COLORS.finished, count: 20, plan: 8, done: 5 },
    ]),
    buildArea('洪山区', 158, 92, 51, [
      { stage: '未开工', color: STAGE_COLORS.unstarted, count: 38, plan: 22, done: 2 },
      { stage: '已开工', color: STAGE_COLORS.started, count: 104, plan: 62, done: 44 },
      { stage: '已竣工', color: STAGE_COLORS.finished, count: 16, plan: 8, done: 5 },
    ]),
    buildArea('其他区合计', 410, 226, 134, [
      { stage: '未开工', color: STAGE_COLORS.unstarted, count: 96, plan: 54, done: 12 },
      { stage: '已开工', color: STAGE_COLORS.started, count: 268, plan: 152, done: 106 },
      { stage: '已竣工', color: STAGE_COLORS.finished, count: 46, plan: 20, done: 16 },
    ]),
  ];

  const detailRows = computed(() =>
    applied.value.district === '全市'
      ? AREA_STATS
      : AREA_STATS.filter((area) => area.district === applied.value.district),
  );

  // ── 完成率进度条（>=59% 绿、全市蓝、最低区橙、其余灰） ───────────────
  const rateRows = computed(() => {
    const rows = detailRows.value.map((area) => ({ name: area.district, rate: area.rate }));
    const totalPlan = detailRows.value.reduce((sum, area) => sum + area.yearPlan, 0);
    const totalDone = detailRows.value.reduce((sum, area) => sum + area.completed, 0);
    const minRate = Math.min(...rows.map((row) => row.rate));
    return [
      ...rows.map((row) => ({
        ...row,
        color: row.rate >= 59 ? '#22a45d' : row.rate <= minRate ? '#d46b08' : '#bfbfbf',
      })),
      { name: '全市', rate: Math.round((totalDone / totalPlan) * 100), color: '#1677ff' },
    ];
  });

  /** 最低完成率区提示（项目数/督办口径为演示文案） */
  const lowestHint = computed(() => {
    const lowest = [...detailRows.value].sort((a, b) => a.rate - b.rate)[0];
    return lowest ? `${lowest.district}完成率垫底，3 个项目存在资金沉淀，已列入督办清单` : '暂无数据';
  });

  // ── 分组柱状图（echarts） ────────────────────────────────────────────
  const barChartRef = shallowRef<HTMLDivElement | null>(null);
  const { setOptions } = useECharts(barChartRef as Ref<HTMLDivElement>);

  function renderBarChart() {
    const areas = detailRows.value;
    setOptions({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => `${value} 亿元`,
      },
      legend: { data: ['年度投资总额', '累计完成投资'], top: 0 },
      grid: { left: 40, right: 10, top: 36, bottom: 40 },
      // X 轴标签两行：区名 + 下方灰字项目个数（照设计稿）
      xAxis: {
        type: 'category',
        data: areas.map((area) => area.district),
        axisLabel: {
          interval: 0,
          formatter: (name: string) => {
            const area = areas.find((item) => item.district === name);
            return `${name}\n{count|${area?.projectCount ?? 0}项}`;
          },
          rich: {
            count: { color: '#999', fontSize: 11, lineHeight: 16 },
          },
        },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '年度投资总额',
          type: 'bar',
          data: areas.map((area) => area.yearPlan),
          itemStyle: { color: '#2B5CE6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 28,
        },
        {
          name: '累计完成投资',
          type: 'bar',
          data: areas.map((area) => area.completed),
          itemStyle: { color: '#22A45D', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 28,
        },
      ],
    });
  }

  watch(detailRows, () => {
    if (activeTab.value === 'district') renderBarChart();
  });

  onMounted(renderBarChart);

  // ── 页签 ────────────────────────────────────────────────────────────
  const TAB_LABELS: Record<string, string> = {
    district: '按行政区统计',
    fiveReform: '按五改分类统计',
    stage: '按建设状态统计',
    fill: '填报记录数量统计',
    progress: '项目进度状态统计',
    block: '难堵点协调督办统计',
  };
  const activeTab = ref('district');
  const activeTabLabel = computed(() => TAB_LABELS[activeTab.value] ?? '');
  const badgeStyle = { backgroundColor: '#ff4d4f', fontSize: '11px', boxShadow: 'none' };

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
