<!--
  市住更局 —— 名城保护 · 巡查列表页实现（优保建筑巡查 / 拟保护建筑巡查共用）

  列与操作对齐老系统：序号/区/建筑原名称/巡查人/录入时间/巡查时间/是否特别关注/
  录入类型（PC|APP）/[是否上报]/操作（查看巡查、修改特别关注）。
  支持 ?parentId=&jzOldName= 路由参数定向进入（建筑列表「巡查记录(NN)」入口）。
  老系统列表的「联系电话」列无数据来源（三表均无巡查人电话），未实现。
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

      <template #sfTbgz="{ record }">
        <Tag :color="record.sfTbgz ? 'red' : 'default'">{{ record.sfTbgz ? '是' : '否' }}</Tag>
      </template>

      <template #typeView="{ record }">{{ record.typeView }}</template>

      <template v-if="showSfsb" #sfSb="{ record }">
        <Tag :color="record.sfSb ? 'green' : 'default'">{{ record.sfSb ? '已上报' : '未上报' }}</Tag>
      </template>
    </BasicTable>

    <InspectionDetailDrawer @register="registerDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedInspectionList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchInspectionPage,
    setInspectionAttention,
    InspectionRow,
  } from '@jeesite/urban-protection/api/urban-protection/inspection';
  import { fetchExcellentDict } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import InspectionDetailDrawer from './inspection-detail-drawer.vue';
  import { fmtDate, fmtDateTime } from './excellent-format';

  const props = defineProps<{
    /** excellent=优保巡查（父建筑在册） proposed=拟优保巡查 */
    scope: 'excellent' | 'proposed';
    /** 列表页标题（缺省取路由 meta.title） */
    title?: string;
    /** 是否展示「是否上报」列（拟优保巡查不展示） */
    showSfsb?: boolean;
  }>();

  const { createConfirm } = useMessage();
  const { meta, query } = unref(router.currentRoute);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:file-search-outlined',
    value: props.title ?? String(meta.title ?? '建筑巡查'),
  }));

  /** 区下拉（库内实际区名） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  /** 路由参数定向过滤（建筑列表「巡查记录」入口） */
  const routeParentId = String(query.parentId ?? '');
  const routeBuildingName = String(query.jzOldName ?? '');

  const tableColumns: BasicColumn[] = [
    { title: '区', dataIndex: 'qu', width: 110, ellipsis: true },
    { title: '建筑原名称', dataIndex: 'jzOldName', width: 200, slot: 'firstColumn' },
    { title: '巡查人', dataIndex: 'xcUserName', width: 90, align: 'center' },
    {
      title: '录入时间',
      dataIndex: 'czTime',
      width: 140,
      align: 'center',
      format: (text) => fmtDateTime(text as string),
    },
    { title: '巡查时间', dataIndex: 'xcTime', width: 110, align: 'center', format: (text) => fmtDate(text as string) },
    { title: '是否特别关注', dataIndex: 'sfTbgz', width: 110, align: 'center', slot: 'sfTbgz' },
    { title: '录入类型', dataIndex: 'typeView', width: 90, align: 'center', slot: 'typeView' },
  ];
  if (props.showSfsb !== false) {
    tableColumns.push({ title: '是否上报', dataIndex: 'sfSb', width: 90, align: 'center', slot: 'sfSb' });
  }

  const actionColumn: BasicColumn = {
    width: 180,
    actions: (record: Recordable) => [
      { label: '查看巡查', onClick: () => openDetail(record as InspectionRow) },
      {
        label: (record as InspectionRow).sfTbgz ? '取消特别关注' : '设为特别关注',
        onClick: () => toggleAttention(record as InspectionRow),
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchInspectionPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, xcTimeRange, ...rest } = params;
      const [begin, end] = Array.isArray(xcTimeRange) ? xcTimeRange : [];
      return {
        ...rest,
        scope: props.scope,
        pageNum: pageNo,
        pageSize,
        begin,
        end,
        parentId: routeParentId || rest.parentId,
        jzOldName: rest.jzOldName || routeBuildingName,
      };
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
        { label: '建筑原名称', field: 'jzOldName', component: 'Input' },
        { label: '巡查人', field: 'xcUserName', component: 'Input' },
        {
          label: '区',
          field: 'qu',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '巡查时间',
          field: 'xcTimeRange',
          component: 'RangePicker',
          componentProps: { valueFormat: 'YYYY-MM-DD' },
        },
        {
          label: '是否特别关注',
          field: 'sfTbgz',
          component: 'Select',
          componentProps: {
            options: [
              { label: '是', value: '1' },
              { label: '否', value: '0' },
            ],
            allowClear: true,
          },
        },
        ...(props.showSfsb !== false
          ? [
              {
                label: '是否上报',
                field: 'sfSb',
                component: 'Select' as const,
                componentProps: {
                  options: [
                    { label: '已上报', value: '1' },
                    { label: '未上报', value: '0' },
                  ],
                  allowClear: true,
                },
              },
            ]
          : []),
      ],
    },
  });

  function openDetail(record: InspectionRow) {
    openDrawer(true, { id: record.id });
  }

  function toggleAttention(record: InspectionRow) {
    const next = record.sfTbgz ? '0' : '1';
    const actionText = record.sfTbgz ? '取消特别关注' : '设为特别关注';
    createConfirm({
      iconType: 'warning',
      title: `确认${actionText}？`,
      content: `建筑「${record.jzOldName}」${fmtDate(record.xcTime)} 的巡查记录`,
      onOk: async () => {
        await setInspectionAttention(record.id, next as '0' | '1');
        reload();
      },
    });
  }
</script>
