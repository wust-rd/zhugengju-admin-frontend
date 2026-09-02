<!--
  市住更局 —— 满意度调查问题 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/_id/form.vue:
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
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { SurveyQuestion } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<SurveyQuestion & { isNewRecord?: boolean }>({} as SurveyQuestion & { isNewRecord?: boolean });
  const showFooter = ref(true);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看调查问题' : record.value.isNewRecord ? '新增调查问题' : '编辑调查问题',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '调查问题',
      field: 'questionName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入调查问题' }],
    },
    {
      label: '面向对象',
      field: 'target',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '满意度占比',
      field: 'rateInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '非常满意(%)',
      field: 'verySatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '满意(%)',
      field: 'satisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '一般(%)',
      field: 'neutral',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '不满意(%)',
      field: 'dissatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
    },
    {
      label: '非常不满意(%)',
      field: 'veryDissatisfied',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, style: 'width: 100%' },
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
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as SurveyQuestion;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      questionName: record.value.questionName ?? '',
      target: record.value.target ?? '',
      verySatisfied: record.value.verySatisfied ?? 0,
      satisfied: record.value.satisfied ?? 0,
      neutral: record.value.neutral ?? 0,
      dissatisfied: record.value.dissatisfied ?? 0,
      veryDissatisfied: record.value.veryDissatisfied ?? 0,
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
    // TODO: 后端接入后在此调用保存接口(可校验五档占比合计 100)
    setTimeout(closeDrawer);
    emit('success', data);
  }
</script>
