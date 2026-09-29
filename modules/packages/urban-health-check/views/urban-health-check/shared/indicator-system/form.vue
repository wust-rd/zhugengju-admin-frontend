<!--
  市住更局 —— 体检指标体系管理（新增 / 编辑 / 查看 表单抽屉）

  组件格式对齐 packages/core/views/sys/area/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema），而非 Modal；
   - 通过 defineEmits(['register', 'success']) 与父级 useDrawer 联动；
   - 查看模式：表单 disabled + 抽屉隐藏底部按钮。
  注意(与 urban-protection/relic 统一的模式):
   - BasicDrawer 加 force-render,页面加载时即挂载抽屉内容,消除首次打开的懒挂载;
   - 抽屉级 showFooter 由 list.vue 在打开前经 setDrawerProps 设置——打开动画期间
     增删 footer DOM 会打断面板渲染,导致首次点击不弹;
   - 表单级 disabled 在回调里设置即可(抽屉体内,安全)。
  接口已接入：保存 POST /cityCheck/indicatorSet/save（indicatorSystemSave）。
  提交状态为体系生命周期字段（保存=暂存、提交发布动作置已提交），表单中只读展示不可改。
  填报时间不进表单：保存不传 fillDate，后端自动取当前时间（填报时间=最新保存时间），
  列表页"填报时间"列展示该自动值。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="UhcSharedIndicatorSystemForm">
  import { computed, ref, unref } from 'vue';
  import {
    DISTRICTS,
    FUNCTION_POSITIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { IndicatorSystem } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    ENABLED_STATUS,
    SUBMIT_STATUS,
    YEAR_OPTIONS,
    indicatorSystemSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 区级体检:表单附加 体检片区/行政区划/功能定位 字段 */
    district: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<IndicatorSystem & { isNewRecord?: boolean }>({} as IndicatorSystem & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标体系' : record.value.isNewRecord ? '新增指标体系' : '编辑指标体系',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
    {
      label: '体检年份',
      field: 'year',
      component: 'Select' as const,
      componentProps: { options: YEAR_OPTIONS, allowClear: true },
      rules: [{ type: 'string', required: true, message: '请选择体检年份' }],
    },
    ...(props.district
      ? [
          {
            label: '体检片区',
            field: 'surveyArea',
            component: 'Select' as const,
            componentProps: { options: toOptions(SURVEY_AREAS), allowClear: true },
          },
          {
            label: '行政区划',
            field: 'adminDivision',
            component: 'Select' as const,
            componentProps: { options: toOptions(DISTRICTS), allowClear: true },
          },
          {
            label: '功能定位',
            field: 'functionPosition',
            component: 'Select' as const,
            componentProps: { mode: 'multiple', options: toOptions(FUNCTION_POSITIONS), allowClear: true },
          },
        ]
      : []),
    {
      label: '填报单位',
      field: 'reportUnit',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入填报单位' }],
    },
    {
      label: '指标体系名称',
      field: 'indicatorName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
      rules: [{ required: true, message: '请输入指标体系名称' }],
    },
    {
      label: '指标数量（项）',
      field: 'indicatorCount',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
      helpMessage: '体系声明的"系统指标项"总数，用作填报进度分母；指标项实际录入数可少于该值',
      rules: [{ required: true, message: '请输入指标数量' }],
    },
    {
      label: '其它信息',
      field: 'otherInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
    {
      label: '启用状态',
      field: 'enabled',
      component: 'Switch',
      componentProps: {
        checkedChildren: '启用',
        unCheckedChildren: '停用',
        checkedValue: '1',
        unCheckedValue: '0',
      },
    },
    {
      label: '提交状态',
      field: 'submitStatus',
      component: 'Select' as const,
      componentProps: {
        options: [
          { label: '待提交', value: SUBMIT_STATUS.PENDING },
          { label: '已提交', value: SUBMIT_STATUS.SUBMITTED },
        ],
      },
      helpMessage: '提交状态由"提交发布"动作驱动：保存=待提交，提交后体系只读',
      dynamicDisabled: true,
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    // 恒两列:断点 xs 以下(<576px)单列,其余一律 12;整行字段需全断点写 24。
    // 不能只写 span —— FormItem.getColProps 会给未设断点补 xs:24/sm:24,
    // 且 antd Col 响应式值优先于 span,视口命中 sm/md(如 ~900px 内嵌面板)时 span 不生效。
    baseColProps: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as IndicatorSystem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    await setFieldsValue({
      year: record.value.year ?? YEAR_OPTIONS[0].value,
      surveyArea: record.value.surveyArea ?? '',
      adminDivision: record.value.adminDivision ?? '',
      functionPosition: record.value.functionPosition ?? [],
      indicatorName: record.value.indicatorName ?? '',
      indicatorCount: record.value.indicatorCount ?? 0,
      reportUnit: record.value.reportUnit ?? '市住更局',
      enabled: record.value.enabled ?? ENABLED_STATUS.ENABLED,
      submitStatus: record.value.submitStatus ?? SUBMIT_STATUS.PENDING,
      remarks: record.value.remarks ?? '',
    });
    // 底部按钮经 #footer 插槽按 isView 渲染,不翻转 show-footer prop(见文件头注释)
    await setProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
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
    setDrawerProps({ loading: true });
    try {
      await indicatorSystemSave({
        ...data,
        // 编辑时带主键；新增留空由后端生成并自动产生 code
        id: record.value.isNewRecord ? undefined : record.value.id,
      });
      showMessage('保存成功');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
