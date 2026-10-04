<!--
  市住更局 —— 名城保护 · 巡查报表统计（优保/拟优保共用，多级表头）

  对齐老系统：左上「导出EXCEL」；查询条件 巡查年月（月选，默认当月）+ 巡查时间（区间）+ 查询
  （区间优先，无区间则按巡查年月统计）。
  多级表头：巡查建筑数量（现有建筑数量 | 巡查建筑数量）、建筑巡查次数（应巡查量 | 普通巡查 |
  特别关注 | 实际巡查量）、完成情况（未完成标红；实际巡查量 < 应巡查量 标红）；末行合计「全部」。
  数据源按 scope 分流：优保走 stats/inspection-report；拟优保走 proposed/stats/inspection-report
  （WHFW_OLDJZ 口径）。两表应巡查量后端统一按建筑数 × 2（年度指标）计算，不由前端传频次。
  「巡查频次(月)」列为前端展示口径（老系统：优保=2、拟优保=1），拟优保 1 与后端 ×2 不一致，待业务确认。
  巡查建筑数量 / 普通巡查 / 特别关注 后端暂无字段，暂以 — 占位待接入。
  红字规则对齐老系统：实际巡查量 < 应巡查量 标红（含合计行）；完成情况「未完成」标红（含合计行）。
-->
<template>
  <PageWrapper>
    <div class="bg-white p-4">
      <div class="mb-4 flex items-center justify-center gap-3">
        <span class="text-lg font-bold">{{ props.heading }}</span>
      </div>
      <div class="mb-3 flex items-center justify-between">
        <a-button :loading="exporting" @click="handleExport">
          <Icon icon="i-ant-design:download-outlined" />
          导出EXCEL
        </a-button>
        <div class="flex items-center gap-2">
          <span>巡查年月：</span>
          <DateMonthPicker v-model:value="ym" value-format="YYYY-MM" style="width: 120px" placeholder="巡查年月" />
          <span>巡查时间：</span>
          <DateRangePicker v-model:value="dateRange" value-format="YYYY-MM-DD" style="width: 250px" />
          <a-button type="primary" :loading="loading" @click="load">查询</a-button>
        </div>
      </div>
      <ATable
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        bordered
        size="small"
        :row-class-name="(_: Recordable, i: number) => (i === dataSource.length - 1 ? 'font-bold' : '')"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">{{ dataSource.indexOf(record) + 1 }}</template>
          <template v-else-if="column.key === 'done'">
            <span v-if="!record.isSummary && record.done < record.expected" style="color: red">{{ record.done }}</span>
            <template v-else>{{ record.done }}</template>
          </template>
          <template v-else-if="column.key === 'status'">
            <span v-if="record.status === '未完成'" style="color: red">未完成</span>
            <template v-else>{{ record.status }}</template>
          </template>
        </template>
      </ATable>
    </div>
  </PageWrapper>
</template>

