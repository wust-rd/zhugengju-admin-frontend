<!--
  市住更局 —— 指标项结果 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/form.vue:
   - BasicDrawer + useDrawerInner + BasicForm(FormSchema);
   - 查看模式:表单 disabled + 抽屉隐藏底部按钮。
  当前后端尚未介入:保存仅做表单校验后关闭抽屉,不发起任何接口请求。
-->
<template>
  <BasicDrawer
    ref="drawerRef"
    v-bind="$attrs"
    :show-footer="showFooter"
    width="50%"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorResultForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { IndicatorResult } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<IndicatorResult & { isNewRecord?: boolean }>({} as IndicatorResult & { isNewRecord?: boolean });
  const showFooter = ref(true);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标项结果' : record.value.isNewRecord ? '新增指标项结果' : '编辑指标项结果',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '体检年份',
      field: 'year',
      component: 'Select',
      componentProps: { options: YEAR_OPTIONS, allowClear: true },
      rules: [{ type: 'string', required: true, message: '请选择体检年份' }],
    },
    {
      label: '指标体系名称',
      field: 'indicatorName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入指标体系名称' }],
    },
    {
      label: '指标数量（项）',
      field: 'indicatorCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
      rules: [{ required: true, message: '请输入指标数量' }],
    },
    {
      label: '已填报结果的指标数量（项）',
      field: 'filledCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '未填报结果的指标数量（项）',
      field: 'unfilledCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '预警指标数量（项）',
      field: 'warningCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3 },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 180,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as IndicatorResult;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      year: record.value.year ?? YEAR_OPTIONS[0].value,
      indicatorName: record.value.indicatorName ?? '',
      indicatorCount: record.value.indicatorCount ?? 0,
      filledCount: record.value.filledCount ?? 0,
      unfilledCount: record.value.unfilledCount ?? 0,
      warningCount: record.value.warningCount ?? 0,
      remarks: record.value.remarks ?? '',
    });
    if (isView.value) {
      await setProps({ disabled: true });
      showFooter.value = false;
    } else {
      await setProps({ disabled: false });
      showFooter.value = true;
    }
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    // TODO: 后端接入后在此调用保存接口
    setTimeout(closeDrawer);
    emit('success', data);
  }
</script>
