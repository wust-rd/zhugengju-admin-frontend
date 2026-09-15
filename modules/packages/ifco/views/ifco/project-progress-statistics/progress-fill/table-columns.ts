/**
 * ifco 进展填报 —— 表格列组装与列宽拖拽（从 list.vue 拆出）
 *
 * 列宽拖拽复用框架 ResizableTitle（同 sys/empUser）：onHeaderCell 注入 resizable
 * 与宽度回写。三套列：明细（合计+项目列）、总览（总计+各叶子类目列，嵌套类目
 * 一级表头跨列），scrollX 按各列当前宽度求和。
 */
import { computed, type ComputedRef, type Ref } from 'vue';
import type { TableColumnsType } from 'antdv-next';
import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
import type { CategoryDef, PeriodFillData } from '@jeesite/ifco/api/ifco/progress-fill';
import {
  DATA_CATEGORIES,
  INDICATOR_MAP,
  LEAF_CATEGORIES,
  grandTotal,
  tabTotal,
} from '@jeesite/ifco/api/ifco/progress-fill';
import { NEW_START_KEY, renderDisplay, renderNewStart, type CellRenderers, type FillRow } from './cell-renderers';

export type TableColumnsDeps = {
  activeLeaf: ComputedRef<CategoryDef | null>;
  isOverview: ComputedRef<boolean>;
  periodData: Ref<PeriodFillData | undefined>;
  editingColKey: Ref<string | undefined>;
  /** 列宽登记(页面创建,编辑模块与新列落库共用同一引用) */
  colWidths: Record<string, number>;
  renderers: CellRenderers;
};

export function createTableColumns(deps: TableColumnsDeps) {
  const { activeLeaf, isOverview, periodData, editingColKey, colWidths, renderers } = deps;
  const { renderFillCell, renderProjectHeader, renderNameCell, sumRowOnCell } = renderers;

  const TABLE_COMPONENTS = { header: { cell: ResizableTitle } };
  const resizableHeaderCell = (col: any): any => ({
    column: { ...col, resizable: true },
    onResize: (_event: MouseEvent, { size }: { size: { width: number } }) => {
      if (col.key) {
        colWidths[col.key] = size.width;
      }
    },
  });
  const widthFor = (key: string, defaultWidth: number) => colWidths[key] ?? defaultWidth;

  function leadingColumns(): TableColumnsType<FillRow> {
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'progress-fill-col-name',
        onHeaderCell: resizableHeaderCell,
        render: (value: string, record: FillRow) => renderNameCell(value, record),
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

  function buildFillColumns(): TableColumnsType<FillRow> {
    const leaf = activeLeaf.value;
    if (!leaf) return [];
    const tab = periodData.value?.[leaf.key];
    const projects = tab?.projects ?? [];
    const projectColumns: TableColumnsType<FillRow> = projects.map((col, index) => ({
      key: col.key,
      title: renderProjectHeader(col, leaf.key),
      width: widthFor(col.key, 140),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      // 奇偶列底色提升横向辨识度;编辑列高亮仍优先生效
      className:
        [
          index % 2 === 1 ? 'progress-fill-col-alt' : undefined,
          editingColKey.value === col.key ? 'progress-fill-col-editing' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderFillCell(INDICATOR_MAP[record.key], col, leaf.key),
    }));
    // 表头不做类目分组跨列,直接平铺项目列(类目已由 RadioGroup 表达)
    return [
      ...leadingColumns(),
      {
        key: 'total',
        title: '合计',
        width: widthFor('total', 120),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) => renderDisplayByKind(record, tabTotal(INDICATOR_MAP[record.key], tab)),
      },
      ...projectColumns,
    ];
  }

  function buildOverviewColumns(): TableColumnsType<FillRow> {
    const data = periodData.value;
    /** 二级(叶子)类目列:值 = 该叶子类目的合计(total 行即录入值,count 行即列数) */
    const leafColumn = (leaf: CategoryDef): TableColumnsType<FillRow>[number] => ({
      key: leaf.key,
      title: leaf.label,
      width: widthFor(leaf.key, 150),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) =>
        renderDisplayByKind(record, tabTotal(INDICATOR_MAP[record.key], data?.[leaf.key])),
    });
    /** 嵌套类目拆为三个二级子列(一级表头跨列),简单类目单列 */
    const categoryColumns: TableColumnsType<FillRow> = DATA_CATEGORIES.map((cat) =>
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
        width: widthFor('grand', 130),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) =>
          renderDisplayByKind(record, grandTotal(INDICATOR_MAP[record.key], data)),
      },
      ...categoryColumns,
    ];
  }

  /** 合计/总计列的显示:r3 数值直出(含 0),其余未填与 0 置空 */
  function renderDisplayByKind(record: FillRow, value: number | string | undefined) {
    return record.key === NEW_START_KEY ? renderNewStart(value) : renderDisplay(value);
  }

  const tableColumns = computed<TableColumnsType<FillRow>>(() =>
    isOverview.value ? buildOverviewColumns() : buildFillColumns(),
  );

  /** 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和 */
  const scrollX = computed(() => {
    const fixedWidth = widthFor('name', 400) + widthFor('unit', 90) + widthFor('code', 80);
    if (isOverview.value) {
      return (
        fixedWidth + widthFor('grand', 130) + LEAF_CATEGORIES.reduce((sum, leaf) => sum + widthFor(leaf.key, 150), 0)
      );
    }
    const projects = activeLeaf.value ? (periodData.value?.[activeLeaf.value.key]?.projects ?? []) : [];
    return fixedWidth + widthFor('total', 120) + projects.reduce((sum, col) => sum + widthFor(col.key, 140), 0);
  });

  return { TABLE_COMPONENTS, colWidths, tableColumns, scrollX };
}

export type TableColumns = ReturnType<typeof createTableColumns>;
