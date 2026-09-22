<!--
  ifco —— 实施进度 · 基本信息只读表单（schedule/monthly 两抽屉步骤①共用，两域显示全部字段）

  项目基本信息十二字段恒只读（枚举值回填时转中文、片区名称空显示 /）：
  编号/名称/行政区/片区名称/片区批次/五改分类/项目归属 + 项目投资估算/年度投资计划/
  计划开工时间/计划竣工时间/入库时间。
  回填时机：表单挂载完成 或 record prop 整体替换（抽屉每次打开）。
-->
<template>
  <BasicForm @register="handleRegister" />
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSharedBasicInfoForm">
  import { ref, watch } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import {
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  /** 两域行共有的基本信息字段 */
  type BaseInfoRecord = {
    projectCode?: string;
    projectName?: string;
    district?: string;
    renewalAreaName?: string;
    renewalAreaBatch?: string;
    fiveReformType?: string;
    projectAffiliation?: string;
    investEstimate?: number;
    yearPlanInvest?: number;
    planStartDate?: string;
    planCompletionDate?: string;
    inLibraryDate?: string;
    [key: string]: unknown;
  };

  const props = defineProps<{
    record?: BaseInfoRecord;
  }>();

  const schemas: FormSchema[] = [
    { label: '项目基本信息', field: 'basicInfoGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '项目编号', field: 'projectCode', component: 'Input', dynamicDisabled: () => true },
    { label: '项目名称', field: 'projectName', component: 'Input', dynamicDisabled: () => true },
    { label: '行政区', field: 'district', component: 'Input', dynamicDisabled: () => true },
    { label: '片区名称', field: 'renewalAreaNameText', component: 'Input', dynamicDisabled: () => true },
    { label: '片区批次', field: 'renewalAreaBatchText', component: 'Input', dynamicDisabled: () => true },
    { label: '五改分类', field: 'fiveReformTypeText', component: 'Input', dynamicDisabled: () => true },
    { label: '项目归属', field: 'projectAffiliationText', component: 'Input', dynamicDisabled: () => true },
    { label: '项目投资估算(亿元)', field: 'investEstimate', component: 'Input', dynamicDisabled: () => true },
    { label: '年度投资计划(亿元)', field: 'yearPlanInvest', component: 'Input', dynamicDisabled: () => true },
    { label: '计划开工时间', field: 'planStartDate', component: 'Input', dynamicDisabled: () => true },
    { label: '计划竣工时间', field: 'planCompletionDate', component: 'Input', dynamicDisabled: () => true },
    { label: '入库时间', field: 'inLibraryDate', component: 'Input', dynamicDisabled: () => true },
  ];

  const [registerForm, { setFieldsValue }] = useForm({
    labelWidth: 140,
    schemas,
    showActionButtonGroup: false,
    baseColProps: { md: 12, lg: 12 },
  });

  const formReady = ref(false);

  function apply() {
    if (!props.record) return;
    setFieldsValue({
      projectCode: props.record.projectCode ?? '',
      projectName: props.record.projectName ?? '',
      district: props.record.district ?? '',
      renewalAreaNameText: props.record.renewalAreaName || '/',
      renewalAreaBatchText: renewalAreaBatchLabel(props.record.renewalAreaBatch ?? ''),
      fiveReformTypeText: fiveReformLabel(props.record.fiveReformType ?? ''),
      projectAffiliationText: projectAffiliationLabel(props.record.projectAffiliation ?? ''),
      investEstimate: props.record.investEstimate ?? '',
      yearPlanInvest: props.record.yearPlanInvest ?? '',
      planStartDate: props.record.planStartDate ?? '',
      planCompletionDate: props.record.planCompletionDate ?? '',
      inLibraryDate: props.record.inLibraryDate ?? '',
    });
  }

  function handleRegister(instance: FormActionType, uuid: string) {
    registerForm(instance, uuid);
    formReady.value = true;
    apply();
  }

  watch(
    () => props.record,
    () => {
      if (formReady.value) apply();
    },
  );
</script>