<script lang="ts" setup name="ViewsUrbanProtectionSharedProposedInspectionReportTable">
  import { computed, onMounted, ref } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { Icon } from '@jeesite/core/components/Icon';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { DateMonthPicker, DateRangePicker, Table as ATable } from 'antdv-next';
  import { InspectionReportRow, fetchInspectionReport } from '@jeesite/urban-protection/api/urban-protection/stats';
  import { fetchProposedInspectionReport } from '@jeesite/urban-protection/api/urban-protection/proposed';
  import { exportBorderedSheet } from './excel-export';

  const props = withDefaults(
    defineProps<{
      /** 报表标题 */
      heading: string;
      /** excellent=优保巡查 proposed=拟优保巡查 */
      scope?: 'excellent' | 'proposed';
      /** 巡查频次(月)：优保=2、拟优保=1（老系统口径） */
      frequency?: number;
    }>(),
    { scope: 'proposed', frequency: 1 },
  );

  // 后端暂无字段，暂以 — 占位
  const PLACEHOLDER = '—';

  type ReportLine = InspectionReportRow & {
    frequency: number;
    inspectedCount: string;
    normalCount: string;
    attentionCount: string;
    status: string;
    isSummary: boolean;
  };

  const ym = ref<string>(dateUtil().format('YYYY-MM'));
  const dateRange = ref<[string, string] | undefined>();
  const loading = ref(false);
  const exporting = ref(false);
  const rows = ref<InspectionReportRow[]>([]);
  const summary = ref<InspectionReportRow | null>(null);

  const columns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 60, align: 'center' as const },
    { title: '所属区', dataIndex: 'qu', width: 130, align: 'center' as const },
    { title: '巡查频次(月)', dataIndex: 'frequency', width: 110, align: 'center' as const },
    {
      title: '巡查建筑数量',
      align: 'center' as const,
      children: [
        { title: '现有建筑数量', dataIndex: 'buildingCount', align: 'center' as const },
        // 巡查建筑数量：后端无字段，暂以 — 占位
        { title: '巡查建筑数量', dataIndex: 'inspectedCount', align: 'center' as const },
      ],
    },
    {
      title: '建筑巡查次数',
      align: 'center' as const,
      children: [
        { title: '应巡查量', dataIndex: 'expected', align: 'center' as const },
        // 普通巡查/特别关注：后端无字段，暂以 — 占位
        { title: '普通巡查', dataIndex: 'normalCount', align: 'center' as const },
        { title: '特别关注', dataIndex: 'attentionCount', align: 'center' as const },
        { title: '实际巡查量', dataIndex: 'done', key: 'done', align: 'center' as const },
      ],
    },
    { title: '完成情况', dataIndex: 'status', key: 'status', width: 110, align: 'center' as const },
  ];

  function toLine(row: InspectionReportRow, isSummary: boolean): ReportLine {
    return {
      ...row,
      qu: isSummary ? '全部' : row.qu,
      frequency: props.frequency,
      inspectedCount: PLACEHOLDER,
      normalCount: PLACEHOLDER,
      attentionCount: PLACEHOLDER,
      status: row.expected > 0 && row.done >= row.expected ? '完成' : '未完成',
      isSummary,
    };
  }

  const dataSource = computed<ReportLine[]>(() => [
    ...rows.value.map((r) => toLine(r, false)),
    ...(summary.value ? [toLine(summary.value, true)] : []),
  ]);

  async function load() {
    if (!ym.value) return;
    loading.value = true;
    try {
      const hasRange = !!(dateRange.value?.[0] && dateRange.value?.[1]);
      // 拟优保走 proposed/stats（WHFW_OLDJZ 口径，无 scope 参数）；优保走 stats（带 scope）
      const period = hasRange
        ? { mode: 'range' as const, begin: dateRange.value![0], end: dateRange.value![1] }
        : {
            mode: 'month' as const,
            year: Number(ym.value.slice(0, 4)),
            month: Number(ym.value.slice(5, 7)),
          };
      const data =
        props.scope === 'proposed'
          ? await fetchProposedInspectionReport(period)
          : await fetchInspectionReport({ scope: props.scope, ...period });
      rows.value = data.rows ?? [];
      summary.value = data.summary ?? null;
    } finally {
      loading.value = false;
    }
  }

  function handleExport() {
    if (!dataSource.value.length) return;
    exporting.value = true;
    try {
      const header1 = ['序号', '所属区', '巡查频次(月)', '巡查建筑数量', '', '建筑巡查次数', '', '', '', '完成情况'];
      const header2 = [
        '',
        '',
        '',
        '现有建筑数量',
        '巡查建筑数量',
        '应巡查量',
        '普通巡查',
        '特别关注',
        '实际巡查量',
        '',
      ];
      const body = dataSource.value.map((r, i) => [
        r.isSummary ? '' : i + 1,
        r.qu,
        r.isSummary ? '' : r.frequency,
        r.buildingCount,
        r.inspectedCount,
        r.expected,
        r.normalCount,
        r.attentionCount,
        r.done,
        r.status,
      ]);
      // 多级表头合并（0 起绝对行号，第 0 行为标题、第 1/2 行为表头）：单列表纵向合并，组列横向合并
      const merges = [
        { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
        { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
        { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
        { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
        { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } },
        { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },
      ];
      exportBorderedSheet(
        `${props.heading}_${dateUtil().format('YYYYMMDD')}.xlsx`,
        [header1, header2, ...body],
        [8, 14, 12, 14, 14, 12, 12, 12, 14, 12].map((wch) => ({ wch })),
        { title: props.heading, merges, boldRows: [body.length + 2], rowHeights: { 1: 24 } },
      );
    } finally {
      exporting.value = false;
    }
  }

  onMounted(load);
</script>
<style scoped>
  /* 列名不加粗（含多级表头） */
  :deep(.ant-table-thead > tr > th) {
    font-weight: normal;
  }
</style>
