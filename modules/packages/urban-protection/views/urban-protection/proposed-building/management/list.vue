<!--
  市住更局 —— 名城保护 · 拟优保管理列表

  数据：WHFW_OLDJZ（拟优保建筑主表，经 /a/urban-protection/proposed/* 接口）。
  列对齐老系统：所在行政区/建筑名称/建筑坐落/纳入巡查/巡查记录总数；
  操作：巡查记录(N)/纳入巡查切换/修改/删除（软删，无还原，对齐老系统）。
  表无坐标与保护等级等字段，故无对应列；纳入巡查（ISPATROL）是拟优保巡查报表应巡查量的基数。
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

      <template #isPatrol="{ record }">
        <Tag :color="record.isPatrol ? 'green' : 'default'">{{ record.isPatrol ? '是' : '否' }}</Tag>
      </template>

      <template #xcCount="{ record }">
        <a @click="gotoInspections(record)" title="查看该建筑巡查记录">{{ record.xcCount }}</a>
      </template>
    </BasicTable>

    <InputForm @register="registerFormDrawer" @success="reload" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingManagementList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchProposedPage,
    deleteProposed,
    toggleProposedPatrol,
    fetchProposedDict,
    ProposedRow,
  } from '@jeesite/urban-protection/api/urban-protection/proposed';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const { showMessage, createConfirm } = useMessage();

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:home-outlined',
    value: meta.title || '拟优保管理列表',
  }));

  /** 行政区下拉（库内实际区名） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchProposedDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  const tableColumns: BasicColumn[] = [
    { title: '所在行政区', dataIndex: 'xzqName', width: 110 },
    { title: '建筑名称', dataIndex: 'jzOldName', width: 260, slot: 'firstColumn' },
    { title: '建筑坐落', dataIndex: 'jzLoccation', width: 260, ellipsis: true },
    { title: '纳入巡查', dataIndex: 'isPatrol', width: 100, align: 'center', slot: 'isPatrol' },
    { title: '巡查记录总数', dataIndex: 'xcCount', width: 120, align: 'center', slot: 'xcCount' },
  ];

  const actionColumn: BasicColumn = {
    width: 300,
    actions: (record: Recordable) => [
      { label: `巡查记录(${record.xcCount})`, onClick: () => gotoInspections(record as ProposedRow) },
      {
        label: (record as ProposedRow).isPatrol ? '取消纳入' : '纳入巡查',
        color: (record as ProposedRow).isPatrol ? 'warning' : 'success',
        onClick: () => togglePatrol(record as ProposedRow),
      },
      { label: '修改', onClick: () => handleForm(record) },
      {
        label: '删除',
        color: 'error',
        popConfirm: {
          title: `是否确认删除「${record.jzOldName}」？`,
          confirm: () => handleDelete(record as ProposedRow),
        },
      },
    ],
  };

  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchProposedPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      return { ...rest, pageNum: pageNo, pageSize };
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
      schemas: [
        { label: '建筑名称', field: 'jzOldName', component: 'Input' },
        {
          label: '所在行政区',
          field: 'xzqName',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
      ],
    },
  });

  function handleForm(record: Recordable) {
    openFormDrawer(true, { ...record, _isNew: !!record.isNewRecord });
  }

  /** 跳转拟保护建筑巡查列表，定向该建筑 */
  function gotoInspections(record: ProposedRow) {
    router.push({
      path: '/urban-protection/proposed-building/inspection/list',
      query: { parentId: record.id, jzOldName: record.jzOldName },
    });
  }

  /** 纳入/取消纳入巡查（拟优保巡查报表应巡查量只计已纳入建筑） */
  function togglePatrol(record: ProposedRow) {
    const next = record.isPatrol ? '0' : '1';
    const actionText = record.isPatrol ? '取消纳入巡查' : '纳入巡查';
    createConfirm({
      iconType: 'warning',
      title: `确认${actionText}？`,
      content: `建筑「${record.jzOldName}」`,
      onOk: async () => {
        await toggleProposedPatrol(record.id, next);
        showMessage(`${actionText}成功`);
        reload();
      },
    });
  }

  async function handleDelete(record: ProposedRow) {
    await deleteProposed(record.id);
    showMessage('删除成功');
    reload();
  }
</script>
