<!--
  市住更局 —— 名城保护 · 优保推荐建筑查询（列表页）

  数据：WHFW_AQJD_EXCELLENT_TJ（新表，老系统推荐数据源无对应表，落地为本表）。
  列对齐老系统：序号/建筑位置/建筑名称/推荐人姓名/手机号码/推荐时间/推荐理由 +
  操作（查看详情）；老系统另有「导出EXCEL」，待统一导出方案后补。
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
        <a @click="openDetail(record)" :title="record.jzmc">{{ record.jzmc }}</a>
      </template>

      <template #tjsj="{ record }">{{ fmtDate(record.tjsj) || '—' }}</template>
    </BasicTable>

    <DetailDrawer @register="registerDetailDrawer" />
    <InputForm @register="registerFormDrawer" @success="reload" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRecommendationList">
  import { computed, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchRecommendPage,
    deleteRecommend,
    RecommendRow,
  } from '@jeesite/urban-protection/api/urban-protection/recommend';
  import { fmtDate } from '../../shared/excellent-format';
  import DetailDrawer from './detail-drawer.vue';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:like-outlined',
    value: meta.title || '优保推荐建筑查询',
  }));

  const tableColumns: BasicColumn[] = [
    { title: '建筑位置', dataIndex: 'jzwz', width: 240, slot: 'firstColumn' },
    { title: '建筑名称', dataIndex: 'jzmc', width: 200, ellipsis: true },
    { title: '推荐人姓名', dataIndex: 'tjrxm', width: 110, align: 'center', format: (text) => text || '—' },
    { title: '手机号码', dataIndex: 'sjhm', width: 130, align: 'center', format: (text) => text || '—' },
    { title: '推荐时间', dataIndex: 'tjsj', width: 110, align: 'center', slot: 'tjsj' },
    { title: '推荐理由', dataIndex: 'tjly', ellipsis: true },
  ];

  const actionColumn: BasicColumn = {
    width: 200,
    actions: (record: Recordable) => [
      { label: '查看详情', onClick: () => openDetail(record as RecommendRow) },
      { label: '修改', onClick: () => handleForm(record) },
      {
        label: '删除',
        color: 'error',
        popConfirm: {
          title: `是否确认删除「${record.jzmc}」的推荐记录？`,
          confirm: () => handleDelete(record as RecommendRow),
        },
      },
    ],
  };

  const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();
  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchRecommendPage,
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
        { label: '建筑位置', field: 'jzwz', component: 'Input' },
        { label: '建筑名称', field: 'jzmc', component: 'Input' },
        { label: '推荐人姓名', field: 'tjrxm', component: 'Input' },
        { label: '手机号码', field: 'sjhm', component: 'Input' },
      ],
    },
  });

  function openDetail(record: RecommendRow) {
    openDetailDrawer(true, { id: record.id });
  }

  /** 打开表单抽屉（先回填后掀开） */
  function handleForm(record: Recordable) {
    openFormDrawer(true, { ...record, _isNew: !!record.isNewRecord });
  }

  async function handleDelete(record: RecommendRow) {
    await deleteRecommend(record.id);
    showMessage('删除成功');
  }
</script>
