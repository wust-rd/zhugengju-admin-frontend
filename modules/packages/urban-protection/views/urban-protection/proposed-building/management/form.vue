<!--
  市住更局 —— 名城保护 · 拟优保建筑表单（新增 / 编辑抽屉）

  WHFW_OLDJZ（经 /a/urban-protection/proposed/* 接口）仅 6 列，可编辑字段：
  所在行政区 / 建筑名称 / 建筑坐落 / 纳入巡查（ISPATROL，应巡查量基数）。
  字段对齐老系统 AddPlanYouBao（新增/编辑同构）：所在行政区(下拉,必选) / 建筑名称(必选) /
  建筑坐落(必选) / 纳入巡查(必选,默认是)。编辑时先回填后掀开（防闪烁）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    width="50%"
    force-render
    :showFooter="true"
    okText="确认"
    cancelText="取消"
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
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingManagementForm">
  import { computed, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    saveProposed,
    fetchProposedDict,
    ProposedRow,
  } from '@jeesite/urban-protection/api/urban-protection/proposed';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isNew = ref(true);
  const editId = ref('');
  const saving = ref(false);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:home-outlined',
    value: isNew.value ? '新增拟优保建筑' : '编辑拟优保建筑',
  }));

  /** 区下拉（WHFW_OLDJZ 库内实际区名） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchProposedDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  const inputFormSchemas: FormSchema[] = [
    {
      label: '所在行政区',
      field: 'xzqName',
      component: 'Select',
      componentProps: { options: districtOptions, allowClear: true, placeholder: '请选择' },
      rules: [{ required: true, message: '请选择所在行政区' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑名称',
      field: 'jzOldName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入建筑名称' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑坐落',
      field: 'jzLoccation',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入建筑坐落' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      // 纳入巡查（ISPATROL）：拟优保巡查报表的"应巡查量"只统计已纳入巡查的建筑
      label: '纳入巡查',
      field: 'isPatrol',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        placeholder: '请选择',
      },
      defaultValue: true,
      rules: [{ required: true, message: '请选择是否纳入巡查' }],
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, resetFields, validate }] = useForm({
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { md: 12, lg: 12 },
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: Recordable) => {
    // 先回填后掀开：动画期间零翻转
    setDrawerProps({ open: false, confirmLoading: false });
    await resetFields();
    isNew.value = !!data._isNew;
    editId.value = isNew.value ? '' : String(data.id ?? '');
    if (!isNew.value) {
      const row = data as ProposedRow;
      await setFieldsValue({
        jzOldName: row.jzOldName,
        xzqName: row.xzqName || undefined,
        jzLoccation: row.jzLoccation,
        isPatrol: row.isPatrol,
      });
    }
    setDrawerProps({ open: true });
  });

  async function handleSubmit() {
    try {
      if (saving.value) return;
      const values = await validate();
      saving.value = true;
      setDrawerProps({ confirmLoading: true });
      await saveProposed({
        ...values,
        id: isNew.value ? undefined : editId.value,
      } as Partial<ProposedRow>);
      showMessage(isNew.value ? '新增成功' : '保存成功');
      closeDrawer();
      emit('success');
    } catch (e) {
      if (e instanceof Error && e.message) {
        showMessage(e.message, 'error');
      }
    } finally {
      saving.value = false;
      setDrawerProps({ confirmLoading: false });
    }
  }
</script>
