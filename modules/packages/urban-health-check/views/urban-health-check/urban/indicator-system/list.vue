<!--
  市住更局 —— 体检指标体系管理（列表页）

  组件格式 / 页面布局对齐 packages/core/views/sys/area：
   - BasicTable + useTable + 搜索 FormProps（schemas） + actionColumn
   - 新增/编辑/查看 表单使用 BasicDrawer（useDrawer），而非 Modal
  字段与接口走 @jeesite/urban-health-check 的 indicatorSystem API（defHttp + adminPath）。
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
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })">
          {{ record.indicatorName }}
        </a>
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

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorSystemList">
  import { ref, unref } from 'vue';
  import { Switch, Tag } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { IndicatorSystem } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import {
    ENABLED_STATUS,
    SUBMIT_STATUS,
    indicatorSystemDelete,
    indicatorSystemDisable,
    indicatorSystemEnable,
    indicatorSystemListData,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标体系管理',
  };

  /** 体检年份下拉选项（近 5 年） */
  const YEAR_OPTIONS = ['2026', '2025', '2024', '2023', '2022'].map((year) => ({
    label: `${year} 年`,
    value: year,
  }));

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Select',
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
      },
      {
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 100 },
    { title: '体检年份', dataIndex: 'year', width: 100 },
    { title: '指标体系名称', dataIndex: 'indicatorName', slot: 'firstColumn' },
    { title: '指标数量（项）', dataIndex: 'indicatorCount', width: 120, align: 'center' },
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
        icon: 'i-clarity:view-line',
        title: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        icon: 'i-clarity:note-edit-line',
        title: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
      {
        icon: 'i-ant-design:delete-outlined',
        color: 'error',
        title: '删除',
        popConfirm: { title: '是否确认删除该体系？', confirm: () => handleDelete(record) },
        ifShow: () => record.submitStatus === SUBMIT_STATUS.PENDING,
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: indicatorSystemListData,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 启用状态切换 */
  async function handleToggleEnabled(record: IndicatorSystem, checked: boolean) {
    record.enabled = checked ? ENABLED_STATUS.ENABLED : ENABLED_STATUS.DISABLED;
    const api = checked ? indicatorSystemEnable : indicatorSystemDisable;
    const res = await api({ code: record.code });
    if (res) {
      showMessage(res.message);
    }
    reload();
  }

  /** 删除 */
  async function handleDelete(record: IndicatorSystem) {
    const res = await indicatorSystemDelete({ code: record.code });
    showMessage(res.message);
    reload();
  }

  function handleSuccess() {
    reload();
  }
</script>
