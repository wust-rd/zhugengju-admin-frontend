<!--
  市住更局 —— 指标项结果管理（列表页）

  菜单注册（菜单名称「指标项结果管理」）:
   - 链接地址:/urban-health-check/urban/indicator-result/list
   - 组件位置:/urban-health-check/urban/indicator-result/list(与链接地址一致)
   - 是否可见:显示
  show 页路由(RESTful,后端隐藏菜单,待注册):
   - 链接地址:/urban-health-check/urban/indicator-result/{id}(与 /list 静态段不冲突)
   - 上级菜单挂「指标项结果管理」以点亮侧边栏(配方同 indicator-system)
  组件格式 / 页面布局对齐 indicator-system/list.vue；
  当前后端尚未介入，页面为纯 UI：不发起任何接口请求；
  字段与假数据定义见 @jeesite/urban-health-check/api/urban-health-check/urban/indicator-result。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
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
    </BasicTable>

    <InputForm :district="district" @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultList">
  import { unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { IndicatorResult } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { MOCK_LIST } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
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
    { title: '已填报结果的指标数量（项）', dataIndex: 'filledCount', width: 180, align: 'center' as const },
    { title: '未填报结果的指标数量（项）', dataIndex: 'unfilledCount', width: 180, align: 'center' as const },
    { title: '预警指标数量（项）', dataIndex: 'warningCount', width: 140, align: 'center' as const },
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该结果？', confirm: () => handleDelete(record) },
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
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见对应 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 打开该结果的 show 页(RESTful:/…/indicator-result/{id}) */
  function handleDetail(record: Recordable) {
    go(`${props.routeBase}/${record.code}`);
  }

  /** 删除 */
  function handleDelete(_record: IndicatorResult) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
