<!--
  市住更局 —— 满意度调查问卷问题 新增/编辑/查看 表单抽屉

  「满意度调查结果与对应指标项关联」的录入入口：
   - 对应指标项 = Select 搜索选择该调查年份指标体系的指标项（全集由父级传入）；
   - 选中后自动带出对应一级/二级维度（只读回显，不可手改 —— 后端强校验维度必须与
     指标项实际所属一致）；满意度为 0~100 单值。
  问题行为"整单提交"：本表单不做接口调用，校验通过后把表单值回传父级
  （emit('success', row, values)），由父级维护完整问题列表后整单 saveList。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="45%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import type { SurveyQuestion } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 所属调查已提交/查看态时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
    /** 该调查年份指标体系的指标项全集（供选择与维度带出） */
    indicatorItems: { type: Array as () => Indicator[], default: () => [] },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<SurveyQuestion & { isNewRecord?: boolean }>({} as SurveyQuestion & { isNewRecord?: boolean });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看调查问卷问题' : record.value.isNewRecord ? '新增调查问卷问题' : '编辑调查问卷问题',
  }));

  /** 指标项下拉 options（全集；编辑行指标项不在全集时兜底补一条避免空显） */
  const itemOptions = computed(() => {
    const options = props.indicatorItems.map((item) => ({ label: item.indicatorName ?? '', value: item.id! }));
    const currentId = record.value.indicatorItemId;
    if (currentId && !props.indicatorItems.some((item) => item.id === currentId)) {
      options.push({ label: record.value.indicatorItemName ?? currentId, value: currentId });
    }
    return options;
  });

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '调查问卷问题',
      field: 'questionText',
      component: 'Input',
      componentProps: { maxlength: 255, showCount: true },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入调查问卷问题' }],
    },
    {
      label: '对应指标项',
      field: 'indicatorItemId',
      component: 'Select',
      componentProps: () => ({
        options: itemOptions.value,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '请选择指标项（按名称搜索）',
        // JeeSiteSelect 在无值且无 allowClear 时会自动选中第一项，必须显式放开
        allowClear: true,
        onChange: (value: string) => handleItemChange(value),
      }),
      rules: [{ required: true, message: '请选择对应指标项' }],
      helpMessage: '仅可选择该调查年份指标体系内的指标项；一/二级维度随指标项自动带出',
    },
    {
      label: '对应一级维度',
      field: 'firstDimensionName',
      component: 'Input',
      dynamicDisabled: () => true,
      helpMessage: '随对应指标项自动带出，不可修改',
    },
    {
      label: '对应二级维度',
      field: 'secondDimensionName',
      component: 'Input',
      dynamicDisabled: () => true,
      helpMessage: '随对应指标项自动带出，不可修改',
    },
    {
      label: '满意度（%）',
      field: 'satisfactionRate',
      component: 'InputNumber',
      componentProps: { min: 0, max: 100, precision: 2, style: 'width: 100%' },
      rules: [{ required: true, message: '请输入满意度' }],
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  /** 选中指标项后带出一/二级维度（与后端反查口径一致，杜绝维度错配 400） */
  function handleItemChange(itemId?: string) {
    const item = props.indicatorItems.find((it) => it.id === itemId);
    if (item) {
      setFieldsValue({
        firstDimensionName: item.dim1 ?? '',
        secondDimensionName: item.dim2 ?? '',
      });
    }
  }

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // resetFields 可能因表单未挂载不 resolve，超时兜底（历史坑）
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    isView.value = !!data?.isView;
    record.value = (data || {}) as SurveyQuestion;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    // 指标项仅在已有值时回填：显式传 undefined 会让 Select 误显示第一项
    const values: Recordable = {
      questionText: record.value.questionText ?? '',
      firstDimensionName: record.value.firstDimensionName ?? '',
      secondDimensionName: record.value.secondDimensionName ?? '',
      satisfactionRate: record.value.satisfactionRate,
      remarks: record.value.remarks ?? '',
    };
    if (record.value.indicatorItemId) {
      values.indicatorItemId = record.value.indicatorItemId;
    } else {
      values.indicatorItemId = null;
    }
    await setFieldsValue(values);
    await setProps({ disabled: isView.value || props.readOnly });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value || props.readOnly) {
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
    // 指标项名称按 id 从全集反查回填（兜底编辑行原值），维度由选中项带出
    const item = props.indicatorItems.find((it) => it.id === data.indicatorItemId);
    data.indicatorItemName = item?.indicatorName ?? record.value.indicatorItemName ?? '';
    setTimeout(closeDrawer);
    // 不直接调接口：回传父级由整单 saveList 提交
    emit('success', record.value, data);
  }
</script>
