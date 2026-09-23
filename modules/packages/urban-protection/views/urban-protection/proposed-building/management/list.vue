<!--
  市住更局 —— 名城保护 · 拟优保管理列表

  数据：WHFW_AQJD_EXCELLENT 中 STATUS='0'（scope=proposed）。
  列对齐老系统：所在行政区/建筑名称/建筑坐标/巡查记录总数 + 巡查记录(NN)/修改/删除。
  老系统另有「纳入巡查」列，三表无对应字段，未实现。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
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
        <a @click="gotoInspections(record)" :title="record.jzOldName">{{ record.jzOldName }}</a>
      </template>

      <template #location="{ record }">
        {{ [record.locationY, record.locationX].filter(Boolean).join(', ') || '—' }}
      </template>

      <template #xcCount="{ record }">
        <a @click="gotoInspections(record)" title="查看该建筑巡查记录">{{ record.xcCount }}</a>
      </template>
    </BasicTable>

    <InputForm @register="registerFormDrawer" @success="reload" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingManagementList">
  import { computed, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchExcellentPage,
    deleteExcellent,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:home-outlined',
    value: meta.title || '拟优保管理列表',
  }));

  const tableColumns: BasicColumn[] = [
    { title: '所在行政区', dataIndex: 'xzqName', width: 110 },
    { title: '建筑名称', dataIndex: 'jzOldName', width: 260, slot: 'firstColumn' },
    { title: '建筑坐标', dataIndex: 'location', width: 260, slot: 'location' },
    { title: '巡查记录总数', dataIndex: 'xcCount', width: 120, align: 'center', slot: 'xcCount' },
  ];

  const actionColumn: BasicColumn = {
    width: 220,
    actions: (record: Recordable) => [
      { label: `巡查记录(${record.xcCount})`, onClick: () => gotoInspections(record as ExcellentRow) },
      { label: '修改', onClick: () => handleForm(record) },
      {
        label: '删除',
        color: 'error',
        popConfirm: {
          title: `是否确认删除「${record.jzOldName}」？`,
          confirm: () => handleDelete(record as ExcellentRow),
        },
      },
    ],
  };

  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchExcellentPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      return { ...rest, scope: 'proposed', pageNum: pageNo, pageSize };
    },
    columns: tableColumns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 100,
      schemas: [{ label: '建筑名称', field: 'jzOldName', component: 'Input' }],
    },
  });

  function handleForm(record: Recordable) {
    openFormDrawer(true, { ...record, _isNew: !!record.isNewRecord });
  }

  /** 跳转拟保护建筑巡查列表，定向该建筑 */
  function gotoInspections(record: ExcellentRow) {
    router.push({
      path: '/urban-protection/proposed-building/inspection/list',
      query: { parentId: record.id, jzOldName: record.jzOldName },
    });
  }

  async function handleDelete(record: ExcellentRow) {
    await deleteExcellent(record.id);
    showMessage('删除成功');
  }
</script>
