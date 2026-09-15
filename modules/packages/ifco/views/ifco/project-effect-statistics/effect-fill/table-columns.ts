/**
 * ifco 成效填报 —— 表格列组装与列宽拖拽（从 list.vue 拆出）
 *
 * 列宽拖拽复用框架 ResizableTitle（同 sys/empUser）：onHeaderCell 注入 resizable
 * 与宽度回写。成效域无类目维度：固定 3 列 + 合计列 + 平铺项目列。
 */
import { computed, type Ref } from 'vue';
import type { TableColumnsType } from 'antdv-next';
import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
import type { EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
import { EFFECT_INDICATOR_MAP, rowTotal } from '@jeesite/ifco/api/ifco/effect-fill';
import { renderDisplay, type CellRenderers, type FillRow } from './cell-renderers';

export type TableColumnsDeps = {
  unitData: Ref<EffectUnitData | undefined>;
  editingColKey: Ref<string | undefined>;
  /** 列宽登记(页面创建,编辑模块与新列落库共用同一引用) */
  colWidths: Record<string, number>;
  renderers: CellRenderers;
};

export function createTableColumns(deps: TableColumnsDeps) {
  const { unitData, editingColKey, colWidths, renderers } = deps;
  const { renderFillCell, renderProjectHeader, sumRowOnCell } = renderers;

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

  const tableColumns = computed<TableColumnsType<FillRow>>(() => {
    const projects = unitData.value?.projects ?? [];
    const projectColumns: TableColumnsType<FillRow> = projects.map((col, index) => ({
      key: col.key,
      title: renderProjectHeader(col),
      width: widthFor(col.key, 140),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      // 奇偶列底色提升横向辨识度;编辑列高亮仍优先生效
      className:
        [
          index % 2 === 1 ? 'effect-fill-col-alt' : undefined,
          editingColKey.value === col.key ? 'effect-fill-col-editing' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderFillCell(EFFECT_INDICATOR_MAP[record.key]!, col),
    }));
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'effect-fill-col-name',
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
      {
        key: 'total',
        title: '合计',
        width: widthFor('total', 140),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) =>
          renderDisplay(rowTotal(EFFECT_INDICATOR_MAP[record.key]!, unitData.value)),
      },
      ...projectColumns,
    ];
  });

  /** 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和 */
  const scrollX = computed(() => {
    const projects = unitData.value?.projects ?? [];
    return (
      widthFor('name', 400) +
      widthFor('unit', 90) +
      widthFor('code', 80) +
      widthFor('total', 140) +
      projects.reduce((sum, col) => sum + widthFor(col.key, 140), 0)
    );
  });

  return { TABLE_COMPONENTS, tableColumns, scrollX };
}

export type TableColumns = ReturnType<typeof createTableColumns>;
