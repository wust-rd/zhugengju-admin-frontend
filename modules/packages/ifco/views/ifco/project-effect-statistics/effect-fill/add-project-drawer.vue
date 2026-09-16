<!--
  ifco —— 项目成效填报「新增项目」抽屉（同进展域 Drawer 模式，单步表单）

  成效域指标分八个大类（一、～八、），一个项目只填报其中一个类别：
  表单第一项 = 填报类别下拉（Select，八个节标题去「一、」序号前缀），选中后下方
  展示该类别下的填报行（项目名称必填 + 数值 InputNumber；双值行「数|面积」拆
  两个输入框，提交时合回二元组）。切换类别时若已填写内容，弹确认提示会丢失。
  保存：validate → syncEffectAutoSums + validateEffectColumn（与表格同款校验）
  → saveEffectProject 立即落库（双值 a/b 拆键由 API 层处理）；成功后以返回的
  projectId 为列 key emit('success')，由 list.vue 追加到表格最右。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    title="新增项目"
    width="70%"
    show-footer
    ok-text="保存"
    cancel-text="取消"
    force-render
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoEffectFillAddProjectDrawer">
  import { computed, h, ref } from 'vue';
  import { InputNumber, Modal } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { BasicForm, useForm, type FormSchema } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { EffectIndicatorDef } from '@jeesite/ifco/api/ifco/effect-fill';
  import { EFFECT_INDICATORS, saveEffectProject } from '@jeesite/ifco/api/ifco/effect-fill';
  import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
  import { validateEffectColumn, syncEffectAutoSums } from './fill-validation';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  const [registerForm, { resetFields, resetSchema, validate, getFieldsValue, setFieldsValue }] = useForm({
    labelWidth: 500,
    baseColProps: { span: 24 },
    schemas: [],
  });

  /** 当前所选填报类别（节标题 key，如 s1） */
  const selectedSection = ref<string>();

  /** 八个大类（节标题行，去「一、」序号前缀）；computed——字典异步就绪后自动有值 */
  const sectionOptions = computed(() =>
    EFFECT_INDICATORS.filter((item) => item.kind === 'section').map((item) => ({
      label: item.name.replace(/^[一二三四五六七八九十]+、/, '').trim(),
      value: item.key,
    })),
  );

  /** 所选大类下的填报行（节行之后到下一节行之前） */
  function sectionFillItems(sectionKey: string): EffectIndicatorDef[] {
    const items = EFFECT_INDICATORS;
    const start = items.findIndex((item) => item.key === sectionKey);
    if (start < 0) return [];
    const rows: EffectIndicatorDef[] = [];
    for (let i = start + 1; i < items.length && items[i].kind !== 'section'; i += 1) {
      rows.push(items[i]);
    }
    return rows;
  }

  /** 填报行 → 表单项：数值 InputNumber；双值行拆「数 / 面积」两个输入框 */
  function sectionItemSchemas(sectionKey: string): FormSchema[] {
    const normalItems: FormSchema[] = [];
    const dualItems: FormSchema[][] = [];
    for (const item of sectionFillItems(sectionKey)) {
      const base = {
        label: item.name,
        subLabel: [item.unit, item.code].filter(Boolean).join('｜') || undefined,
        field: item.key,
      };
      const numberProps = { min: 0, allowClear: true, controls: true, placeholder: '请输入', style: 'width: 100%' };
      if (item.dual) {
        // 双值行（单位形如「个|平方米」）：一个表单项内并排两个输入框（数 | 面积），同表格编辑态；
        // 隐藏字段由 render 写入 model 的 __0/__1，提交时合回二元组
        dualItems.push([
          {
            ...base,
            component: 'InputNumber',
            render: ({ model }: { model: Recordable }) =>
              h('div', { class: 'flex w-full items-center gap-2' }, [
                h(InputNumber, {
                  class: 'min-w-0 flex-1',
                  value: model[`${item.key}__0`],
                  min: 0,
                  controls: true,
                  placeholder: '数',
                  'onUpdate:value': (v: number | string | null) => (model[`${item.key}__0`] = v ?? undefined),
                }),
                h('span', { class: 'shrink-0 text-gray-400' }, '|'),
                h(InputNumber, {
                  class: 'min-w-0 flex-1',
                  value: model[`${item.key}__1`],
                  min: 0,
                  controls: true,
                  placeholder: '面积',
                  'onUpdate:value': (v: number | string | null) => (model[`${item.key}__1`] = v ?? undefined),
                }),
              ]),
          },
        ]);
      } else {
        normalItems.push({ ...base, component: 'InputNumber', componentProps: numberProps });
      }
    }
    return [...normalItems, ...dualItems.flat()];
  }

  /** 类别选择项（两个时机共用：抽屉打开的初始表单 / 切换类别后的重建表单） */
  function sectionSchema(): FormSchema {
    return {
      label: '填报类别',
      field: 'sectionKey',
      component: 'Select',
      componentProps: {
        options: sectionOptions.value,
        placeholder: '请选择本项目所属的填报类别（只能选择一个）',
        onChange: (value: string) => handleSectionChange(value),
      },
    };
  }

  /** 按新类别重建表单：类别项 + 项目名称（保留已填值）+ 该类别填报行；类别选中值回填 */
  async function rebuildForSection(sectionKey: string) {
    // 项目名称与类别无冲突，切换时保留不清空
    const nameKept = String(getFieldsValue().name ?? '').trim();
    selectedSection.value = sectionKey;
    const nameItem: FormSchema = {
      label: '项目名称',
      field: 'name',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入项目名称' },
      rules: [{ required: true, message: '请填写项目名称' }],
    };
    await resetSchema([nameItem, sectionSchema(), ...sectionItemSchemas(sectionKey)]);
    await setFieldsValue({ sectionKey, ...(nameKept ? { name: nameKept } : {}) });
  }

  /** 是否已填写指标项（切换类别前的丢失提示判断；项目名称跨类别保留，不计入） */
  function hasFilledContent(): boolean {
    return Object.keys(collectValues(getFieldsValue())).length > 0;
  }

  /** 切换类别：已填写内容先确认再丢弃重建；取消则恢复原选中值 */
  function handleSectionChange(value: string) {
    if (!value || value === selectedSection.value) return;
    if (selectedSection.value && hasFilledContent()) {
      Modal.confirm({
        title: '切换填报类别',
        content: '切换类别后已经填写的表单项会丢失，确定切换吗？',
        okText: '切换',
        cancelText: '继续填写',
        onOk: () => rebuildForSection(value),
        onCancel: () => rebuildForSection(selectedSection.value!),
      });
      return;
    }
    rebuildForSection(value);
  }

  /** 表单模型 → 前端列 values：普通行数值、双值行二元组（语义同表格 setDualCellValue） */
  function collectValues(model: Recordable): Record<string, number | string | [number, number]> {
    const values: Record<string, number | string | [number, number]> = {};
    for (const item of sectionFillItems(model.sectionKey ?? selectedSection.value ?? '')) {
      if (item.dual) {
        const slot0 = model[`${item.key}__0`];
        const slot1 = model[`${item.key}__1`];
        if (slot0 !== undefined && slot0 !== null && slot0 !== '') {
          values[item.key] = [Number(slot0), Number(slot1 ?? 0) || 0];
        }
        continue;
      }
      const value = model[item.key];
      if (value !== undefined && value !== null && value !== '') values[item.key] = value;
    }
    return values;
  }

  /** 打开时由 list.vue 传入的落库参数 */
  const saveParams = ref<{ year: number; quarter: string; unit: string }>();

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    saveParams.value = data;
    setDrawerProps({ loading: true });
    try {
      // 初始表单：仅类别选择 + 项目名称，选中类别后再展开该类别表单项
      const nameItem: FormSchema = {
        label: '项目名称',
        field: 'name',
        component: 'Input',
        componentProps: { allowClear: true, placeholder: '请输入项目名称' },
        rules: [{ required: true, message: '请填写项目名称' }],
      };
      selectedSection.value = undefined;
      await resetSchema([nameItem, sectionSchema()]);
      await resetFields();
    } finally {
      setDrawerProps({ loading: false });
    }
  });

  async function handleSubmit() {
    let data: Recordable;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const params = saveParams.value;
    // validate() 只返回 antd 注册字段的值；双值槽位（__0/__1）由 render 直写 formModel，
    // 须用 getFieldsValue()（直读 formModel）取全量值
    const model = getFieldsValue();
    const sectionKey = String(model.sectionKey ?? '');
    const name = String(model.name ?? '').trim();
    if (!sectionKey) {
      showMessage('请选择填报类别');
      return;
    }
    if (!name) {
      showMessage('请填写项目名称');
      return;
    }
    if (!params) {
      showMessage('缺少填报周期信息，请关闭后重新打开');
      return;
    }
    const values = collectValues(model);
    const previewCol: ProjectColumn = { key: 'add', name, imported: false, values };
    syncEffectAutoSums(previewCol);
    const error = validateEffectColumn(previewCol);
    if (error) {
      showMessage(error);
      return;
    }
    setDrawerProps({ confirmLoading: true });
    try {
      const res = await saveEffectProject({
        year: params.year,
        quarter: params.quarter,
        unit: params.unit,
        project: { name, values: previewCol.values },
      });
      const savedCol: ProjectColumn = { key: res.projectId, id: res.projectId, name, imported: false, values };
      emit('success', savedCol);
      showMessage('新增成功');
      closeDrawer();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '保存失败');
    } finally {
      setDrawerProps({ confirmLoading: false });
    }
  }
</script>

<style scoped>
  /* 长指标名允许在标签列内换行；标签左对齐（同进展域新增抽屉） */
  :deep(.ant-form-item-label) {
    overflow: unset;
    line-height: var(--ant-line-height);
    white-space: unset;
    text-align: left;
  }
</style>
