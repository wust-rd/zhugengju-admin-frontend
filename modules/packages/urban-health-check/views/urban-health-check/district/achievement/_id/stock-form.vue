<!--
  市住更局 —— 区级体检成果储备项目 新增/编辑/查看 抽屉

  字段按后端：项目名称/改造类型/投资额（万元）/建设内容
  （原型画的项目维度/措施/方向/时序/责任部门后端表不存在）。
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
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementStockForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { DistrictAchievementStock } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    districtAchievementStockSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    readOnly: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<DistrictAchievementStock & { isNewRecord?: boolean }>(
    {} as DistrictAchievementStock & { isNewRecord?: boolean },
  );

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: `${isView.value ? '查看' : record.value.isNewRecord ? '新增' : '编辑'} · 储备项目`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '项目名称',
      field: 'projectName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入项目名称' }],
    },
    {
      label: '改造类型',
      field: 'reformType',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '如：拆除重建 / 整治提升 / 功能改造',
    },
    {
      label: '投资额（万元）',
      field: 'investAmount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
    {
      label: '建设内容',
      field: 'buildContent',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 4 },
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
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    isView.value = !!data?.isView;
    record.value = (data || {}) as DistrictAchievementStock;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    await setFieldsValue({
      projectName: record.value.projectName ?? '',
      reformType: record.value.reformType ?? '',
      investAmount: record.value.investAmount ?? undefined,
      buildContent: record.value.buildContent ?? '',
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
      await districtAchievementStockSave({
        id: record.value.id,
        catalogId: record.value.catalogId!,
        projectName: data.projectName,
        reformType: data.reformType ?? null,
        investAmount: data.investAmount ?? null,
        buildContent: data.buildContent ?? null,
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
