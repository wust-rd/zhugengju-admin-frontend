<!--
  ifco —— 年度计划编制 · 纳入年度计划（项目级 查看/采纳编辑 抽屉，工作台行内）

  与 ../form.vue（任务级查看/编辑抽屉）区分：本抽屉针对单个项目，标题
  「纳入年度计划 · 项目名」。上半部为任务下发信息只读回显（市级任务要求 +
  区级任务分解要求两分区，dynamicDisabled 恒只读——下发要求项目侧不可改）；
  最下「确认信息」分区可编辑：本年度计划完成投资（亿元）/备注，均非必填、
  各占一行（备注 textarea）；查看模式（isView）确认信息同样禁用＝整表只读，
  底部按钮由打开方经 showFooter 预隐藏。提交即把该项目置为已采纳并写入这两
  个值（工作台表格「年度投资计划(亿元)」列即 yearPlanInvest），emit success
  交工作台写回内存。
  打开时序（防闪烁）：打开方 openDrawer 传 open=false，回填就绪后掀开
  （见前端 AGENTS.md 抽屉硬性规则）。当前后端尚未介入。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" :title="title" @register="registerDrawer" @ok="handleSubmit">
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanCompilationIdForm">
  import { computed, ref } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { DISTRICTS, type CompilationTask, type WorkbenchProject } from '@jeesite/ifco/api/ifco/compilation';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  /** 打开方传入的目标项目（{ task, project } 结构中的 project） */
  const project = ref<WorkbenchProject>({} as WorkbenchProject);

  /** 查看模式：确认信息同样禁用（任务信息恒只读，查看＝整表只读） */
  const isView = ref(false);

  const title = computed(() => `纳入年度计划 · ${project.value.projectName ?? ''}`);

  // ── 表单 ────────────────────────────────────────────────────────────
  /** 各区目标字段的表单字段名（与任务级抽屉同构） */
  function districtTargetField(name: string) {
    return `districtTarget_${name}`;
  }

  const inputFormSchemas: FormSchema[] = [
    // ── 市级任务要求（任务下发信息，只读回显） ─────────────────────────
    {
      label: '市级任务要求',
      field: 'cityGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '任务年份',
      field: 'taskYear',
      component: 'Input',
      dynamicDisabled: () => true,
    },
    {
      label: '采纳日期',
      field: 'adoptDate',
      component: 'Input',
      dynamicDisabled: () => true,
    },
    {
      label: '编制开始时间',
      field: 'compileStartDate',
      component: 'Input',
      dynamicDisabled: () => true,
    },
    {
      label: '市级编制结束时间',
      field: 'compileEndDate',
      component: 'Input',
      dynamicDisabled: () => true,
    },
    {
      label: '年度刚性目标说明',
      field: 'rigidTargetRemark',
      component: 'InputTextArea',
      componentProps: { rows: 3 },
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => true,
    },
    {
      label: '年度刚性投资目标（亿元）',
      field: 'annualRigidTarget',
      component: 'InputNumber',
      componentProps: { precision: 2 },
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => true,
    },
    // ── 区级任务分解要求（任务下发信息，只读回显） ─────────────────────
    {
      label: '区级任务分解要求',
      field: 'districtGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '区级编制结束时间',
      field: 'districtCompileEndDate',
      component: 'Input',
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => true,
    },
    ...DISTRICTS.map((name) => ({
      label: `${name}年度刚性投资目标（亿元）`,
      field: districtTargetField(name),
      component: 'InputNumber' as const,
      componentProps: { precision: 2 },
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => true,
    })),
    // ── 确认信息（可编辑，均非必填，各占一行） ─────────────────────────
    {
      label: '确认信息',
      field: 'confirmGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '本年度计划完成投资（亿元）',
      field: 'yearPlanInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入本年度计划完成投资' },
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => isView.value,
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3, placeholder: '请输入备注' },
      colProps: { md: 24, lg: 24 },
      dynamicDisabled: () => isView.value,
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 240,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    // 打开方 openDrawer 传 open=false：回填全部就绪后才掀开（防闪烁，见文件头注释）
    await resetFields();
    isView.value = !!data?.isView;
    const task = (data?.task ?? {}) as CompilationTask;
    project.value = (data?.project ?? {}) as WorkbenchProject;
    const districtValues: Recordable = {};
    for (const name of DISTRICTS) {
      districtValues[districtTargetField(name)] = task.districtTargets?.[name];
    }
    await setFieldsValue({
      taskYear: task.taskYear,
      adoptDate: task.adoptDate ?? '',
      compileStartDate: task.compileStartDate ?? '',
      compileEndDate: task.compileEndDate ?? '',
      districtCompileEndDate: task.districtCompileEndDate ?? '',
      annualRigidTarget: task.annualRigidTarget,
      rigidTargetRemark: task.rigidTargetRemark ?? '',
      yearPlanInvest: project.value.yearPlanInvest,
      remarks: project.value.remarks ?? '',
      ...districtValues,
    });
    setDrawerProps({ open: true });
  });

  /** 提交：该项目纳入年度计划（置为已采纳并写入确认信息，交工作台写回内存） */
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
    // TODO: 后端接入后在此调用保存接口
    setTimeout(closeDrawer);
    emit('success', {
      projectCode: project.value.projectCode,
      yearPlanInvest: values.yearPlanInvest,
      remarks: values.remarks ?? '',
    });
  }
</script>
