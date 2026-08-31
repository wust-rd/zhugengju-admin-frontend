<!--
  市住更局 —— 体检指标体系管理（新增 / 编辑 / 查看 表单抽屉）

  组件格式对齐 packages/core/views/sys/area/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema），而非 Modal；
   - 通过 defineEmits(['register', 'success']) 与父级 useDrawer 联动；
   - 查看模式：表单 disabled + 抽屉隐藏底部按钮。
  当前后端尚未介入：保存仅做表单校验后关闭抽屉，不发起任何接口请求。
-->
<template>
  <BasicDrawer
    ref="drawerRef"
    v-bind="$attrs"
    :show-footer="showFooter"
    width="70%"
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
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorSystemForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { IndicatorSystem } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    ENABLED_STATUS,
    SUBMIT_STATUS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<IndicatorSystem & { isNewRecord?: boolean }>({} as IndicatorSystem & { isNewRecord?: boolean });
  const showFooter = ref(true);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标体系' : record.value.isNewRecord ? '新增指标体系' : '编辑指标体系',
  }));

  /** 年份下拉选项（体检年份：近 5 年） */
  const YEAR_OPTIONS = ['2026', '2025', '2024', '2023', '2022'].map((year) => ({
    label: `${year} 年`,
    value: year,
  }));

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
      label: '填报时间',
      field: 'reportDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      rules: [{ type: 'string', required: true, message: '请选择填报时间' }],
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
      label: '填报单位',
      field: 'reportUnit',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入填报单位' }],
    },
    {
      label: '其它信息',
      field: 'otherInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '启用状态',
      field: 'enabled',
      component: 'Switch',
      componentProps: {
        checkedChildren: '启用',
        unCheckedChildren: '停用',
        checkedValue: '1',
        unCheckedValue: '0',
      },
    },
    {
      label: '提交状态',
      field: 'submitStatus',
      component: 'Select',
      componentProps: { options: SUBMIT_OPTIONS },
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
    labelWidth: 160,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as IndicatorSystem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      year: record.value.year ?? '2026',
      indicatorName: record.value.indicatorName ?? '',
      indicatorCount: record.value.indicatorCount ?? 0,
      reportUnit: record.value.reportUnit ?? '市住更局',
      reportDate: record.value.reportDate ?? '',
      enabled: record.value.enabled ?? ENABLED_STATUS.ENABLED,
      submitStatus: record.value.submitStatus ?? SUBMIT_STATUS.PENDING,
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
