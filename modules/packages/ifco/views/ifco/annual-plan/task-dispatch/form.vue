<!--
  ifco —— 年度项目安排 · 任务分解与派发（查看 / 新增 / 编辑 一体表单抽屉）

  组件格式对齐 project-library-management/project-management/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema）；
   - 查看/编辑一体：查看=表单 disabled（setProps），不使用 Description；
   - BasicDrawer 加 force-render 消除首次打开的懒挂载；抽屉级 showFooter 由
     list.vue 经 setDrawerProps 设置（硬性规则，动画中翻转会首击不弹）；
   - 打开时序：list.vue 的 openDrawer 传 open=false，回调整个跑完（resetFields
     回填 + disabled）后由本组件 setDrawerProps({ open: true }) 掀开——所有
     翻转都发生在抽屉闭合状态，打开动画期间零变化，避免查看/编辑闪烁。

  表单分两区（FormGroup）：市级任务要求（任务年份/编制开始时间/
  市级编制结束时间/年度刚性目标说明/年度刚性投资目标）+ 区级任务分解要求
  （区级编制结束时间/各区年度刚性投资目标）。全部表单项一行一个整行。
  底部按钮 取消/提交（确定按钮 okText=提交）；提交校验必填项后调保存接口
  （/a/ifco/annual/task/save，撞年由后端 400 拦截）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    force-render
    width="50%"
    :title="getTitle"
    show-footer
    okText="提交"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanTaskDispatchForm">
  import { computed, ref } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    DISTRICTS,
    saveAnnualTask,
    taskYearOptions,
    type TaskDispatchItem,
  } from '@jeesite/ifco/api/ifco/task-dispatch';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<TaskDispatchItem & { isNewRecord?: boolean }>({} as TaskDispatchItem);

  /** 市级编制结束时间当前值（区级结束时间跨字段校验用；回填与 onChange 同步） */
  const cityCompileEndDate = ref('');

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
      label: '编制开始时间',
      field: 'compileStartDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择编制开始时间' },
      rules: [{ required: true, message: '请选择编制开始时间' }],
    },
    {
      label: '市级编制结束时间',
      field: 'cityCompileEndDate',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        style: 'width: 100%',
        placeholder: '请选择市级编制结束时间',
        onChange: (_date: unknown, dateString: string) => {
          cityCompileEndDate.value = dateString ?? '';
        },
      },
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
      rules: [
        { required: true, message: '请选择区级编制结束时间' },
        // 区级须早于市级（同日也不允许）；市级未选时跳过跨字段比较
        {
          validator: (_rule: unknown, value: unknown) =>
            value && cityCompileEndDate.value && String(value) >= cityCompileEndDate.value
              ? Promise.reject('区级编制结束时间须早于市级编制结束时间')
              : Promise.resolve(),
        },
      ],
    },
    // 各区目标：一排一个（整行），不随表单两列基线并排
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
    labelAlign: 'left',
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    // 本地数据同步回填、无异步请求：不挂 loading 遮罩（打开动画期间遮罩一闪
    // 而过会表现为抽屉闪烁；后端接入取数后再恢复 loading）。
    // list.vue 的 openDrawer 传 open=false：以下回填全部发生在抽屉闭合状态下，
    // 就绪后才掀开——打开动画期间不再有任何内容/props 翻转
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as TaskDispatchItem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    const districtValues: Recordable = {};
    for (const name of DISTRICTS) {
      districtValues[districtTargetField(name)] = record.value.districtTargets?.[name];
    }
    await setFieldsValue({
      taskYear: record.value.taskYear,
      compileStartDate: record.value.compileStartDate ?? '',
      cityCompileEndDate: record.value.cityCompileEndDate ?? '',
      districtCompileEndDate: record.value.districtCompileEndDate ?? '',
      annualRigidTarget: record.value.annualRigidTarget,
      rigidTargetRemark: record.value.rigidTargetRemark ?? '',
      ...districtValues,
    });
    // 跨字段校验基准同步（回填态；后续变化由市级字段的 onChange 维护）
    cityCompileEndDate.value = record.value.cityCompileEndDate ?? '';
    // 查看模式只禁用表单（抽屉体内，闭合状态下设置同样安全）
    await setProps({ disabled: isView.value });
    // 回填/禁用全部就绪，掀开抽屉
    setDrawerProps({ open: true });
  });

  /** 提交：校验必填项后保存 */
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
    try {
      await saveAnnualTask({
        id: record.value.isNewRecord ? undefined : record.value.id,
        taskYear: values.taskYear,
        annualRigidTarget: values.annualRigidTarget,
        compileStartDate: values.compileStartDate ?? '',
        cityCompileEndDate: values.cityCompileEndDate ?? '',
        districtCompileEndDate: values.districtCompileEndDate ?? '',
        rigidTargetRemark: values.rigidTargetRemark ?? '',
        districtTargets,
      });
    } catch (e) {
      showMessage((e as Error)?.message || '保存失败');
      return;
    }
    closeDrawer();
    emit('success', {});
  }
</script>
