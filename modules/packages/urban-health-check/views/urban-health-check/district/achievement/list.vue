<!--
  市住更局 —— 区级体检成果管理（列表页）

  与市级的区别(转置关系):市级「一年一行、目录为单列」;区级「五类成果清单展开为五列」,
  列:序号/体检年份/体检片区/行政区划/功能定位/五类清单(各为提交状态)/填报单位/操作。
  菜单注册(菜单名称「区级体检成果管理」或同类):
   - 链接地址:/urban-health-check/district/achievement/list
   - 组件位置:/urban-health-check/district/achievement/list(与链接地址一致)
   - 是否可见:显示
  当前后端尚未介入，页面为纯 UI：不发起任何接口请求；
  字段与假数据定义见 @jeesite/urban-health-check/api/urban-health-check/district/achievement。
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
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.surveyArea">
          {{ record.surveyArea }}
        </a>
      </template>
      <template #functionPosition="{ record }">
        {{ (record.functionPosition || []).join('、') }}
      </template>
      <template #catalogStatus="{ record, column }">
        <Tag :color="'blue'" :variant="record[column.dataIndex] === '已提交' ? 'solid' : 'outlined'" style="border-radius: 10px">
          {{ record[column.dataIndex] }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementList">
  import { unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { DistrictAchievement } from '@jeesite/urban-health-check/api/urban-health-check/district/achievement';
  import { MOCK_LIST } from '@jeesite/urban-health-check/api/urban-health-check/district/achievement';
  import {
    ADMIN_DIVISIONS,
    FUNCTION_POSITIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '区级体检成果管理',
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
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' as const },
    { title: '体检年份', dataIndex: 'year', width: 100, align: 'center' as const },
    { title: '体检片区', dataIndex: 'surveyArea', width: 110, align: 'center' as const, slot: 'firstColumn' },
    { title: '行政区划', dataIndex: 'adminDivision', width: 100, align: 'center' as const },
    { title: '功能定位', dataIndex: 'functionPosition', width: 120, align: 'center' as const, slot: 'functionPosition' },
    { title: '问题整治清单', dataIndex: 'problemListStatus', width: 110, align: 'center' as const, slot: 'catalogStatus' },
    { title: '发展机遇清单', dataIndex: 'opportunityListStatus', width: 110, align: 'center' as const, slot: 'catalogStatus' },
    { title: '更新诉求清单', dataIndex: 'demandListStatus', width: 110, align: 'center' as const, slot: 'catalogStatus' },
    { title: '基础资料库', dataIndex: 'baseLibraryStatus', width: 110, align: 'center' as const, slot: 'catalogStatus' },
    { title: '更新项目储备建议库', dataIndex: 'reserveLibraryStatus', width: 110, align: 'center' as const, slot: 'catalogStatus' },
    { title: '填报单位', dataIndex: 'reportUnit', width: 120 },
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
        popConfirm: { title: '是否确认删除该成果记录？', confirm: () => handleDelete(record) },
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
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 删除 */
  function handleDelete(_record: DistrictAchievement) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
