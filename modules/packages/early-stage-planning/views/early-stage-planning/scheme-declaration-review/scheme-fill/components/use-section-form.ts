/*
  填报页区块表单统一装配

  各区块组件（section-*.vue，附件区块除外）的公共逻辑：
   - useForm 注册 BasicForm（schemas / labelWidth / disabled 等由调用方传入）；
   - 挂载后回填初值：data 传父级的记录快照（整记录即可，setFieldsValue
     按 schema 字段过滤，区块间字段互不干扰）；
   - 返回 registerForm 与 exposed（validate / getFieldsValue / exportRows），
     区块 SFC 内 `defineExpose(exposed)` 一次暴露，供 form.vue 保存校验、
     取值与 Excel 导出按同一接口遍历各区块。

  注意：本文件是普通 .ts（无 SFC 编译器宏），不能直接调 defineExpose，
  必须由区块 SFC 暴露；内部依赖 onMounted，须在 <script setup> 顶层同步调用。
*/
import type { FormProps, FormSchema } from '@jeesite/core/components/Form';
import { onMounted } from 'vue';
import { useForm } from '@jeesite/core/components/Form';

/** 区块对外暴露的统一接口（自定义 slot 字段区块手写同构实现） */
export type SectionFormExposed = {
  /** 校验本区块，不通过时 reject（form.vue 捕获后定位到问题区块） */
  validate: () => Promise<any>;
  /** 取本区块表单值 */
  getFieldsValue: () => Recordable;
  /** 导出用：[字段名, 值] 二元组列表（数组转「、」拼接，空值转空串） */
  exportRows: () => [string, string][];
  /** 静默写值（不触发校验）：供 schema slot 字段把自定义控件的值同步回 formModel */
  setFieldsValueSilently: (values: Recordable) => Promise<void>;
};

export function useSectionForm(options: FormProps & { data?: Recordable }) {
  const { data, ...formOptions } = options;
  const [registerForm, { setFieldsValue, validate, getFieldsValue }] = useForm(formOptions);

  // 表单随 v-if 整体挂载（每次进入重新挂载），挂载后一次性回填即可
  onMounted(() => setFieldsValue(data ?? {}));

  function exportRows(): [string, string][] {
    const values = getFieldsValue();
    return (formOptions.schemas ?? [])
      .filter((s): s is FormSchema & { field: string } => !!s.field)
      .map((s) => [s.label as string, formatValue(values[s.field])]);
  }

  /**
   * 必填校验：`validate` 恒为真实校验（各区块 schema 里的 rules 全部生效），
   * **由调用方决定是否执行** —— 填报表单：暂存（草稿）不校验、提交逐区块校验
   * （见 form-reviewing.vue 的 handleSave('draft'|'submit')）；查看/导出路径不调用 validate。
   */
  const exposed: SectionFormExposed = {
    validate,
    getFieldsValue,
    exportRows,
    setFieldsValueSilently: setFieldsValue,
  };

  return { registerForm, exposed };
}

/** 导出值格式化：数组转「、」拼接（文件对象取 name），null/undefined 转空串，其余 String */
function formatValue(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v))
    return v
      .filter((x) => x != null && x !== '')
      .map((x) => (x && typeof x === 'object' && 'name' in x ? String((x as { name: unknown }).name) : String(x)))
      .join('、');
  return String(v);
}
