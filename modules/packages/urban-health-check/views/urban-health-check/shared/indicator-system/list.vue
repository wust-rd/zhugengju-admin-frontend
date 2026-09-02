<!--
  市住更局 —— 体检指标体系管理（列表页）

  组件格式 / 页面布局对齐 packages/core/views/sys/area：
   - BasicTable + useTable + 搜索 FormProps（schemas） + actionColumn
   - 新增/编辑/查看 表单使用 BasicDrawer（useDrawer），而非 Modal
  当前后端尚未介入，页面为纯 UI：不发起任何接口请求；
  字段与常量定义见 @jeesite/urban-health-check/api/urban-health-check/urban/indicator-system。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleDetail(record)" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #functionPosition="{ record }">
        {{ (record.functionPosition || []).join('、') }}
      </template>
      <template #enabled="{ record }">
        <Switch
          :checked="record.enabled === ENABLED_STATUS.ENABLED"
          checked-children="启用"
          un-checked-children="停用"
          @change="(checked) => handleToggleEnabled(record, checked)"
        />
      </template>
      <template #submitStatus="{ record }">
        <Tag
          :color="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'blue' : 'blue'"
          :variant="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'solid' : 'outlined'"
          style="border-radius: 10px"
        >
          {{ record.submitStatus === SUBMIT_STATUS.SUBMITTED ? '已提交' : '待提交' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm :district="district" @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorSystemList">
  import { unref } from 'vue';
  import { Switch, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { IndicatorSystem } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    ENABLED_STATUS,
    MOCK_LIST,
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';
  import {
    ADMIN_DIVISIONS,
    FUNCTION_POSITIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';

  const { meta } = unref(router.currentRoute);
  const go = useGo();

  const props = defineProps({
    /** 本级路由基址,如 /urban-health-check/urban/indicator-system */
    routeBase: { type: String, required: true },
    /** 区级体检:搜索表单附加 体检片区/行政区划/功能定位 */
    district: { type: Boolean, default: false },
  });
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标体系管理',
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
              componentProps: { options: toOptions(ADMIN_DIVISIONS), allowClear: true },
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

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '编码', dataIndex: 'code', width: 100 },
    { title: '体检年份', dataIndex: 'year', width: 100 },
    ...(props.district
      ? [
          { title: '体检片区', dataIndex: 'surveyArea', width: 110, align: 'center' as const },
          { title: '行政区划', dataIndex: 'adminDivision', width: 100, align: 'center' as const },
          { title: '功能定位', dataIndex: 'functionPosition', width: 120, align: 'center' as const, slot: 'functionPosition' },
        ]
      : []),
    { title: '指标体系名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 150 },
    { title: '指标数量（项）', dataIndex: 'indicatorCount', width: 120, align: 'center' as const },
    { title: '填报单位', dataIndex: 'reportUnit', width: 120 },
    { title: '填报时间', dataIndex: 'reportDate', width: 130 },
    { title: '启用状态', dataIndex: 'enabled', width: 110, align: 'center', slot: 'enabled' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 110, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列（查看始终可；编辑/删除仅待提交时显示） */
  const actionColumn: BasicColumn = {
    width: 200,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该体系？', confirm: () => handleDelete(record) },
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable] = useTable({
    dataSource: MOCK_LIST,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 打开该体系的 show 页(RESTful:/…/indicator-system/{id}) */
  function handleDetail(record: Recordable) {
    go(`${props.routeBase}/${record.code}`);
  }

  /** 启用状态切换（纯 UI，仅更新本地行数据） */
  function handleToggleEnabled(record: IndicatorSystem, checked: boolean) {
    // TODO: 后端接入后调用启用/停用接口
    record.enabled = checked ? ENABLED_STATUS.ENABLED : ENABLED_STATUS.DISABLED;
  }

  /** 删除 */
  function handleDelete(_record: IndicatorSystem) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
