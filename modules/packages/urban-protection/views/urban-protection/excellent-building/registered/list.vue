<!--
  市住更局 —— 名城保护 · 在册优保建筑（列表页）

  数据：WHFW_AQJD_EXCELLENT 中 STATUS 非 0 且未删除（scope=registered）。
  列/操作对齐老系统：所在行政区/建筑原名称/建筑现使用名称/建筑坐落/建成年代/
  建筑面积/产权人/保护等级/公布批次/公布时间/巡查记录总数 + 基本信息、巡查记录(NN)。
  「查看责任书」老系统可打开责任书原件，现三表只存上传标记（SFSCZRZ），
  此处以状态列呈现，原件查看待责任书文件存储接入后再做。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>

      <template #firstColumn="{ record }">
        <a @click="openDetail(record)" :title="record.jzOldName">{{ record.jzOldName }}</a>
      </template>

      <template #protectLeve="{ record }">
        <Tag v-if="record.protectLeve" color="gold" style="border-radius: 10px">
          {{ protectLevelLabel(record.protectLeve) }}
        </Tag>
        <span v-else>—</span>
      </template>

      <template #publishPc="{ record }">{{ batchLabel(record.publishPc) || '—' }}</template>

      <template #sfScZrz="{ record }">
        <Tag :color="record.sfScZrz ? 'green' : 'default'">{{ record.sfScZrz ? '已上传' : '未上传' }}</Tag>
      </template>

      <template #xcCount="{ record }">
        <a @click="gotoInspections(record)" title="查看该建筑巡查记录">{{ record.xcCount }}</a>
      </template>
    </BasicTable>

    <ExcellentDetailDrawer @register="registerDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRegisteredList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import {
    fetchExcellentPage,
    fetchExcellentDict,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import ExcellentDetailDrawer from '../../shared/excellent-detail-drawer.vue';
  import { protectLevelLabel, batchLabel } from '../../shared/excellent-format';

  const { meta } = unref(router.currentRoute);
  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:bank-outlined',
    value: meta.title || '在册优保建筑',
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
    { title: '建成年代', dataIndex: 'buildYear', width: 110, align: 'center', format: (text) => text || '—' },
    { title: '建筑面积(平方米)', dataIndex: 'jzArar', width: 120, align: 'right', format: (text) => text || '—' },
    { title: '产权人', dataIndex: 'cqr', width: 130, ellipsis: true, format: (text) => text || '—' },
    { title: '保护等级', dataIndex: 'protectLeve', width: 90, align: 'center', slot: 'protectLeve' },
    { title: '公布批次', dataIndex: 'publishPc', width: 100, align: 'center', slot: 'publishPc' },
    { title: '公布时间', dataIndex: 'publishTime', width: 90, align: 'center', format: (text) => text || '—' },
    { title: '责任书', dataIndex: 'sfScZrz', width: 90, align: 'center', slot: 'sfScZrz' },
    { title: '巡查记录总数', dataIndex: 'xcCount', width: 110, align: 'center', slot: 'xcCount' },
  ];

  const actionColumn: BasicColumn = {
    width: 200,
    actions: (record: Recordable) => [
      { label: '基本信息', onClick: () => openDetail(record as ExcellentRow) },
      { label: `巡查记录(${record.xcCount})`, onClick: () => gotoInspections(record as ExcellentRow) },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();

  const [registerTable] = useTable({
    api: fetchExcellentPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      return { ...rest, scope: 'registered', pageNum: pageNo, pageSize };
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

  function openDetail(record: ExcellentRow) {
    openDrawer(true, { id: record.id });
  }

  /** 跳转优保建筑巡查列表，定向该建筑 */
  function gotoInspections(record: ExcellentRow) {
    router.push({
      path: '/urban-protection/excellent-building/inspection/list',
      query: { parentId: record.id, jzOldName: record.jzOldName },
    });
  }
</script>
