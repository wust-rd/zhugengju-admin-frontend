<!--
  ifco —— 项目进展统计（/ifco/progress-statistics/list）

  页面结构:Card 工具栏(填报年份/填报季度 | 导出[按钮保留,功能待做])
  → RadioGroup(总览 + 13 个行政区报送单位,按钮样式可换行)
  → 只读转置表格:行 = 指标,列 = 类目(与填报页总览同构:
    固定左四列 + 7 个简单类目单列 + 嵌套类目拆三个二级子列 + 最左总计)。

  口径:
  - 只查询 + 导出,整页只读(无编辑/新增/带入/保存);
  - 点报送单位 = 该单位的分表(等同填报页选中该单位时的总览);
  - 点总览 = 全部报送单位合计(全市口径);
  - count 行(城市更新项目总数) = 范围内各单位项目列数之和;
    total 行(新增就业岗位) = 范围内各单位录入值之和;汇总行随构成行求和;
  - 数据与填报页共享同一份内存假数据仓库
    (@jeesite/ifco/api/ifco/progress-fill 的 progressFillStore,后端接入后整体替换)。

  菜单注册(菜单名称「项目进展统计」):
   - 链接地址:/ifco/progress-statistics/list
   - 组件位置:/ifco/progress-statistics/list(与链接地址一致)
-->
<template>
  <PageWrapper>
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <span class="text-gray-500">填报年份</span>
          <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" />
          <span class="ml-6 text-gray-500">填报季度</span>
          <Select v-model:value="quarter" :options="QUARTER_OPTIONS" class="ml-2 w-28" />
        </div>
        <a-button @click="handleExport"> 导出 </a-button>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <RadioGroup
        v-model:value="activeUnit"
        :options="unitOptions"
        option-type="button"
        class="progress-stat-radios mb-2 flex flex-wrap"
      />
      <Table
        :columns="tableColumns"
        :data-source="STAT_ROWS"
        :scroll="{ x: scrollX }"
        :pagination="false"
        sticky
        bordered
        size="small"
        row-key="key"
      />
    </Card>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProgressStatisticsList">
  import { computed, ref } from 'vue';
  import { Card, RadioGroup, Select, Table } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { CategoryDef, IndicatorDef, PeriodFillData } from '@jeesite/ifco/api/ifco/progress-fill';
  import {
    DATA_CATEGORIES,
    INDICATORS,
    INDICATOR_MAP,
    LEAF_CATEGORIES,
    QUARTER_OPTIONS,
    REPORT_UNITS,
    ensureUnitPeriodData,
    grandTotalOfUnits,
    quarterLabel,
    tabTotalOfUnits,
    toPeriodKey,
  } from '@jeesite/ifco/api/ifco/progress-fill';

  /** 表格行(指标) */
  type StatRow = {
    key: string;
    kind: IndicatorDef['kind'];
    name: string;
    unit: string;
    code: string;
  };

  const { showMessage } = useMessage();

  // ── 筛选条件:年份 + 季度(切换即时生效) ──────────────────────────────
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));
  const year = ref(dateUtil().year());
  // dayjs 的 quarter() 需 quarterOfYear 插件，这里用 month() 推导当前季度
  const quarter = ref(String(Math.floor(dateUtil().month() / 3) + 1));

  // ── 统计范围:总览(全市) + 各报送单位 ────────────────────────────────
  const unitOptions = [
    { label: '总览', value: 'overview' },
    ...REPORT_UNITS.map((name) => ({ label: name, value: name })),
  ];
  const activeUnit = ref('overview');

  /** 当前统计范围内的单位数据集(总览 = 全部单位;单选 = 该单位;懒初始化) */
  const statUnits = computed<PeriodFillData[]>(() => {
    const key = toPeriodKey(year.value, quarter.value);
    const units = activeUnit.value === 'overview' ? [...REPORT_UNITS] : [activeUnit.value];
    return units.map((unit) => ensureUnitPeriodData(key, unit));
  });

  const tableCardTitle = computed(() => {
    const period = `${year.value}年 ${quarterLabel(quarter.value)}`;
    return activeUnit.value === 'overview' ? `${period} 总览` : `${period} · ${activeUnit.value}`;
  });

  // ── 表格行(静态指标清单) ─────────────────────────────────────────────
  const STAT_ROWS: StatRow[] = INDICATORS.map((item) => ({
    key: item.key,
    kind: item.kind,
    name: item.name,
    unit: item.unit,
    code: item.code,
  }));

  /** 自动行(汇总/项目数)加粗只读 */
  const sumRowOnCell = (record: StatRow) => ({
    className:
      record.kind === 'sum' || record.kind === 'count' ? 'progress-stat-row-sum' : undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0) */
  function renderDisplay(value: number | string | undefined) {
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? value.toLocaleString('zh-CN') : value;
  }

  function leadingColumns(): TableColumnsType<StatRow> {
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: 400,
        fixed: 'left',
        className: 'progress-stat-col-name',
      },
      {
        key: 'unit',
        title: '计量单位',
        dataIndex: 'unit',
        width: 90,
        align: 'center',
      },
      {
        key: 'code',
        title: '代码',
        dataIndex: 'code',
        width: 80,
        align: 'center',
      },
    ];
  }

  const tableColumns = computed<TableColumnsType<StatRow>>(() => {
    const units = statUnits.value;
    /** 二级(叶子)类目列:值 = 范围内各单位在该类目上的合计之和 */
    const leafColumn = (leaf: CategoryDef): TableColumnsType<StatRow>[number] => ({
      key: leaf.key,
      title: leaf.label,
      width: 150,
      align: 'right',
      onCell: sumRowOnCell,
      render: (_value: unknown, record: StatRow) =>
        renderDisplay(tabTotalOfUnits(INDICATOR_MAP[record.key], units, leaf.key)),
    });
    /** 嵌套类目拆为三个二级子列(一级表头跨列),简单类目单列 */
    const categoryColumns: TableColumnsType<StatRow> = DATA_CATEGORIES.map((cat) =>
      cat.children?.length
        ? {
            key: cat.key,
            title: cat.label,
            children: cat.children.map((leaf) => leafColumn(leaf)),
          }
        : leafColumn(cat),
    );
    return [
      ...leadingColumns(),
      {
        key: 'grand',
        title: '总计',
        width: 130,
        align: 'right',
        onCell: sumRowOnCell,
        render: (_value: unknown, record: StatRow) =>
          renderDisplay(grandTotalOfUnits(INDICATOR_MAP[record.key], units)),
      },
      ...categoryColumns,
    ];
  });

  const scrollX = computed(() => 400 + 90 + 80 + 130 + 150 * LEAF_CATEGORIES.length);

  // ── 导出(按钮保留,功能待做) ─────────────────────────────────────────
  function handleExport() {
    showMessage('导出功能建设中');
  }
</script>

<style scoped>
  .progress-stat-radios {
    row-gap: 8px;
  }
</style>

<style>
  /* 自动行(汇总/项目数)仅加粗,不加背景色 */
  .progress-stat-row-sum {
    font-weight: 600;
  }

  .progress-stat-col-name {
    white-space: nowrap;
  }
</style>
