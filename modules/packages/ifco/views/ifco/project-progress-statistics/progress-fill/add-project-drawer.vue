<!--
  ifco —— 项目进展填报「新增项目」抽屉（BasicDrawer + BasicForm，同专家库/项目库表单抽屉模式）

  表单项 = 项目名称 + 表格指标行全览（行序与表格一致）：可录入行（fill/text）出输入控件——
  数值行 InputNumber、来源说明行 Input、本年新开工（r3）Switch；自动汇总行（sum）只读实时
  预览（构成行求和，口径同表格 cellValue/renderDisplay，填了构成行即联动出数）；项目数行
  （count）只读显示新增后该类目项目总数（现有 + 1）。新增就业岗位（r23）2026-09-11 起为
  普通填报行（fill），随 fill 分支自动入表单。标签 = 指标名称（保留全角空格层级缩进），计量单位｜代码以
  subLabel 浅色后缀显示。指标字典随页面加载就绪，抽屉打开时 resetSchema 组装。
  保存：validate → validateProgressColumn（与表格内保存同一份前端校验）→ saveProgressProject
  立即落库；成功后以返回的 projectId 为列 key emit('success')，由 list.vue 追加到表格最右。
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
<script lang="ts" setup name="ViewsIfcoProgressFillAddProjectDrawer">
  import { h, ref } from 'vue';
  import { match } from 'ts-pattern';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { BasicForm, useForm, type FormSchema, type RenderCallbackParams } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { IndicatorDef, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
  import { INDICATORS, cellValue, saveProgressProject } from '@jeesite/ifco/api/ifco/progress-fill';
  import { NEW_START_KEY, renderDisplay } from './cell-renderers';
  import { validateProgressColumn } from './fill-validation';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  // 横向表单（默认 horizontal）：标签左、控件右，一行一项（span 24）
  const [registerForm, { resetFields, resetSchema, validate }] = useForm({
    labelWidth: 480,
    baseColProps: { span: 24 },
    schemas: [],
  });

  /** 当前类目已有项目数（打开时由 list.vue 传入；项目数行显示新增后的总数） */
  const tabProjectCount = ref(0);

  /** 从表单模型收集可录入值（fill/text、去空、r3 转 0/1）——提交落库与汇总行实时预览共用 */
  function collectValues(model: Recordable): Record<string, number | string> {
    const values: Record<string, number | string> = {};
    for (const item of INDICATORS) {
      if (item.kind !== 'fill' && item.kind !== 'text') continue;
      if (item.key === NEW_START_KEY) {
        values[item.key] = model[item.key] === true ? 1 : 0;
        continue;
      }
      const value = model[item.key];
      if (value !== undefined && value !== null && value !== '') values[item.key] = value;
    }
    return values;
  }

  /** 表单当前值的列预览形态（供 cellValue 按表格同款口径取汇总） */
  function previewColumn(model: Recordable): ProjectColumn {
    return { key: 'preview', name: '', imported: false, values: collectValues(model) };
  }

  /** 单条指标行 → 表单项：fill/text 出控件，sum/count 只读预览，total 不入表单 */
  function buildIndicatorSchema(item: IndicatorDef): FormSchema | undefined {
    const base = {
      label: item.name,
      subLabel: [item.unit, item.code].filter(Boolean).join('｜') || undefined,
      field: item.key,
    };
    return match(item.kind)
      .with('total', () => undefined)
      .with('sum', () => {
        // 自动汇总行：按构成行实时求和（口径同表格），只读不填值
        const schema: FormSchema = {
          ...base,
          component: 'Input',
          render: ({ model }: RenderCallbackParams<Recordable>) =>
            h('span', { class: 'font-semibold' }, renderDisplay(cellValue(item, previewColumn(model)))),
        };
        return schema;
      })
      .with('count', () => {
        // 项目数自动行：新增后该类目项目总数（现有 + 本次 1）
        const schema: FormSchema = {
          ...base,
          component: 'Input',
          render: () =>
            h('span', { class: 'font-semibold' }, [
              String(tabProjectCount.value + 1),
              h('span', { class: 'ml-2 text-xs font-normal text-gray-400' }, '新增后该类目项目总数'),
            ]),
        };
        return schema;
      })
      .with('text', () => {
        const schema: FormSchema = {
          ...base,
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入来源说明' },
        };
        return schema;
      })
      .with('fill', () => {
        // 本年新开工（r3）：开关型指标（0/1），同表格编辑态；其余数值行 InputNumber
        const schema: FormSchema =
          item.key === NEW_START_KEY
            ? {
                ...base,
                component: 'Switch',
                componentProps: { checkedChildren: '是新开工', unCheckedChildren: '非新开工' },
              }
            : {
                ...base,
                component: 'InputNumber',
                componentProps: {
                  min: 0,
                  allowClear: true,
                  controls: true,
                  placeholder: '请输入',
                  style: 'width: 100%',
                },
              };
        return schema;
      })
      .exhaustive();
  }

  /** 表单项：项目名称 + 指标行全览（行序与表格一致） */
  function buildSchemas(): FormSchema[] {
    const nameItem: FormSchema = {
      label: '项目名称',
      field: 'name',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入项目名称' },
      rules: [{ required: true, message: '请输入项目名称' }],
    };
    const indicatorItems = INDICATORS.map(buildIndicatorSchema).filter(
      (schema): schema is FormSchema => schema !== undefined,
    );
    return [nameItem, ...indicatorItems];
  }

  /** 打开时由 list.vue 传入的落库参数 */
  const saveParams = ref<{ year: number; quarter: string; unit: string; leafKey: string }>();

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    saveParams.value = data;
    tabProjectCount.value = Number(data?.tabProjectCount ?? 0);
    setDrawerProps({ loading: true });
    try {
      await resetSchema(buildSchemas());
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
    const name = String(data.name ?? '').trim();
    if (!name) {
      showMessage('请输入项目名称');
      return;
    }
    if (!params) {
      showMessage('缺少填报周期信息，请关闭后重新打开');
      return;
    }
    const values = collectValues(data);
    const error = validateProgressColumn({ key: 'add', name, imported: false, values });
    if (error) {
      showMessage(error);
      return;
    }
    setDrawerProps({ confirmLoading: true });
    try {
      const res = await saveProgressProject({
        year: params.year,
        quarter: params.quarter,
        unit: params.unit,
        leafKey: params.leafKey,
        project: { name, values },
      });
      const savedCol: ProjectColumn = {
        key: res.projectId,
        id: res.projectId,
        name,
        imported: false,
        values,
      };
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
  /* 长指标名允许在标签列内换行（等价 antd Form 的 labelWrap，BasicForm 未透传该 prop，规则同 .ant-form-item-label-wrap）；
     标签左对齐（横向表单默认右对齐，长指标名右贴输入框不易读） */
  :deep(.ant-form-item-label) {
    overflow: unset;
    line-height: var(--ant-line-height);
    white-space: unset;
    text-align: left;
  }
</style>
