<!--
  市住更局 —— 名城保护 · 拟优保建筑表单（新增 / 编辑抽屉）

  WHFW_OLDJZ 仅 6 列，可编辑字段：建筑名称 / 所在行政区 / 建筑坐落 / 是否纳入巡查。
  编辑时先回填后掀开（防闪烁）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="50%" force-render @register="registerDrawer" @ok="handleSubmit">
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
  import { saveProposed, ProposedRow } from '@jeesite/urban-protection/api/urban-protection/proposed';

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

  const inputFormSchemas: FormSchema[] = [
    {
      label: '建筑名称',
      field: 'jzOldName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入建筑名称' }],
      colProps: { md: 24, lg: 24 },
    },
    { label: '所在行政区', field: 'xzqName', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '建筑坐落', field: 'jzLoccation', component: 'Input', componentProps: { maxlength: 200 } },
    {
      label: '是否纳入巡查',
      field: 'isPatrol',
      component: 'Switch',
      helpMessage: '拟优保巡查报表的"应巡查量"只统计已纳入巡查的建筑',
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
        xzqName: row.xzqName,
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
