/**
 * ifco 成效填报 —— 表格单元格/列头渲染函数（从 list.vue 拆出）
 *
 * 编辑列内渲染输入控件（双值行两框中间固定竖线），其余为只读文本
 * （双值读态「数 | 面积」竖线拼接）；项目列头带编辑/删除图标。
 * 键盘导航由 shared/cell-nav 提供（双值格同行先左右衔接再跳下一行）。
 */
import { h, type ComputedRef, type Ref } from 'vue';
import { InputNumber, Popconfirm, Tooltip } from 'antdv-next';
import { Icon } from '@jeesite/core/components/Icon';
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
import type { EffectIndicatorDef } from '@jeesite/ifco/api/ifco/effect-fill';
import { cellValue } from '@jeesite/ifco/api/ifco/effect-fill';
import { handleCellNav } from '../shared/cell-nav';
import { EFFECT_AUTO_SUM, syncEffectAutoSums } from './fill-validation';
import type { FillEditing } from './fill-editing';

/** 表格行(指标) */
export type FillRow = {
  key: string;
  kind: EffectIndicatorDef['kind'];
  name: string;
  unit: string;
  code: string;
};

/** 未填内容与 0 一律置空(不补斜杠、不补 0);双值行「数 | 面积」竖线留空隙 */
export function renderDisplay(value: number | string | [number, number] | undefined) {
  if (Array.isArray(value)) {
    const format = (v: number) => (v === 0 ? '' : String(v));
    // 竖线前后各留空隙;用不间断空格(U+00A0)防止 HTML 空白折叠
    const gap = '\u00A0\u00A0';
    return `${format(value[0])}${gap}|${gap}${format(value[1])}`;
  }
  if (value === undefined || value === '' || value === 0) return '';
  return typeof value === 'number' ? String(value) : value;
}

export type CellRendererDeps = {
  quarter: Ref<string>;
  unitEditable: ComputedRef<boolean>;
  editing: FillEditing;
};

export function createCellRenderers(deps: CellRendererDeps) {
  const { quarter, unitEditable, editing } = deps;
  const { editingColKey, dirtyCols, toggleEdit, handleDeleteColumn } = editing;

  function setCellValue(col: ProjectColumn, indicatorKey: string, value: number | string | undefined) {
    if (value === undefined || value === '') {
      delete col.values[indicatorKey];
    } else {
      col.values[indicatorKey] = value;
    }
    syncEffectAutoSums(col);
    dirtyCols.set(col.key, col);
  }

  /** 双值格写入:按位落到二元组 */
  function setDualCellValue(col: ProjectColumn, indicatorKey: string, slot: 0 | 1, value: number | undefined) {
    const current = col.values[indicatorKey];
    const tuple: [number, number] = Array.isArray(current) ? [...current] : [0, 0];
    tuple[slot] = value ?? 0;
    col.values[indicatorKey] = tuple;
    syncEffectAutoSums(col);
    dirtyCols.set(col.key, col);
  }

  /** 单元格:编辑列内的填报行渲染输入控件(双值行两个框中间固定竖线),其余为只读文本。
   *  自动计算行(233=234+235+236)编辑态也只读展示,不提供输入;输入一律整数(precision 0) */
  function renderFillCell(item: EffectIndicatorDef, col: ProjectColumn) {
    if (editingColKey.value === col.key && item.kind === 'fill' && !EFFECT_AUTO_SUM[item.key]) {
      const value = col.values[item.key];
      if (item.dual) {
        const tuple: [number, number] = Array.isArray(value) ? value : [0, 0];
        // 双值行的两个输入框等分:InputNumber 自身宽度样式会压过普通工具类,
        // UnoCSS 加 ! 前缀 = important,压过组件默认样式后 flex 等分才生效
        const dualInput = (slot: 0 | 1, placeholder: string) =>
          h(InputNumber, {
            size: 'small',
            class: '!flex-1 !min-w-0',
            value: tuple[slot] || undefined,
            min: 0,
            precision: 0,
            controls: false,
            placeholder,
            'onUpdate:value': (value2: number | string | null) =>
              setDualCellValue(col, item.key, slot, typeof value2 === 'number' ? value2 : undefined),
          });
        return h('div', { class: 'flex w-full items-center gap-1', onKeydownCapture: handleCellNav }, [
          dualInput(0, '数'),
          h('span', { class: 'shrink-0 text-gray-400' }, '|'),
          dualInput(1, '面积'),
        ]);
      }
      return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
        h(InputNumber, {
          size: 'small',
          class: 'w-full',
          value: typeof value === 'number' ? value : undefined,
          min: 0,
          precision: 0,
          controls: false,
          placeholder: '请输入',
          'onUpdate:value': (value2: number | string | null) => setCellValue(col, item.key, value2 ?? undefined),
        }),
      ]);
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon(点击即存该列);只读单位不渲染图标 */
  function renderProjectHeader(col: ProjectColumn) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      unitEditable.value
        ? h('span', { class: 'flex shrink-0 items-center gap-1' }, [
            h(Tooltip, { title: editing ? '完成并保存本列' : '编辑本列' }, () =>
              h(Icon, {
                icon: editing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
                class: 'effect-fill-icon-edit',
                onClick: () => toggleEdit(col),
              }),
            ),
            deletable
              ? h(
                  Popconfirm,
                  { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) },
                  () =>
                    h(Icon, {
                      icon: 'ant-design:delete-outlined',
                      class: 'effect-fill-icon',
                    }),
                )
              : null,
          ])
        : null,
    ]);
  }

  /** 节标题行(一、～八、)加粗;不落数值 */
  function sumRowOnCell(record: FillRow) {
    return {
      className: record.kind === 'section' ? 'effect-fill-row-section' : undefined,
    };
  }

  return { setCellValue, setDualCellValue, renderFillCell, renderProjectHeader, sumRowOnCell };
}

export type CellRenderers = ReturnType<typeof createCellRenderers>;
