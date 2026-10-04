<!--
  市住更局 —— 满意度调查 新增表单抽屉

  仅用于新增年度调查（表8 主信息）：调查年份每年一次唯一（后端校验）；
  填报时间由后端自动记录、调查问题数量随明细自动同步、综合满意度提交时自动计算，
  三者均不在表单维护。问卷问题明细在编辑页（_id/list）维护。
  编辑入口不走本抽屉 —— 列表「编辑」直接下钻 RESTful 编辑页。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="35%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { surveySave } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  /** 新增完成后保存返回的调查主键（成功提示用） */
  const savedId = ref('');

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: '新增满意度调查',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '调查年份',
      field: 'surveyYear',
      component: 'Select',
      componentProps: { options: YEAR_OPTIONS },
      rules: [{ type: 'string', required: true, message: '请选择调查年份' }],
      helpMessage: '每年一次，不可重复创建',
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      componentProps: { maxlength: 100 },
      helpMessage: '如：第三方调查机构 / 在线问卷平台 / 社区入户调查',
    },
    {
      label: '有效调查问卷数（份）',
      field: 'validQuestionnaireCount',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0, style: 'width: 100%' },
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 160,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // resetFields 可能因表单未挂载不 resolve，超时兜底（历史坑）
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    savedId.value = '';
    await setFieldsValue({ surveyYear: YEAR_OPTIONS[0]?.value });
    await setProps({ disabled: false });
    setDrawerProps({ loading: false, showFooter: true });
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
    setDrawerProps({ loading: true });
    try {
      const res = await surveySave({
        surveyYear: data.surveyYear,
        dataSource: data.dataSource,
        validQuestionnaireCount: data.validQuestionnaireCount,
        remarks: data.remarks,
      });
      savedId.value = res.id;
      showMessage('保存成功，请进入编辑页维护问卷问题');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
