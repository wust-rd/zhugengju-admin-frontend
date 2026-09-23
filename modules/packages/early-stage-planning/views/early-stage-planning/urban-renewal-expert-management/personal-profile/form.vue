<!--
  市住更局 —— 城市更新专家管理 · 个人档案（新增 / 编辑 表单抽屉）

  组件格式对齐项目 BasicDrawer + useDrawerInner + BasicForm 模式（参考三师库 info-management/form.vue）：
   - force-render 预挂载（消除首次打开时表单未注册的竞态）；
   - 编辑时详情接口回显（列表行数据仅做兜底）、字典下拉走接口；
   - 回调 try/finally 兜底复位 loading。
  已接后端（modules/esp UreExpertController）：详情回显走 2.3、字典走 1.1、保存走 2.4（id 空=新增）。
-->
<template>
  <BasicDrawer ref="drawerRef" v-bind="$attrs" width="600px" force-render @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProfileForm">
  import { computed, ref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import {
    ureDictOptions,
    ureExpertForm,
    ureExpertSave,
    type UreExpert,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  const record = ref<Recordable>({});

  const getTitle = computed(() => ({
    icon: 'ant-design:idcard-outlined',
    value: record.value.isNewRecord ? '新增专家' : '修改专家',
  }));

  /** 字典选项（接口 1.1；加载完成前性别用静态兜底，避免下拉空白） */
  const dictOptions = ref<{ fields: string[]; titles: string[]; orgTypes: string[]; genders: string[] }>({
    fields: [],
    titles: [],
    orgTypes: [],
    genders: ['男', '女'],
  });
  const toOptions = (list: string[]) => list.map((v) => ({ label: v, value: v }));

  /** 表单字段（与后端 UreExpertSaveReq 校验对齐：手机号 11 位且即登录账号、年龄 18~100） */
  const inputFormSchemas: FormSchema[] = [
    {
      label: '姓名',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入姓名' }],
    },
    {
      label: '性别',
      field: 'gender',
      component: 'Select',
      componentProps: () => ({ options: toOptions(dictOptions.value.genders), placeholder: '请选择' }),
      rules: [{ required: true, message: '请选择性别' }],
    },
    {
      label: '年龄',
      field: 'age',
      component: 'InputNumber',
      componentProps: { min: 18, max: 100, precision: 0, style: 'width: 100%', placeholder: '请输入' },
      rules: [{ required: true, message: '请输入年龄' }],
    },
    {
      label: '联系电话',
      field: 'phone',
      component: 'Input',
      componentProps: { maxlength: 11, placeholder: '11 位手机号（即登录账号）' },
      rules: [
        { required: true, message: '请输入联系电话' },
        { pattern: /^1\d{10}$/, message: '联系电话须为 11 位手机号（同时作为登录账号）' },
      ],
    },
    {
      label: '专业领域',
      field: 'field',
      component: 'Select',
      componentProps: () => ({ options: toOptions(dictOptions.value.fields), allowClear: true, placeholder: '请选择' }),
      rules: [{ required: true, message: '请选择专业领域' }],
    },
    {
      label: '职称',
      field: 'title',
      component: 'Select',
      componentProps: () => ({ options: toOptions(dictOptions.value.titles), allowClear: true, placeholder: '请选择' }),
      rules: [{ required: true, message: '请选择职称' }],
    },
    {
      label: '单位名称',
      field: 'org',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入单位名称' }],
    },
    {
      label: '单位性质',
      field: 'orgType',
      component: 'Select',
      componentProps: () => ({
        options: toOptions(dictOptions.value.orgTypes),
        allowClear: true,
        placeholder: '请选择',
      }),
      rules: [{ required: true, message: '请选择单位性质' }],
    },
    {
      label: '主要经历',
      field: 'career',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '过往评审经历',
      field: 'reviewExperience',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 110,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // try/finally：任一 await 抛错也要复位 loading，否则遮罩盖住抽屉内容
    try {
      await resetFields();
      record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;

      // 修改：详情接口回显（列表行数据仅作兜底）；新增：空表单
      if (!record.value.isNewRecord) {
        const detail = await ureExpertForm(String(data.id));
        record.value = { ...detail, isNewRecord: false };
      }

      // 字典接口（1.1）→ 覆盖下拉选项
      dictOptions.value = await ureDictOptions();

      const r = record.value as Partial<UreExpert>;
      await setFieldsValue({
        name: r.name ?? '',
        gender: r.gender ?? undefined,
        age: r.age ?? undefined,
        phone: r.phone ?? '',
        field: r.field ?? undefined,
        title: r.title ?? undefined,
        org: r.org ?? '',
        orgType: r.orgType ?? undefined,
        career: r.career ?? '',
        reviewExperience: r.reviewExperience ?? '',
      });
    } finally {
      setDrawerProps({ loading: false });
    }
  });

  async function handleSubmit() {
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    // 保存接口（2.4）：id 空 = 新增，非空 = 修改；手机号即登录账号，无同名账号后端自动开通
    try {
      const res = await ureExpertSave({ ...data, id: record.value.id ?? '' } as Partial<UreExpert>);
      showMessage(
        record.value.isNewRecord ? `新增成功${res.accountCreated ? '，已按手机号自动开通登录账号' : ''}` : '保存成功',
      );
    } catch (error: any) {
      showMessage(error.message || '保存失败');
      return;
    }
    emit('success');
    setTimeout(closeDrawer);
  }
</script>
