<!--
  市住更局 —— 文物清单管理（新增 / 编辑 / 查看 表单抽屉）

  组件格式对齐 urban-health-check 的 indicator-system/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema）；
   - 通过 defineEmits(['register', 'success']) 与父级 useDrawer 联动；
   - 查看模式：表单 disabled + 抽屉隐藏底部按钮。
  当前后端尚未介入：保存仅做表单校验后关闭抽屉，success 事件携带表单值
  （含 _isNew / id 标识）交父级落内存副本，不发起任何接口请求。

  注意：查看模式需要「禁用表单 + 隐藏底部」。showFooter（抽屉级）已改由 list.vue
  在打开前通过 setDrawerProps 设置，避免打开动画期间增删 footer DOM 打断面板；
  表单 disabled（表单级，在抽屉体内）在回调里设置即可。
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
<script lang="ts" setup name="ViewsUrbanProtectionUrbanRelicForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Relic } from '@jeesite/urban-protection/api/urban-protection/relic';
  import {
    RELIC_CATEGORIES,
    RELIC_DISTRICTS,
    RELIC_LEVELS,
    RELIC_SITUATIONS,
  } from '@jeesite/urban-protection/api/urban-protection/relic';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<Relic & { isNewRecord?: boolean }>({} as Relic & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:museum-outlined',
    value: isView.value ? '查看文物' : record.value.isNewRecord ? '新增文物' : '编辑文物',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '文物名称',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 100 },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入文物名称' }],
    },
    {
      label: '级别',
      field: 'level',
      component: 'Select',
      componentProps: { options: RELIC_LEVELS.map((l) => ({ label: l.label, value: l.value })), allowClear: true },
    },
    {
      label: '类别',
      field: 'category',
      component: 'Select',
      componentProps: { options: RELIC_CATEGORIES.map((c) => ({ label: c, value: c })), allowClear: true },
    },
    {
      label: '所属区域',
      field: 'district',
      component: 'Select',
      componentProps: { options: RELIC_DISTRICTS.map((d) => ({ label: d, value: d })), allowClear: true },
    },
    {
      label: '年代',
      field: 'era',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '如：1911年 / 清 / 商' },
    },
    {
      label: '公布年份',
      field: 'publicTime',
      component: 'InputNumber',
      componentProps: { min: 0, max: 2100, precision: 0, style: 'width: 100%' },
    },
    {
      label: '保存状况',
      field: 'situation',
      component: 'Select',
      componentProps: { options: RELIC_SITUATIONS.map((s) => ({ label: s, value: s })), allowClear: true },
    },
    {
      label: '文物编号',
      field: 'code',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '其它信息',
      field: 'otherInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '详细地址',
      field: 'address',
      component: 'Input',
      componentProps: { maxlength: 200 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '文物简介',
      field: 'introduce',
      component: 'InputTextArea',
      componentProps: { maxlength: 5000, rows: 6 },
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
    // try/finally：任一 await 抛错也要复位 loading，否则遮罩一直盖住抽屉内容。
    try {
      await resetFields();
      isView.value = !!data?.isView;
      record.value = (data || {}) as Relic;
      record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
      await setFieldsValue({
        name: record.value.name ?? '',
        level: record.value.level ?? '',
        category: record.value.category ?? '',
        district: record.value.district ?? '',
        era: record.value.era ?? '',
        publicTime: record.value.publicTime ?? 0,
        situation: record.value.situation ?? '',
        code: record.value.code ?? '',
        address: record.value.address ?? '',
        introduce: record.value.introduce ?? '',
      });
      // 查看模式禁用表单（表单在抽屉体内，disabled 不影响抽屉面板本身；
      // showFooter 已改由 list.vue 在打开前通过 setDrawerProps 设置）
      if (isView.value) {
        await setProps({ disabled: true });
      } else {
        await setProps({ disabled: false });
      }
    } finally {
      setDrawerProps({ loading: false });
    }
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
    // 本地演示：success 事件携带表单值 + 记录标识，父级更新内存副本
    emit('success', { ...data, id: record.value.id, _isNew: !!record.value.isNewRecord });
    setTimeout(closeDrawer);
  }
</script>
