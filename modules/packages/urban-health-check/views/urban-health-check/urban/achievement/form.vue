<!--
  市住更局 —— 体检成果 新增/编辑/查看 表单抽屉

  组件格式对齐 satisfaction-survey/form.vue:
   - BasicDrawer + useDrawerInner + BasicForm(FormSchema);
   - 查看模式：表单 disabled + 抽屉隐藏底部按钮（抽屉级 showFooter 由父级打开前设置，
     本组件加 force-render；原因见 indicator-system/form.vue 头注释）。
  当前后端尚未介入：保存仅做表单校验后关闭抽屉，不发起任何接口请求。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Achievement } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<Achievement & { isNewRecord?: boolean }>({} as Achievement & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看体检成果' : record.value.isNewRecord ? '新增体检成果' : '编辑体检成果',
  }));

  /** 提交状态下拉选项 */
  const SUBMIT_OPTIONS = [
    { label: '待提交', value: SUBMIT_STATUS.PENDING },
    { label: '已提交', value: SUBMIT_STATUS.SUBMITTED },
  ];

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
      label: '体检成果目录',
      field: 'catalog',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入体检成果目录' }],
    },
    {
      label: '填报时间',
      field: 'reportDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      rules: [{ type: 'string', required: true, message: '请选择填报时间' }],
    },
    {
      label: '提交状态',
      field: 'submitStatus',
      component: 'Select',
      componentProps: { options: SUBMIT_OPTIONS },
      defaultValue: SUBMIT_STATUS.PENDING,
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
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Achievement;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      year: record.value.year ?? YEAR_OPTIONS[0].value,
      catalog: record.value.catalog ?? '',
      reportDate: record.value.reportDate ?? '',
      submitStatus: record.value.submitStatus ?? SUBMIT_STATUS.PENDING,
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: isView.value });
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
