<!--
  市住更局 —— 体检成果分析明细 新增/编辑/查看 表单抽屉

  组件格式对齐 achievement/form.vue:
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
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { AchievementAnalysis } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import { ACHIEVEMENT_DEGREE } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<AchievementAnalysis & { isNewRecord?: boolean }>(
    {} as AchievementAnalysis & {
      isNewRecord?: boolean;
    },
  );

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看分析明细' : record.value.isNewRecord ? '新增分析明细' : '编辑分析明细',
  }));

  /** 程度范围下拉选项 */
  const DEGREE_OPTIONS = Object.values(ACHIEVEMENT_DEGREE).map((item) => ({ label: item, value: item }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '一级维度',
      field: 'dim1',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入一级维度' }],
    },
    {
      label: '程度范围',
      field: 'degree',
      component: 'Select',
      componentProps: { options: DEGREE_OPTIONS, allowClear: true },
      rules: [{ required: true, message: '请选择程度范围' }],
    },
    {
      label: '分析描述',
      field: 'analysis',
      component: 'InputTextArea',
      componentProps: { maxlength: 1000, rows: 4, showCount: true },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入分析描述' }],
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
    record.value = (data || {}) as AchievementAnalysis;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      dim1: record.value.dim1 ?? '',
      degree: record.value.degree ?? '',
      analysis: record.value.analysis ?? '',
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
