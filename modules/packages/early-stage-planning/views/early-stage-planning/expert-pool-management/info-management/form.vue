<!--
  市住更局 —— 三师信息管理（查看 / 新增 / 编辑 表单抽屉）

  组件格式对齐项目 BasicDrawer + useDrawerInner + BasicForm 模式：
   - force-render 预挂载（消除首次打开时表单未注册的竞态）；
   - 查看模式：list.vue 在 openDrawer 前预设 showFooter，本组件内只做表单级 disabled；
   - 回调 try/finally 兜底复位 loading。
  已接后端（modules/esp）：详情回显走 2.3、字典下拉走 1.1、保存走 2.4（文档 §2）。
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
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolInfoManagementForm">
  import { computed, ref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import {
    espDictOptions,
    espDictAreas,
    espExpertForm,
    espExpertSave,
    type EspExpert,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Recordable>({});

  const getTitle = computed(() => ({
    icon: 'ant-design:team-outlined',
    value: isView.value ? '查看专家' : record.value.isNewRecord ? '新增专家' : '修改专家',
  }));

  /** 字典选项（接口 1.1；加载完成前用静态兜底，避免下拉空白） */
  const dictOptions = ref<{ fields: string[]; titles: string[]; orgTypes: string[] }>({
    fields: ['城乡规划学', '建筑学'],
    titles: ['高级工程师', '正高级工程师'],
    orgTypes: ['民营企业', '国有企业', '党政机关', '事业单位', '其他'],
  });
  const toOptions = (list: string[]) => list.map((v) => ({ label: v, value: v }));
  const areaOptions = ref<{ label: string; value: string }[]>([]);
  const toAreaUids = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const inputFormSchemas: FormSchema[] = [
    {
      label: '专家姓名',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入专家姓名' }],
    },
    {
      label: '性别',
      field: 'gender',
      component: 'Select',
      componentProps: {
        options: [
          { label: '男', value: '男' },
          { label: '女', value: '女' },
        ],
        placeholder: '请选择',
      },
      rules: [{ required: true, message: '请选择性别' }],
    },
    {
      label: '年龄',
      field: 'age',
      component: 'InputNumber',
      componentProps: { min: 25, max: 90, precision: 0, style: 'width: 100%' },
      rules: [{ required: true, message: '请输入年龄' }],
    },
    {
      label: '联系电话',
      field: 'phone',
      component: 'Input',
      componentProps: { maxlength: 20 },
      rules: [{ required: true, message: '请输入联系电话' }],
    },
    {
      label: '身份证号',
      field: 'idCard',
      component: 'Input',
      componentProps: { maxlength: 18 },
      rules: [{ required: true, message: '请输入身份证号' }],
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
      componentProps: { maxlength: 100 },
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
      label: '所属片区',
      field: 'areaUids',
      component: 'Select',
      componentProps: () => ({
        options: areaOptions.value,
        mode: 'multiple',
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '请选择（可多选）',
        maxTagCount: 'responsive',
      }),
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '入库时间',
      field: 'joinDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择' },
    },
    {
      label: '是否已入选三师',
      field: 'selected',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        placeholder: '请选择',
      },
      rules: [{ required: true, message: '请选择是否已入选三师' }],
    },
    {
      label: '主要学习和工作经历',
      field: 'career',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入主要学习和工作经历' }],
    },
    {
      label: '过往评审经历',
      field: 'reviewExperience',
      component: 'InputTextArea',
      componentProps: { maxlength: 2000, rows: 4, placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入过往评审经历' }],
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 110,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // try/finally：任一 await 抛错也要复位 loading，否则遮罩盖住抽屉内容
    try {
      await resetFields();
      isView.value = !!data?.isView;
      record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;

      // 修改/查看：详情接口回显（列表行数据仅作兜底）；新增：空骨架
      if (!record.value.isNewRecord) {
        const detail = await espExpertForm(String(data.id));
        record.value = { ...detail, isNewRecord: false, isView: isView.value };
      }

      // 字典接口（1.1 / 1.2）→ 覆盖下拉选项
      dictOptions.value = await espDictOptions();
      const areas = await espDictAreas();
      areaOptions.value = (areas ?? []).map((a) => ({
        label: a.areaName || a.key,
        value: a.areaCode || a.value,
      }));

      const r = record.value;
      await setFieldsValue({
        name: r.name ?? '',
        gender: r.gender ?? '男',
        age: r.age ?? 35,
        phone: r.phone ?? '',
        idCard: r.idCard ?? '',
        field: r.field ?? undefined,
        title: r.title ?? undefined,
        org: r.org ?? '',
        orgType: r.orgType ?? undefined,
        areaUids: toAreaUids(r.areaUids),
        joinDate: r.joinDate ?? undefined,
        selected: r.selected ?? undefined,
        career: r.career ?? '',
        reviewExperience: r.reviewExperience ?? '',
      });
      // 查看模式：表单级禁用（showFooter 已由 list.vue 在 openDrawer 前预设）
      await setProps({ disabled: isView.value });
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
    // 保存接口（2.4）：id 空 = 新增，非空 = 修改
    await espExpertSave({ ...data, id: record.value.id ?? '' } as Partial<EspExpert>);
    showMessage(record.value.isNewRecord ? '新增成功' : '保存成功');
    emit('success');
    setTimeout(closeDrawer);
  }
</script>
