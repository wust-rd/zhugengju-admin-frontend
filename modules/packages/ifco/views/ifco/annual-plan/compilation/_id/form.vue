<!--
  ifco —— 年度计划编制 · 纳入年度计划（项目级 查看/采纳编辑 抽屉，工作台行内）

  与 ../form.vue（任务级查看/编辑表单抽屉）区分：本抽屉针对单个项目，标题
  「纳入年度计划 · 项目名」。任务下发信息为纯展示项（不走表单控件，对齐
  设计稿：无分组标题条，两列「label：值」文字 + 年度刚性目标说明整行 +
  各区年度刚性投资目标「区名 数值」一行四个）；只有「确认信息」是表单分区：
  本年度计划完成投资（亿元）/备注，均非必填、各占一行（备注 textarea）。
  查看模式（isView）确认信息同样禁用＝整表只读，底部按钮由打开方经
  showFooter 预隐藏。提交即把该项目置为已采纳并写入这两个值（工作台表格
  「年度投资计划(亿元)」列即 yearPlanInvest），emit success 交工作台写回内存。
  打开时序（防闪烁）：打开方 openDrawer 传 open=false，回填就绪后掀开
  （见前端 AGENTS.md 抽屉硬性规则）。当前后端尚未介入。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" :title="title" @register="registerDrawer" @ok="handleSubmit">
    <!-- 任务下发信息（纯展示，非表单项） -->
    <div class="pb-16px b-b b-b-solid b-gray-100 text-14px">
      <div class="grid grid-cols-1 gap-x-32px gap-y-10px md:grid-cols-2">
        <div v-for="item in taskInfoItems" :key="item.label">
          <span class="text-gray-500">{{ item.label }}：</span>
          <span class="text-gray-800">{{ item.value }}</span>
        </div>
        <div class="md:col-span-2">
          <span class="text-gray-500">年度刚性目标说明：</span>
          <span class="text-gray-800">{{ task.rigidTargetRemark || '/' }}</span>
        </div>
      </div>
      <!-- 各区年度刚性投资目标（一行四个） -->
      <div class="mt-16px grid grid-cols-2 gap-x-24px gap-y-8px md:grid-cols-4">
        <div v-for="name in DISTRICTS" :key="name">
          <span class="text-gray-500">{{ name }}</span>
          <span class="ml-8px text-gray-800">{{ districtValue(name) }}</span>
        </div>
      </div>
    </div>

    <!-- 确认信息（唯一的表单分区） -->
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

  /** 打开方传入的目标项目与所属任务（{ task, project } 结构） */
  const task = ref<CompilationTask>({} as CompilationTask);
  const project = ref<WorkbenchProject>({} as WorkbenchProject);

  /** 查看模式：确认信息同样禁用（任务信息为纯展示，查看＝整表只读） */
  const isView = ref(false);

  const title = computed(() => `纳入年度计划 · ${project.value.projectName ?? ''}`);

  // ── 任务信息展示区 ──────────────────────────────────────────────────
  /** 金额展示：两位小数（空值显示 /） */
  function fmtAmount(value?: number): string {
    return typeof value === 'number' ? value.toFixed(2) : '/';
  }

  const taskInfoItems = computed(() => [
    { label: '任务年份', value: task.value.taskYear ? String(task.value.taskYear) : '/' },
    { label: '采纳日期', value: task.value.adoptDate || '/' },
    { label: '编制开始时间', value: task.value.compileStartDate || '/' },
    { label: '市级编制结束时间', value: task.value.compileEndDate || '/' },
    { label: '区级编制结束时间', value: task.value.districtCompileEndDate || '/' },
    { label: '年度刚性投资目标（亿元）', value: fmtAmount(task.value.annualRigidTarget) },
  ]);

  /** 各区年度刚性投资目标（展示值） */
  function districtValue(name: string): string {
    return fmtAmount(task.value.districtTargets?.[name]);
  }

  // ── 确认信息表单 ────────────────────────────────────────────────────
  const inputFormSchemas: FormSchema[] = [
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
    baseColProps: { md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    // 打开方 openDrawer 传 open=false：回填全部就绪后才掀开（防闪烁，见文件头注释）
    await resetFields();
    isView.value = !!data?.isView;
    task.value = (data?.task ?? {}) as CompilationTask;
    project.value = (data?.project ?? {}) as WorkbenchProject;
    await setFieldsValue({
      yearPlanInvest: project.value.yearPlanInvest,
      remarks: project.value.remarks ?? '',
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
