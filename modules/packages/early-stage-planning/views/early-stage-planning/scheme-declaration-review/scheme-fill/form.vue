<!--
  市住更局 —— 策划方案填报（查看 / 新增 / 编辑 表单抽屉）

  组件格式对齐项目 BasicDrawer + useDrawerInner + BasicForm 模式：
   - force-render 预挂载（消除首次打开时表单未注册的竞态）；
   - 查看模式：list.vue 在 openDrawer 前预设 showFooter，本组件内只做表单级 disabled；
   - 回调 try/finally 兜底复位 loading。
  当前后端尚未介入：保存仅校验后 emit success（携带表单值与记录标识），由父级落内存副本。
-->
<template>
  <BasicDrawer ref="drawerRef" v-bind="$attrs" width="600px" force-render @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <span class="text-16px font-500">{{ getTitle }}</span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillForm">
  import { computed, ref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Recordable>({});

  const getTitle = computed(() => (isView.value ? '查看片区填报' : record.value.isNewRecord ? '新增片区填报' : '编辑片区填报'));

  /** 下拉选项（与列表页筛选一致；接口就绪后改为字典接口） */
  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));
  const FUNC_OPTIONS = ['COD', 'TOD', 'IOD', 'SOD', 'EOD', 'HOD', 'XOD'].map((f) => ({ label: f, value: f }));
  const BATCH_OPTIONS = ['第一批', '第二批'].map((b) => ({ label: b, value: b }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '片区名称',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入片区名称' },
      rules: [{ required: true, message: '请输入片区名称' }],
    },
    {
      label: '行政区',
      field: 'district',
      component: 'Select',
      componentProps: { options: DISTRICT_OPTIONS, placeholder: '请选择', allowClear: true },
      rules: [{ required: true, message: '请选择行政区' }],
    },
    {
      label: '片区规模（公顷）',
      field: 'areaHa',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 1, style: 'width: 100%', placeholder: '请输入' },
      rules: [{ required: true, message: '请输入片区规模' }],
    },
    {
      label: '片区功能定位',
      field: 'funcTypes',
      component: 'Select',
      componentProps: {
        options: FUNC_OPTIONS,
        placeholder: '请选择（可多选）',
        mode: 'multiple',
        allowClear: true,
      },
      rules: [{ required: true, message: '请选择片区功能定位' }],
    },
    {
      label: '片区批次',
      field: 'batch',
      component: 'Select',
      componentProps: { options: BATCH_OPTIONS, placeholder: '请选择', allowClear: true },
      rules: [{ required: true, message: '请选择片区批次' }],
    },
    {
      label: '总体投资估算（亿元）',
      field: 'invest',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, style: 'width: 100%', placeholder: '请输入' },
      rules: [{ required: true, message: '请输入总体投资估算' }],
    },
    {
      label: '填报单位',
      field: 'reportOrg',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入填报单位' },
      rules: [{ required: true, message: '请输入填报单位' }],
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // try/finally：任一 await 抛错也要复位 loading，否则遮罩盖住抽屉内容
    try {
      await resetFields();
      isView.value = !!data?.isView;
      record.value = (data || {}) as Recordable;
      record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
      await setFieldsValue({
        name: record.value.name ?? '',
        district: record.value.district ?? undefined,
        areaHa: record.value.areaHa ?? undefined,
        funcTypes: record.value.funcTypes ?? [],
        batch: record.value.batch ?? undefined,
        invest: record.value.invest ?? undefined,
        reportOrg: record.value.reportOrg ?? undefined,
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
    // TODO: 后端接入后在此调用保存接口（填报时间由后端记录）
    emit('success', { ...data, id: record.value.id, isNewRecord: !!record.value.isNewRecord });
    setTimeout(closeDrawer);
  }
</script>
