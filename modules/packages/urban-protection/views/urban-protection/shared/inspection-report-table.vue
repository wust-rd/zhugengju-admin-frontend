<!--
  市住更局 —— 名城保护 · 巡查报表统计（优保/拟优保共用）

  两种时间查询（与业务确认）：
   - 按月份：年 + 月下拉，统计该月各区已巡查量；
   - 按日期起止：日期区间（含端点），统计区间内各区已巡查量。
  表格为单值列：序号/区/应巡查量/已巡查量/未巡查量/巡查率，末行为全市合计（加粗）。
  应巡查量 = 该区现有建筑数量 × 2（年度指标，全部未删除建筑、在册+拟优保，不随查询期折算；
  已巡查量按报表口径：优保=父建筑在册，拟优保=父建筑拟优保）。
-->
<template>
  <PageWrapper>
    <div class="bg-white p-4">
      <div class="mb-4 flex items-center justify-center gap-3">
        <span class="text-lg font-bold">{{ heading }}</span>
      </div>
      <div class="mb-3 flex items-center justify-end gap-2">
        <RadioGroup v-model:value="mode" button-style="solid" @change="load">
          <RadioButton value="month">按月份</RadioButton>
          <RadioButton value="range">按日期起止</RadioButton>
        </RadioGroup>
        <template v-if="mode === 'month'">
          <Select v-model:value="year" :options="yearOptions" style="width: 110px" placeholder="年份" />
          <Select v-model:value="month" :options="monthOptions" style="width: 100px" placeholder="月份" />
        </template>
        <template v-else>
          <DateRangePicker v-model:value="dateRange" value-format="YYYY-MM-DD" style="width: 240px" />
        </template>
        <a-button type="primary" :loading="loading" @click="load">查询</a-button>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        bordered
        size="small"
        :row-class-name="(_: Recordable, index: number) => (index === dataSource.length - 1 ? 'font-bold' : '')"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">{{ dataSource.indexOf(record) + 1 }}</template>
          <template v-else-if="column.key === 'rate'">
            {{ record.rate === null || record.rate === undefined ? '—' : `${record.rate}%` }}
          </template>
        </template>
      </a-table>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedInspectionReportTable">
  import { computed, onMounted, ref } from 'vue';
  import { DateRangePicker, RadioGroup, RadioButton, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import {
    fetchInspectionReport,
    fetchInspectionYears,
    InspectionReportRow,
  } from '@jeesite/urban-protection/api/urban-protection/stats';

  const props = defineProps<{
    /** excellent=优保巡查 proposed=拟优保巡查 */
    scope: 'excellent' | 'proposed';
    /** 报表标题 */
    heading: string;
  }>();

  /** 查询模式：month=按月份 range=按日期起止 */
  const mode = ref<'month' | 'range'>('month');
  const year = ref<number | undefined>();
  const month = ref<number | undefined>();
  const dateRange = ref<[string, string] | undefined>();

  const yearOptions = ref<{ label: string; value: number }[]>([]);
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }));

  const loading = ref(false);
  const rows = ref<InspectionReportRow[]>([]);
  const summary = ref<InspectionReportRow | null>(null);

  const columns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 60, align: 'center' as const },
    { title: '区', dataIndex: 'qu', width: 160 },
    { title: '应巡查量', dataIndex: 'expected', align: 'center' as const },
    { title: '已巡查量', dataIndex: 'done', align: 'center' as const },
    { title: '未巡查量', dataIndex: 'missing', align: 'center' as const },
    { title: '巡查率', dataIndex: 'rate', key: 'rate', align: 'center' as const },
  ];

  /** 表格数据：各区行 + 全市合计行 */
  const dataSource = computed(() => (summary.value ? [...rows.value, summary.value] : [...rows.value]));

  async function load() {
    if (mode.value === 'month' && (!year.value || !month.value)) return;
    if (mode.value === 'range' && (!dateRange.value?.[0] || !dateRange.value?.[1])) return;
    loading.value = true;
    try {
      const data =
        mode.value === 'month'
          ? await fetchInspectionReport({
              scope: props.scope,
              mode: 'month',
              year: year.value,
              month: month.value,
            })
          : await fetchInspectionReport({
              scope: props.scope,
              mode: 'range',
              begin: dateRange.value![0],
              end: dateRange.value![1],
            });
      rows.value = data.rows;
      summary.value = data.summary;
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    const years = await fetchInspectionYears();
    yearOptions.value = years.map((y) => ({ label: `${y}年`, value: y }));
    // 默认当前年月（年份下拉没有当年时取最新一年）
    const now = new Date();
    year.value = years.includes(now.getFullYear()) ? now.getFullYear() : years[years.length - 1];
    month.value = now.getMonth() + 1;
    await load();
  });
</script>
