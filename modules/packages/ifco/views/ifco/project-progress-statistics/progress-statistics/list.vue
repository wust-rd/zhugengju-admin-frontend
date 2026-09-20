<!--
  ifco —— 项目进展统计（/ifco/progress-statistics/list）

  页面结构:Card 工具栏(填报年份/填报季度 | 导出)
  → RadioGroup(全武汉市 + 可见报送单位,按钮样式可换行)
  → 只读转置表格:行 = 指标,列 = 类目(与填报页总览同构:
    固定左四列 + 7 个简单类目单列 + 嵌套类目拆三个二级子列 + 最左合计)。

  口径(对接后端 modules/ifco):
  - 汇总全部在服务端算好(GET /ifco/progress/stat/data),本页直接渲染,无本地聚合;
  - 单位页签来自返回的 allowedUnits(已按数据权限过滤):「全武汉市」= 可见单位小计
    (不传 unit 参数),区县账号只有本区;
  - 行值:rows[].categories[叶子类目key] = 该类目小计(fill=SUM/total=录入值/
    count=项目列数/sum=构成求和/text=空),rows[].grand = 合计;
  - 只查询 + 导出,整页只读(无编辑/新增/带入/保存)。

  菜单注册(菜单名称「项目进展统计」):
   - 链接地址:/ifco/project-progress-statistics/progress-statistics/list
   - 组件位置:/ifco/project-progress-statistics/progress-statistics/list(与链接地址一致)
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
      <RadioGroup
        v-model:value="activeUnit"
        :options="unitOptions"
        option-type="button"
        class="progress-stat-radios mb-2 flex flex-wrap"
      />
      <div ref="tableWrapRef" class="flex-1 min-h-0">
        <Table
          :columns="tableColumns"
          :data-source="displayRows"
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
<script lang="ts" setup name="ViewsIfcoProgressStatisticsList">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Card, RadioGroup, Table } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import type { CategoryDef } from '@jeesite/ifco/api/ifco/progress-fill';
  import type { ProgressStatRow } from '@jeesite/ifco/api/ifco/progress-fill';
  import {
    DATA_CATEGORIES,
    LEAF_CATEGORIES,
    ensureProgressDicts,
    loadProgressStatData,
    quarterLabel,
  } from '@jeesite/ifco/api/ifco/progress-fill';
  import { exportProgressStatExcel } from './export-excel';
  import { useTableBodyHeight } from '../../shared/table-viewport';
  import PeriodSelects from '../../shared/PeriodSelects.vue';
  import { useCurrentPeriod } from '../../shared/period-options';

  /** 表格行(指标,服务端返回,名称已含缩进) */
  type StatRow = ProgressStatRow;

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

  // ── 统计范围:全武汉市(全市小计) + 可见报送单位(allowedUnits) ──────────
  const allowedUnits = reactive<{ code: string; name: string }[]>([]);
  // 单单位账号(区局):不显示"全武汉市"页签,只有本单位;多单位才带全市小计页签
  const unitOptions = computed(() => [
    ...(allowedUnits.length > 1 ? [{ label: '全武汉市', value: 'overview' }] : []),
    ...allowedUnits.map((unit) => ({ label: unit.name, value: unit.code })),
  ]);
  const activeUnit = ref('overview');

  // ── 统计数据(服务端一次聚合;切页签本地取数) ──────────────────────────
  const loading = ref(false);
  const OVERVIEW_ROWS = reactive<StatRow[]>([]);
  const UNIT_DATAS = reactive<{ code: string; name: string; rows: StatRow[] }[]>([]);
  const activeUnitName = computed(() => allowedUnits.find((unit) => unit.code === activeUnit.value)?.name ?? null);
  /** 当前展示行:全武汉市 = overview 小计;单位页签 = 该单位一份(无接口调用) */
  const displayRows = computed<StatRow[]>(() =>
    activeUnit.value === 'overview'
      ? OVERVIEW_ROWS
      : (UNIT_DATAS.find((unit) => unit.code === activeUnit.value)?.rows ?? []),
  );

  async function loadStat() {
    loading.value = true;
    try {
      const res = await loadProgressStatData(year.value, quarter.value);
      allowedUnits.splice(0, allowedUnits.length, ...res.allowedUnits);
      // 单单位账号(区局):隐藏页签并直接定位到本单位(overview 聚合口径与单单位相同)
      if (allowedUnits.length === 1 && activeUnit.value === 'overview') {
        activeUnit.value = allowedUnits[0].code;
      }
      if (activeUnit.value !== 'overview' && !res.allowedUnits.some((u) => u.code === activeUnit.value)) {
        activeUnit.value = 'overview';
      }
      OVERVIEW_ROWS.splice(0, OVERVIEW_ROWS.length, ...res.overviewRows);
      UNIT_DATAS.splice(0, UNIT_DATAS.length, ...res.unitDatas);
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载统计数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      // 类目树(列结构)来自字典;统计值来自 stat/data
      await ensureProgressDicts();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载字典失败');
    }
    await loadStat();
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0) */
  function renderDisplay(value: number | string | undefined) {
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? String(value) : value;
  }

  function leadingColumns(): TableColumnsType<StatRow> {
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'progress-stat-col-name',
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
    ];
  }

  const tableColumns = computed<TableColumnsType<StatRow>>(() => {
    /** 二级(叶子)类目列:值 = 服务端 rows[].categories[leafKey] */
    const leafColumn = (leaf: CategoryDef): TableColumnsType<StatRow>[number] => ({
      key: leaf.key,
      title: leaf.label,
      width: widthFor(leaf.key, 150),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      render: (_value: unknown, record: StatRow) => renderDisplay(record.categories[leaf.key]),
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
        title: '合计',
        width: widthFor('grand', 130),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        render: (_value: unknown, record: StatRow) => renderDisplay(record.grand),
      },
      ...categoryColumns,
    ];
  });

  // 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和
  const scrollX = computed(
    () =>
      widthFor('name', 400) +
      widthFor('unit', 90) +
      widthFor('code', 80) +
      widthFor('grand', 130) +
      LEAF_CATEGORIES.reduce((sum, leaf) => sum + widthFor(leaf.key, 150), 0),
  );

  // 单位切换:本地取数(一次拉取已含全部口径),无需调接口

  // ── 导出:单单位=自己一个sheet;全单位=全武汉市汇总+每个报送单位一个sheet;
  //    数据全部来自已加载的一次 stat/data 响应,零接口调用 ─────────────────
  const exporting = ref(false);

  async function handleExport() {
    if (exporting.value || loading.value) return;
    exporting.value = true;
    try {
      if (allowedUnits.length <= 1) {
        const unit = allowedUnits[0];
        await exportProgressStatExcel({
          year: year.value,
          quarter: quarter.value,
          unitName: unit?.name,
          sheets: [{ name: unit?.name ?? '本单位', rows: UNIT_DATAS[0]?.rows ?? [] }],
        });
      } else {
        await exportProgressStatExcel({
          year: year.value,
          quarter: quarter.value,
          unitName: '全武汉市',
          sheets: [
            { name: '全武汉市', rows: OVERVIEW_ROWS },
            ...UNIT_DATAS.map((unit) => ({ name: unit.name, rows: unit.rows })),
          ],
        });
      }
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目进展统计`);
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '导出失败');
    } finally {
      exporting.value = false;
    }
  }
</script>

<style scoped>
  .progress-stat-radios {
    row-gap: 8px;
  }
</style>

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

  .progress-stat-col-name {
    white-space: nowrap;
  }
</style>
