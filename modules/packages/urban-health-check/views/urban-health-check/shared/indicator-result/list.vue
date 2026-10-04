<!--
  市住更局 —— 指标项结果管理（列表页）

  菜单注册（菜单名称「指标项结果管理」）:
   - 链接地址:/urban-health-check/urban/indicator-result/list
   - 组件位置:/urban-health-check/urban/indicator-result/list(与链接地址一致)
  接口已接入：indicatorResultStatPage（/cityCheck/indicatorResult/statPage，
  入参 setYear/setName）。每行展示模块一（指标体系管理）填的体系及其填报统计；
  指标数量/体系名称/操作列(查看、编辑) 点击进入 show 页维护结果明细（{id}=体系主键）。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleDetail(record)" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #indicatorCount="{ record }">
        <a @click="handleDetail(record)">{{ record.indicatorCount ?? 0 }}</a>
      </template>
      <template #functionPosition="{ record }">
        {{ (record.functionPosition || []).join('、') }}
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultList">
  import { unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { FormProps } from '@jeesite/core/components/Form';
  import { indicatorResultStatPage } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    DISTRICTS,
    FUNCTION_POSITIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';

  const { meta } = unref(router.currentRoute);
  const go = useGo();

  const props = defineProps({
    /** 本级路由基址,如 /urban-health-check/urban/indicator-result */
    routeBase: { type: String, required: true },
    /** 区级体检:搜索表单附加 体检片区/行政区划/功能定位（后端 statPage 暂不支持，仅展示） */
    district: { type: Boolean, default: false },
  });
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标项结果管理',
  };

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Select' as const,
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
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
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
      },
    ],
  };

  /** 表格列（对齐原型：序号/年份/名称/四项统计/操作） */
  const tableColumns: BasicColumn[] = [
    { title: '体检年份', dataIndex: 'year', width: 100, align: 'center' as const },
    ...(props.district
      ? [
          { title: '体检片区', dataIndex: 'surveyArea', width: 110, align: 'center' as const },
          { title: '行政区划', dataIndex: 'adminDivision', width: 100, align: 'center' as const },
          { title: '功能定位', dataIndex: 'functionPosition', width: 120, align: 'center' as const, slot: 'functionPosition' },
        ]
      : []),
    { title: '指标体系名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 220 },
    { title: '指标数量（项）', dataIndex: 'indicatorCount', slot: 'indicatorCount', width: 120, align: 'center' as const },
    { title: '已填报结果的指标数量（项）', dataIndex: 'filledCount', width: 180, align: 'center' as const },
    { title: '未填报结果的指标数量（项）', dataIndex: 'unfilledCount', width: 180, align: 'center' as const },
    { title: '预警指标数量（项）', dataIndex: 'warningCount', width: 140, align: 'center' as const },
  ];

  /** 操作列（查看/编辑同入 show 页；行级只读由 submitStatus 决定） */
  const actionColumn: BasicColumn = {
    width: 110,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleDetail(record) },
      { label: '编辑', onClick: () => handleDetail(record) },
    ],
  };

  const [registerTable] = useTable({
    api: indicatorResultStatPage,
    columns: tableColumns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: true,
    pagination: true,
    canResize: true,
    formConfig: searchForm,
  });

  /** 打开该体系的结果 show 页(RESTful:/…/indicator-result/{id}，id=体系主键) */
  function handleDetail(record: Recordable) {
    go(`${props.routeBase}/${record.id}`);
  }
</script>
