<!--
  ifco —— 年度计划编制 · 纳入年度计划（项目级 查看/编辑 抽屉，工作台行内）

  与 ../form.vue（任务级查看/编辑表单抽屉）区分：本抽屉针对单个项目，标题
  「纳入年度计划 · 项目名」。基本信息走共用只读组件 project-basic-info-form
  （项目基本信息），其后「采纳决定」为交互分区：是否采纳下拉（采纳/不采纳，
  直连模板组件绑定 ref、不走表单 schema——schema 字段的空值会被渲染成首个
  选项，直连 Select 的 placeholder 正常，参照 dispatch-form 行政区写法）——
  选「采纳」出现确认信息四字段：本年度计划完成投资[yearPlanInvest]/计划开工
  时间[planStartDate]/计划完工时间[planCompletionDate]/备注[remarks]，两日期
  存采纳行（各年度任务各自口径，回显值=工作台行 effective 值：采纳值优先、
  无采纳值为主表值）；选「不采纳」出现 不采纳说明（存 adopt 行 remarks）；
  切换选择清空已填内容；编辑态恒从「请选择」开始（无默认值，查看态按存量回显）。
  底部按钮由打开方经 showFooter 预隐藏。提交经 emit success 交工作台持久化
  （handleSuccess 调 adoptAnnualPlan，采纳投资由后端回写项目主表）。
  打开时序（防闪烁）：打开方 openDrawer 传 open=false，回填就绪后掀开
  （见前端 AGENTS.md 抽屉硬性规则）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    force-render
    width="50%"
    :title="title"
    okText="提交"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <!-- 基本信息（共用只读组件：项目基本信息；组件根为 fragment 不透传 class，间距由外层 div 承载） -->
    <ProjectBasicInfoForm :p-uid="project.pUid" disabled :show-impl-condition="false" />

    <!-- 采纳决定 -->
    <BasicForm @register="registerForm">
      <!-- 是否采纳（直连 Select 绑 ref，不走 formModel；空值显示 placeholder） -->
      <template #adoptChoice>
        <Select
          :value="adoptChoice"
          :options="ADOPT_OPTIONS"
          :disabled="isView"
          placeholder="请选择"
          class="w-full"
          @change="onAdoptChoiceChange"
        />
      </template>
    </BasicForm>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanCompilationIdForm">
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { type WorkbenchProject } from '@jeesite/ifco/api/ifco/compilation';
  import { Select } from 'antdv-next';
  import { computed, ref } from 'vue';
  import ProjectBasicInfoForm from '../../../shared/project-basic-info-form.vue';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  /** 打开方传入的目标项目（{ project } 结构） */
  const project = ref<WorkbenchProject>({} as WorkbenchProject);

  /** 查看模式：采纳决定同样禁用（查看＝整表只读） */
  const isView = ref(false);

  /** 是否采纳（未选=undefined 显 placeholder；采纳＝确认信息四字段；不采纳＝不采纳说明；切换即清空已填内容） */
  const adoptChoice = ref<'采纳' | '不采纳' | undefined>(undefined);
  const ADOPT_OPTIONS = [
    { label: '采纳', value: '采纳' },
    { label: '不采纳', value: '不采纳' },
  ];

  function onAdoptChoiceChange(value: any) {
    adoptChoice.value = value || undefined;
    setFieldsValue({
      yearPlanInvest: null,
      planStartDate: null,
      planCompletionDate: null,
      remarks: '',
      rejectReason: '',
    });
  }

  const title = computed(() => `纳入年度计划 · ${project.value.projectName ?? ''}`);

  // ── 采纳决定（是否采纳分流；基本信息走共用只读组件） ────────────────
  const inputFormSchemas: FormSchema[] = [
    {
      label: '采纳决定',
      field: 'decisionGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否采纳',
      field: 'adoptChoice',
      component: 'Input',
      slot: 'adoptChoice',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '本年度计划完成投资（亿元）',
      field: 'yearPlanInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入本年度计划完成投资' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => adoptChoice.value === '采纳',
      dynamicDisabled: () => isView.value,
    },
    {
      label: '计划开工时间',
      field: 'planStartDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择计划开工时间' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => adoptChoice.value === '采纳',
      dynamicDisabled: () => isView.value,
    },
    {
      label: '计划完工时间',
      field: 'planCompletionDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择计划完工时间' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => adoptChoice.value === '采纳',
      dynamicDisabled: () => isView.value,
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3, placeholder: '请输入备注' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => adoptChoice.value === '采纳',
      dynamicDisabled: () => isView.value,
    },
    {
      label: '不采纳说明',
      field: 'rejectReason',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3, placeholder: '请输入不采纳说明' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => adoptChoice.value === '不采纳',
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
    project.value = (data?.project ?? {}) as WorkbenchProject;
    // 是否采纳不走 formModel：查看态按存量回显，编辑态恒从「请选择」开始（无默认值）
    adoptChoice.value = isView.value
      ? project.value.adoptStatus === '已采纳'
        ? '采纳'
        : project.value.adoptStatus === '不采纳'
          ? '不采纳'
          : undefined
      : undefined;
    if (isView.value) {
      await setFieldsValue({
        yearPlanInvest: project.value.yearPlanInvest,
        planStartDate: project.value.planStartDate || undefined,
        planCompletionDate: project.value.planCompletionDate || undefined,
        remarks: project.value.adoptStatus === '不采纳' ? '' : (project.value.remarks ?? ''),
        rejectReason: project.value.adoptStatus === '不采纳' ? (project.value.remarks ?? '') : '',
      });
    } else {
      await setFieldsValue({
        yearPlanInvest: null,
        planStartDate: null,
        planCompletionDate: null,
        remarks: '',
        rejectReason: '',
      });
    }
    setDrawerProps({ open: true });
  });

  /** 提交：先拦「请选择」，再按是否采纳分流（不采纳的说明存 adopt 行 remarks），emit success 交工作台持久化 */
  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    if (!adoptChoice.value) {
      showMessage('请选择是否采纳');
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
    const adopted = adoptChoice.value === '采纳';
    setTimeout(closeDrawer);
    emit('success', {
      pUid: project.value.pUid,
      adoptStatus: adopted ? '已采纳' : '不采纳',
      yearPlanInvest: adopted ? values.yearPlanInvest : undefined,
      planStartDate: adopted ? values.planStartDate || '' : '',
      planCompletionDate: adopted ? values.planCompletionDate || '' : '',
      remarks: adopted ? (values.remarks ?? '') : (values.rejectReason ?? ''),
    });
  }
</script>
