/**
 * ifco 进展填报 —— 表格单元格/列头渲染函数（从 list.vue 拆出）
 *
 * 编辑列内渲染输入控件（数字/来源说明/r3 新开工开关），其余为只读文本；
 * 项目列头带编辑/删除图标（只读单位不渲染）。键盘导航由 shared/cell-nav 提供。
 */
import { h, type ComputedRef, type Ref } from 'vue';
import { Input, InputNumber, Popconfirm, Switch, Tooltip } from 'antdv-next';
import { Icon } from '@jeesite/core/components/Icon';
import type { IndicatorDef, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import { cellValue } from '@jeesite/ifco/api/ifco/progress-fill';
import { handleCellNav } from '../../shared/cell-nav';
import type { FillEditing } from './fill-editing';

/** 表格行(指标) */
export type FillRow = {
  key: string;
  kind: IndicatorDef['kind'];
  name: string;
  unit: string;
  code: string;
};

/** 其中：本年新开工（r3，编码 102）：开关型指标，0=非新开工、1=是新开工；
 *  合计 = 各项目列该字段的总计（即为"是新开工"的项目个数） */
export const NEW_START_KEY = 'r3';

/** 未填内容与 0 一律置空(不补斜杠、不补 0) */
export function renderDisplay(value: number | string | undefined) {
  if (value === undefined || value === '' || value === 0) return '';
  return typeof value === 'number' ? String(value) : value;
}

/** r3 显示口径：数值直出（含 0），不走通用"未填与 0 置空" */
export function renderNewStart(value: number | string | [number, number] | undefined) {
  return String(Number(value ?? 0));
}

export type CellRendererDeps = {
  quarter: Ref<string>;
  isOverview: ComputedRef<boolean>;
  unitEditable: ComputedRef<boolean>;
  editing: FillEditing;
};

export function createCellRenderers(deps: CellRendererDeps) {
  const { quarter, isOverview, unitEditable, editing } = deps;
  const { editingColKey, dirtyCols, toggleEdit, handleDeleteColumn, openTotalModal } = editing;

  function setCellValue(col: ProjectColumn, indicatorKey: string, value: number | string | undefined, leafKey: string) {
    if (value === undefined || value === '') {
      delete col.values[indicatorKey];
    } else {
      col.values[indicatorKey] = value;
    }
    dirtyCols.set(col.key, { leafKey, col });
  }

  /** 单元格:编辑列内渲染输入控件(自动行除外),其余为只读文本 */
  function renderFillCell(item: IndicatorDef, col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key && (item.kind === 'fill' || item.kind === 'text')) {
      if (item.key === NEW_START_KEY) {
        // 新开工:开关录入(0/1),不参与键盘导航(无可键入的输入框,Enter/方向键会跳过本行)
        return h('div', { class: 'flex w-full justify-center' }, [
          h(Switch, {
            size: 'default',
            checked: Number(col.values[item.key] ?? 0) === 1,
            checkedChildren: '是新开工',
            unCheckedChildren: '非新开工',
            'onUpdate:checked': (checked) => setCellValue(col, item.key, checked === true ? 1 : 0, leafKey),
          }),
        ]);
      }
      if (item.kind === 'text') {
        return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
          h(Input, {
            size: 'small',
            value: String(col.values[item.key] ?? ''),
            placeholder: '请输入来源说明',
            'onUpdate:value': (value: string) => setCellValue(col, item.key, value, leafKey),
          }),
        ]);
      }
      const value = col.values[item.key];
      return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
        h(InputNumber, {
          size: 'small',
          class: 'w-full',
          value: typeof value === 'number' ? value : undefined,
          min: 0,
          controls: false,
          placeholder: '请输入',
          'onUpdate:value': (value2: number | string | null) =>
            setCellValue(col, item.key, value2 ?? undefined, leafKey),
        }),
      ]);
    }
    if (item.key === NEW_START_KEY) {
      // 新开工读态:显示数值(0/1),未填默认 0
      return renderNewStart(col.values[item.key]);
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon(点击即存该列);只读单位不渲染图标 */
  function renderProjectHeader(col: ProjectColumn, leafKey: string) {
    const isEditing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      unitEditable.value
        ? h('span', { class: 'flex shrink-0 items-center gap-1' }, [
            h(Tooltip, { title: isEditing ? '完成并保存本列' : '编辑本列' }, () =>
              h(Icon, {
                icon: isEditing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
                class: 'progress-fill-icon-edit',
                onClick: () => toggleEdit(col, leafKey),
              }),
            ),
            deletable
              ? h(
                  Popconfirm,
                  { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) },
                  () =>
                    h(Icon, {
                      icon: 'ant-design:delete-outlined',
                      class: 'progress-fill-icon',
                    }),
                )
              : null,
          ])
        : null,
    ]);
  }

  /** 指标名称单元格:合计级录入行(total)在非总览下带蓝色「编辑」按钮,弹 Modal 直接录合计值(只读单位不渲染) */
  function renderNameCell(value: string, record: FillRow) {
    if (isOverview.value || record.kind !== 'total' || !unitEditable.value) return value;
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate' }, value),
      h(Tooltip, { title: '填写合计值（各项目单元格不填值）' }, () =>
        h(Icon, {
          icon: 'ant-design:edit-outlined',
          class: 'progress-fill-icon-edit',
          onClick: () => openTotalModal(record.key),
        }),
      ),
    ]);
  }

  /** 自动行(汇总/项目数)整行浅灰加粗只读 */
  function sumRowOnCell(record: FillRow) {
    return {
      className: record.kind === 'sum' || record.kind === 'count' ? 'progress-fill-row-sum' : undefined,
    };
  }

  return { setCellValue, renderFillCell, renderProjectHeader, renderNameCell, sumRowOnCell };
}

export type CellRenderers = ReturnType<typeof createCellRenderers>;
