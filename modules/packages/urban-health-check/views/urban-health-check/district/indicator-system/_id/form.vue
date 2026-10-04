<!--
  市住更局 —— 区级指标项 编辑/查看 表单抽屉（原型图3 行操作）

  仅用于可选指标项（isRequired=0；必选项在列表上仅查看且后端禁止编辑）。
  体检维度/体检项/序号随标准库带入只读回显；可维护：指标项名称/指标单位/
  数据来源/责任部门/指标解释/备注。保存走 districtItemSave。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="40%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorSystemIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type {
    DistrictItem,
    DistrictSet,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    districtItemSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 体系已提交/查看态时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
    /** 所属体系信息（标题展示用） */
    setInfo: { type: Object as () => DistrictSet | undefined, default: undefined },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<DistrictItem & { isNewRecord?: boolean }>({} as DistrictItem & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value
      ? `查看指标项 · ${record.value.itemName ?? ''}`
      : `编辑指标项 · ${record.value.itemName ?? ''}`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '体检维度',
      field: 'firstDimension',
      component: 'Input',
      dynamicDisabled: () => true,
      helpMessage: '随标准库带入，不可修改',
    },
    {
      label: '体检项',
      field: 'checkItemName',
      component: 'Input',
      dynamicDisabled: () => true,
      helpMessage: '随标准库带入，不可修改',
    },
    {
      label: '指标项名称',
      field: 'itemName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入指标项名称' }],
    },
    {
      label: '指标单位',
      field: 'itemUnit',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      componentProps: { maxlength: 100 },
    },
    {
      label: '责任部门',
      field: 'responsibilityDept',
      component: 'Input',
      componentProps: { maxlength: 100 },
    },
    {
      label: '指标解释',
      field: 'itemExplain',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 4 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 2 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 130,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // resetFields 可能因表单未挂载不 resolve，超时兜底（历史坑）
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    isView.value = !!data?.isView;
    record.value = (data || {}) as DistrictItem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    await setFieldsValue({
      firstDimension: record.value.firstDimension ?? '',
      checkItemName: record.value.checkItemName ?? '',
      itemName: record.value.itemName ?? '',
      itemUnit: record.value.itemUnit ?? '',
      dataSource: record.value.dataSource ?? '',
      responsibilityDept: record.value.responsibilityDept ?? '',
      itemExplain: record.value.itemExplain ?? '',
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: isView.value || props.readOnly });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value || props.readOnly) {
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
    setDrawerProps({ loading: true });
    try {
      await districtItemSave({
        id: record.value.id,
        setId: record.value.setId!,
        firstDimension: record.value.firstDimension,
        checkItemName: record.value.checkItemName,
        itemName: data.itemName,
        itemUnit: data.itemUnit,
        dataSource: data.dataSource,
        responsibilityDept: data.responsibilityDept,
        itemExplain: data.itemExplain,
        remarks: data.remarks,
      });
      showMessage('保存成功');
      setTimeout(closeDrawer);
      emit('success');
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
