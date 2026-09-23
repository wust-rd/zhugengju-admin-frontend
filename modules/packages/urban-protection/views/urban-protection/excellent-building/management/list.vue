<!--
  市住更局 —— 名城保护 · 优保建筑管理（列表页，含拟优保与已删除）

  数据：WHFW_AQJD_EXCELLENT 全量（scope=all，含逻辑删除行）。
  状态口径：STATUS='0' 拟优保、ISDELETE='1' 已删除、其余在册。
  操作对齐老系统：修改 / 还原优保建筑（已删行）/ 巡查记录(NN)；新增走 02 表单。
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
        <a v-if="!record.deleted" @click="openDetail(record)" :title="record.jzOldName">{{ record.jzOldName }}</a>
        <span v-else :title="record.jzOldName" class="text-gray-400">{{ record.jzOldName }}</span>
      </template>

      <template #statusView="{ record }">
        <Tag v-if="record.deleted" color="red">已删除</Tag>
        <Tag v-else-if="record.proposed" color="blue">拟优保</Tag>
        <Tag v-else color="green">在册</Tag>
      </template>

      <template #protectLeve="{ record }">
        <Tag v-if="record.protectLeve" color="gold" style="border-radius: 10px">
          {{ protectLevelLabel(record.protectLeve) }}
        </Tag>
        <span v-else>—</span>
      </template>

      <template #xcCount="{ record }">
        <a @click="gotoInspections(record)" title="查看该建筑巡查记录">{{ record.xcCount }}</a>
      </template>
    </BasicTable>

    <InputForm @register="registerFormDrawer" @success="reload" />
    <ExcellentDetailDrawer @register="registerDetailDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingManagementList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchExcellentPage,
    fetchExcellentDict,
    restoreExcellent,
    deleteExcellent,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import InputForm from './form.vue';
  import ExcellentDetailDrawer from '../../shared/excellent-detail-drawer.vue';
  import { protectLevelLabel } from '../../shared/excellent-format';

  const { meta } = unref(router.currentRoute);
  const { createConfirm, showMessage } = useMessage();

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:bank-outlined',
    value: meta.title || '优保建筑管理',
  }));

  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  const tableColumns: BasicColumn[] = [
    { title: '所在行政区', dataIndex: 'xzqName', width: 100 },
    { title: '建筑原名称', dataIndex: 'jzOldName', width: 180, slot: 'firstColumn' },
    { title: '建筑现使用名称', dataIndex: 'jzNowName', width: 150, ellipsis: true, format: (text) => text || '—' },
    { title: '建筑坐落', dataIndex: 'jzLoccation', width: 220, ellipsis: true },
    { title: '建成年份', dataIndex: 'buildYear', width: 110, align: 'center', format: (text) => text || '—' },
    { title: '建筑面积(平方米)', dataIndex: 'jzArar', width: 120, align: 'right', format: (text) => text || '—' },
    { title: '产权人', dataIndex: 'cqr', width: 120, ellipsis: true, format: (text) => text || '—' },
    { title: '状态', dataIndex: 'statusView', width: 90, align: 'center', slot: 'statusView' },
    { title: '保护等级', dataIndex: 'protectLeve', width: 90, align: 'center', slot: 'protectLeve' },
    { title: '公布时间', dataIndex: 'publishTime', width: 90, align: 'center', format: (text) => text || '—' },
    { title: '巡查记录总数', dataIndex: 'xcCount', width: 110, align: 'center', slot: 'xcCount' },
  ];

  const actionColumn: BasicColumn = {
    width: 230,
    actions: (record: Recordable) => {
      const row = record as ExcellentRow;
      const actions: Recordable[] = [];
      if (row.deleted) {
        actions.push({ label: '还原优保建筑', onClick: () => handleRestore(row) });
      } else {
        actions.push({ label: '修改', onClick: () => handleForm(row) });
        actions.push({ label: `巡查记录(${row.xcCount})`, onClick: () => gotoInspections(row) });
        actions.push({
          label: '删除',
          color: 'error',
          popConfirm: { title: `是否确认删除「${row.jzOldName}」？`, confirm: () => handleDelete(row) },
        });
      }
      return actions;
    },
  };

  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();
  const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchExcellentPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      return { ...rest, scope: 'all', pageNum: pageNo, pageSize };
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
        {
          label: '所在区',
          field: 'xzqName',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '保护等级',
          field: 'protectLeve',
          component: 'Select',
          componentProps: {
            options: [
              { label: '一级', value: '1' },
              { label: '二级', value: '2' },
            ],
            allowClear: true,
          },
        },
        { label: '建筑名称(原)', field: 'jzOldName', component: 'Input' },
        { label: '建筑名称(现)', field: 'jzNowName', component: 'Input' },
      ],
    },
  });

  /** 打开表单抽屉（先回填后掀开，避免动画期间翻转表单内容） */
  function handleForm(record: Recordable) {
    const isNew = !!record.isNewRecord;
    const data = { ...record, _isNew: isNew };
    openFormDrawer(true, data);
  }

  function openDetail(record: ExcellentRow) {
    openDetailDrawer(true, { id: record.id });
  }

  /** 跳转优保建筑巡查列表，定向该建筑 */
  function gotoInspections(record: ExcellentRow) {
    const base = record.proposed
      ? '/urban-protection/proposed-building/inspection/list'
      : '/urban-protection/excellent-building/inspection/list';
    router.push({ path: base, query: { parentId: record.id, jzOldName: record.jzOldName } });
  }

  function handleRestore(record: ExcellentRow) {
    createConfirm({
      iconType: 'warning',
      title: '确认还原该优保建筑？',
      content: `「${record.jzOldName}」将恢复为删除前状态`,
      onOk: async () => {
        await restoreExcellent(record.id);
        showMessage('还原成功');
        reload();
      },
    });
  }

  async function handleDelete(record: ExcellentRow) {
    await deleteExcellent(record.id);
    showMessage('删除成功');
  }
</script>
