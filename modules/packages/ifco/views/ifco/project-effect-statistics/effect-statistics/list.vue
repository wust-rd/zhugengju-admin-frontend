<!--
  ifco —— 项目实施成效统计（/ifco/effect-statistics/list）

  页面结构:Card 工具栏(填报年份/填报季度 | 导出)
  → 只读汇总表格:行 = 全部成效指标(含「一、～八、」节标题行,加粗不落数值),
    列 = 指标名称(固定) | 计量单位 | 代码 | 全武汉市 | 可见报送单位。

  口径(对接后端 modules/ifco):
  - 汇总全部在服务端算好(GET /ifco/effect/stat/data),本页直接渲染,无本地聚合;
  - 单位列来自返回的 allowedUnits(已按数据权限过滤);
  - 全武汉市列 = rows[].total(可见单位数量合计);单位列 = rows[].units[code];
  - 双值行(226/227/245/246)后端 a/b 两行,本页按 dualGroup 合并为一行
    「数 | 面积」二元组展示;
  - 空值与 0 置空(不补斜杠、不补 0)。

  菜单注册(菜单名称「项目成效统计」):
   - 链接地址:/ifco/project-effect-statistics/effect-statistics/list
   - 组件位置:/ifco/project-effect-statistics/effect-statistics/list(与链接地址一致)
-->
<template>
  <PageWrapper content-full-height content-class="flex flex-col overflow-hidden">
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <PeriodSelects v-model:year="year" v-model:quarter="quarter" @change="loadStat" />
        </div>
        <a-button :loading="exporting" @click="handleExport"> 导出 </a-button>
      </div>
    </Card>

    <Card class="fill-page-card flex-1 min-h-0">
      <div ref="tableWrapRef" class="flex-1 min-h-0">
        <Table
          :columns="tableColumns"
          :data-source="STAT_ROWS"
          :loading="loading"
          :scroll="{ x: scrollX, y: tableBodyY }"
          :components="TABLE_COMPONENTS"
          :pagination="false"
          bordered
          size="small"
          row-key="key"
        />
      </div>
    </Card>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoEffectStatisticsList">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Card, Table } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
  import { useTableBodyHeight } from '../../shared/table-viewport';
  import { exportEffectStatExcel } from './export-excel';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import type { EffectStatRow } from '@jeesite/ifco/api/ifco/effect-fill';
  import { loadEffectStatData, quarterLabel } from '@jeesite/ifco/api/ifco/effect-fill';
  import PeriodSelects from '../../shared/PeriodSelects.vue';
  import { useCurrentPeriod } from '../../shared/period-options.js';

  const { showMessage } = useMessage();

  // 表格视口高度:容器 flex-1 实测,详见 shared/table-viewport
  const tableWrapRef = ref<HTMLDivElement>();
  const tableBodyY = useTableBodyHeight(tableWrapRef);

  // ── 列宽拖拽(复用框架 ResizableTitle,同 sys/empUser):onHeaderCell 注入 resizable 与宽度回写 ──
  const TABLE_COMPONENTS = { header: { cell: ResizableTitle } };
  const colWidths = reactive<Record<string, number>>({});
  const resizableHeaderCell = (col: any): any => ({
    column: { ...col, resizable: true },
    onResize: (_event: MouseEvent, { size }: { size: { width: number } }) => {
      if (col.key) {
        colWidths[col.key] = size.width;
      }
    },
  });
  const widthFor = (key: string, defaultWidth: number) => colWidths[key] ?? defaultWidth;

  // ── 筛选条件:年份 + 季度(默认当前;选项与年份切换修正见 shared/PeriodSelects) ─
  const { year, quarter } = useCurrentPeriod();

  // ── 统计数据(服务端已聚合;单位维度即表格列) ──────────────────────────
  const loading = ref(false);
  const STAT_ROWS = reactive<EffectStatRow[]>([]);
  const unitColumnsData = reactive<{ code: string; name: string }[]>([]);

  async function loadStat() {
    loading.value = true;
    try {
      const res = await loadEffectStatData(year.value, quarter.value);
      unitColumnsData.splice(0, unitColumnsData.length, ...res.allowedUnits);
      STAT_ROWS.splice(0, STAT_ROWS.length, ...res.rows);
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载成效统计数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    loadStat();
  });

  /** 节标题行加粗;全武汉市列数值加粗(全市口径) */
  const rowOnCell = (record: EffectStatRow, columnKey?: string) => ({
    className:
      [
        record.kind === 'section' ? 'effect-stat-row-section' : undefined,
        columnKey === 'city' && record.kind !== 'section' ? 'effect-stat-col-city' : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0);双值行「数 | 面积」竖线留空隙 */
  function renderDisplay(value: number | string | [number, number] | undefined) {
    if (Array.isArray(value)) {
      const format = (v: number) => (v === 0 ? '' : String(v));
      // 竖线前后各留 4 个空格;用不间断空格(U+00A0)防止 HTML 空白折叠
      const gap = '\u00A0\u00A0';
      return `${format(value[0])}${gap}|${gap}${format(value[1])}`;
    }
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? String(value) : value;
  }

  const tableColumns = computed<TableColumnsType<EffectStatRow>>(() => {
    /** 全武汉市列:可见单位数量合计(服务端 rows[].total) */
    const cityColumn: TableColumnsType<EffectStatRow>[number] = {
      key: 'city',
      title: '全武汉市',
      width: widthFor('city', 200),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: (record: EffectStatRow) => rowOnCell(record, 'city'),
      render: (_value: unknown, record: EffectStatRow) => renderDisplay(record.total),
    };
    /** 各单位列:该单位行数量合计(服务端 rows[].units[code];双值行二元组) */
    const unitColumns: TableColumnsType<EffectStatRow> = unitColumnsData.map((unit) => ({
      key: unit.code,
      title: unit.name,
      width: widthFor(unit.code, 200),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: (record: EffectStatRow) => rowOnCell(record),
      render: (_value: unknown, record: EffectStatRow) => renderDisplay(record.units[unit.code]),
    }));
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'effect-stat-col-name',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'unit',
        title: '计量单位',
        dataIndex: 'unit',
        width: widthFor('unit', 90),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'code',
        title: '代码',
        dataIndex: 'code',
        width: widthFor('code', 80),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      cityColumn,
      ...unitColumns,
    ];
  });

  // 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和
  const scrollX = computed(
    () =>
      widthFor('name', 400) +
      widthFor('unit', 90) +
      widthFor('code', 80) +
      widthFor('city', 200) +
      unitColumnsData.reduce((sum, unit) => sum + widthFor(unit.code, 200), 0),
  );

  // ── 导出:单排表头平铺表(全武汉市 + 各可见单位列),文件名官方口径 ─────
  const exporting = ref(false);

  async function handleExport() {
    if (exporting.value || loading.value) return;
    exporting.value = true;
    try {
      await exportEffectStatExcel({
        year: year.value,
        quarter: quarter.value,
        units: [...unitColumnsData],
        rows: [...STAT_ROWS],
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效统计`);
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '导出失败');
    } finally {
      exporting.value = false;
    }
  }
</script>

<style>
  .fill-page-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .fill-page-card > .ant-card-body {
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* 节标题行(一、～八、)加粗 */
  .effect-stat-row-section {
    font-weight: 600;
  }

  /* 全武汉市列数值加粗(全市口径) */
  .effect-stat-col-city {
    font-weight: 600;
  }

  .effect-stat-col-name {
    white-space: nowrap;
  }
</style>
