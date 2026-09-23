<!--
  ifco —— 年度计划编制（查看 / 采纳编辑 一体表单抽屉）

  组件格式对齐 annual-plan/task-dispatch/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema）；
   - 查看=表单 disabled（setProps），不使用 Description；
   - 打开时序（防闪烁）：打开方 openDrawer 传 open=false，本组件回调整个跑完
     （resetFields 回填 + disabled）后 setDrawerProps({ open: true }) 才掀开——
     所有翻转发生在抽屉闭合状态（见前端 AGENTS.md 抽屉硬性规则）。

  表单分两区（FormGroup）：市级任务要求（任务年份/采纳日期/编制开始时间/
  市级编制结束时间/年度刚性目标说明/年度刚性投资目标）+ 区级任务分解要求
  （区级编制结束时间/各区年度刚性投资目标，均一排一个整行）。
  底部按钮为默认 取消/确定；保存后 emit success 交打开方写回内存。
  工作台行内「采纳编辑」的项目级抽屉见 _id/form.vue（纳入年度计划）。
  当前后端尚未介入。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" :title="getTitle" @register="registerDrawer" @ok="handleSubmit">
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanCompilationForm">
  import { computed, ref } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { DISTRICTS, taskYearOptions, type CompilationTask } from '@jeesite/ifco/api/ifco/compilation';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<CompilationTask & { isNewRecord?: boolean }>({} as CompilationTask);

  const getTitle = computed(() => {
    if (isView.value) return '查看任务';
    return record.value.isNewRecord ? '新增任务' : '编辑任务';
  });

  // ── 表单 ────────────────────────────────────────────────────────────
  /** 各区目标字段的表单字段名（扁平键，提交时组装回 districtTargets） */
  function districtTargetField(name: string) {
    return `districtTarget_${name}`;
  }

  const inputFormSchemas: FormSchema[] = [
    // ── 市级任务要求 ──────────────────────────────────────────────────
    {
      label: '市级任务要求',
      field: 'cityGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '任务年份',
      field: 'taskYear',
      component: 'Select' as const,
      componentProps: { options: taskYearOptions(), placeholder: '请选择任务年份' },
      rules: [{ required: true, message: '请选择任务年份' }],
    },
    {
      label: '采纳日期',
      field: 'adoptDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择采纳日期' },
      rules: [{ required: true, message: '请选择采纳日期' }],
    },
    {
      label: '编制开始时间',
      field: 'compileStartDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择编制开始时间' },
      rules: [{ required: true, message: '请选择编制开始时间' }],
    },
    {
      label: '市级编制结束时间',
      field: 'compileEndDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择市级编制结束时间' },
      rules: [{ required: true, message: '请选择市级编制结束时间' }],
    },
    {
      label: '年度刚性目标说明',
      field: 'rigidTargetRemark',
      component: 'InputTextArea',
      componentProps: {
        maxlength: 500,
        rows: 3,
        placeholder: '请输入年度刚性目标说明',
      },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '年度刚性投资目标（亿元）',
      field: 'annualRigidTarget',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入年度刚性投资目标' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入年度刚性投资目标' }],
    },
    // ── 区级任务分解要求 ──────────────────────────────────────────────
    {
      label: '区级任务分解要求',
      field: 'districtGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '区级编制结束时间',
      field: 'districtCompileEndDate',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        style: 'width: 100%',
        placeholder: '请选择区级编制结束时间',
      },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请选择区级编制结束时间' }],
    },
    ...DISTRICTS.map((name) => ({
      label: `${name}年度刚性投资目标（亿元）`,
      field: districtTargetField(name),
      component: 'InputNumber' as const,
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入' },
      colProps: { md: 24, lg: 24 },
    })),
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 240,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    // 打开方 openDrawer 传 open=false：回填全部就绪后才掀开（防闪烁，见文件头注释）
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as CompilationTask;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    const districtValues: Recordable = {};
    for (const name of DISTRICTS) {
      districtValues[districtTargetField(name)] = record.value.districtTargets?.[name];
    }
    await setFieldsValue({
      taskYear: record.value.taskYear,
      adoptDate: record.value.adoptDate ?? '',
      compileStartDate: record.value.compileStartDate ?? '',
      compileEndDate: record.value.compileEndDate ?? '',
      districtCompileEndDate: record.value.districtCompileEndDate ?? '',
      annualRigidTarget: record.value.annualRigidTarget,
      rigidTargetRemark: record.value.rigidTargetRemark ?? '',
      ...districtValues,
    });
    await setProps({ disabled: isView.value });
    setDrawerProps({ open: true });
  });

  /** 提交：校验必填项后保存（查看模式直接关闭） */
  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const districtTargets: Record<string, number> = {};
    for (const name of DISTRICTS) {
      const value = values[districtTargetField(name)];
      if (typeof value === 'number') districtTargets[name] = value;
    }
    const payload: CompilationTask = {
      code: record.value.code ?? String(values.taskYear ?? ''),
      taskYear: values.taskYear,
      annualRigidTarget: values.annualRigidTarget,
      totalInvest: record.value.totalInvest,
      compileStartDate: values.compileStartDate ?? '',
      compileEndDate: values.compileEndDate ?? '',
      districtCompileEndDate: values.districtCompileEndDate ?? '',
      adoptDate: values.adoptDate ?? '',
      rigidTargetRemark: values.rigidTargetRemark ?? '',
      districtTargets,
      status: record.value.status ?? '进行中',
    };
    // TODO: 后端接入后在此调用保存接口
    setTimeout(closeDrawer);
    emit('success', payload);
  }
</script>
