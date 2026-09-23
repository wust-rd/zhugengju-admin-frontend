<!--
  市住更局 —— 名城保护 · 优保推荐建筑表单（新增 / 编辑抽屉）

  字段对齐详情页六字段；照片列（PHOTOS）待文件上传通道接入后开放维护。
  提交时推荐时间转时间戳；编辑时先回填后掀开（防闪烁）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="40%" force-render @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRecommendationForm">
  import { computed, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchRecommendDetail,
    saveRecommend,
    RecommendRow,
  } from '@jeesite/urban-protection/api/urban-protection/recommend';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isNew = ref(true);
  const editId = ref('');
  const saving = ref(false);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:like-outlined',
    value: isNew.value ? '新增推荐建筑' : '编辑推荐建筑',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '建筑名称',
      field: 'jzmc',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入建筑名称' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑位置',
      field: 'jzwz',
      component: 'Input',
      componentProps: { maxlength: 300 },
      colProps: { md: 24, lg: 24 },
    },
    { label: '推荐人姓名', field: 'tjrxm', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '手机号码', field: 'sjhm', component: 'Input', componentProps: { maxlength: 20 } },
    {
      label: '推荐时间',
      field: 'tjsj',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      rules: [{ required: true, message: '请选择推荐时间' }],
    },
    {
      label: '推荐理由',
      field: 'tjly',
      component: 'InputTextArea',
      componentProps: { rows: 4, maxlength: 2000, showCount: true },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, resetFields, validate }] = useForm({
    labelWidth: 110,
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
      const row: RecommendRow = await fetchRecommendDetail(editId.value);
      await setFieldsValue({
        jzmc: row.jzmc,
        jzwz: row.jzwz,
        tjrxm: row.tjrxm,
        sjhm: row.sjhm,
        tjsj: row.tjsj ? String(row.tjsj).slice(0, 10) : undefined,
        tjly: row.tjly,
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
      await saveRecommend({
        ...values,
        id: isNew.value ? undefined : editId.value,
        // 推荐时间转时间戳，规避后端日期字符串解析歧义
        tjsj: values.tjsj ? new Date(values.tjsj as string).getTime() : undefined,
      } as Partial<RecommendRow>);
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
