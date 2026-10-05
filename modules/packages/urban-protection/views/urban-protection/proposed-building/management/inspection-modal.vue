<!--
  市住更局 —— 名城保护 · 拟优保管理 · 巡查记录弹框

  列表操作「巡查记录」弹出（对齐老系统弹框）：该建筑的巡查记录列表（WHFW_OLDJZ_XC，
  经 /a/urban-protection/proposed/inspection/* 接口），
  列：序号/区划/建筑原名称/巡查人/录入时间/巡查时间/联系电话/是否特别关注/录入类型/操作(查看巡查)。
  搜索条件对齐老系统「详细查询」：巡查日期(区间) / 巡检人姓名 / 是否特别关注(含全部)。
  工具栏对齐老系统：导出EXCEL（导出该建筑巡查记录全量）。
  联系电话三表无数据来源，恒显 —；查看巡查复用 shared/inspection-detail-drawer.vue。
  打开时序：list.vue 用 openModal(false, { id, jzOldName }) 只传数据不掀开，
  本组件拿到 parentId 查询完成后再 setModalProps({ open: true })。
-->
<template>
  <!-- force-render：内容随页面挂载（同抽屉约定），保证回调里 reload() 时表格实例已注册 -->
  <BasicModal v-bind="$attrs" :width="1200" :footer="null" force-render @register="registerModal">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
      <template #toolbar>
        <a-button :loading="exporting" @click="handleExport()">
          <Icon icon="i-ant-design:download-outlined" /> 导出EXCEL
        </a-button>
      </template>

      <template #sfTbgz="{ record }">
        <Tag :color="record.sfTbgz ? 'red' : 'default'">{{ record.sfTbgz ? '是' : '否' }}</Tag>
      </template>
    </BasicTable>

    <InspectionDetailDrawer scope="proposed" @register="registerDetailDrawer" />
  </BasicModal>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingManagementInspectionModal">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicModal, useModalInner } from '@jeesite/core/components/Modal';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import {
    fetchProposedInspectionPage,
    ProposedInspectionRow,
  } from '@jeesite/urban-protection/api/urban-protection/proposed';
  import InspectionDetailDrawer from '../../shared/inspection-detail-drawer.vue';
  import { exportBorderedSheet } from '../../shared/excel-export';
  import { fmtDate } from '../../shared/excellent-format';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';

  const { meta } = unref(router.currentRoute);

  const parentId = ref('');
  const buildingName = ref('');

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:file-search-outlined',
    value: buildingName.value ? `巡查记录 - ${buildingName.value}` : '巡查记录',
  }));

  const tableColumns: BasicColumn[] = [
    { title: '区划', dataIndex: 'qu', width: 100, ellipsis: true },
    { title: '建筑原名称', dataIndex: 'jzOldName', width: 180, ellipsis: true },
    { title: '巡查人', dataIndex: 'xcUserName', width: 90, align: 'center' },
    {
      title: '录入时间',
      dataIndex: 'czTime',
      width: 110,
      align: 'center',
      format: (text) => fmtDate(text as string) || '—',
    },
    {
      title: '巡查时间',
      dataIndex: 'xcTime',
      width: 110,
      align: 'center',
      format: (text) => fmtDate(text as string) || '—',
    },
    // 联系电话：三表无数据来源，恒显 —
    { title: '联系电话', dataIndex: 'phone', width: 110, align: 'center', format: () => '—' },
    { title: '是否特别关注', dataIndex: 'sfTbgz', width: 110, align: 'center', slot: 'sfTbgz' },
    { title: '录入类型', dataIndex: 'typeView', width: 90, align: 'center' },
  ];

  const actionColumn: BasicColumn = {
    width: 100,
    actions: (record: Recordable) => [
      { label: '查看巡查', onClick: () => openDetail(record as ProposedInspectionRow) },
    ],
  };

  const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();

  const exporting = ref(false);

  /** 导出EXCEL：导出该建筑巡查记录全量（联系电话无字段，导出为 —） */
  async function handleExport() {
    exporting.value = true;
    try {
      const data = await fetchProposedInspectionPage({
        parentId: parentId.value,
        pageNum: 1,
        pageSize: 9999,
      });
      const rows: (string | number)[][] = [
        ['序号', '区划', '建筑原名称', '巡查人', '录入时间', '巡查时间', '联系电话', '是否特别关注', '录入类型'],
        ...data.list.map((r, i) => [
          i + 1, r.qu, r.jzOldName, r.xcUserName, fmtDate(r.czTime), fmtDate(r.xcTime), '—',
          r.sfTbgz ? '是' : '否', r.typeView || '—',
        ]),
      ];
      exportBorderedSheet(
        `巡查记录_${buildingName.value || '拟优保建筑'}_${dateUtil().format('YYYYMMDD')}.xlsx`,
        rows,
        [6, 10, 30, 10, 12, 12, 12, 12, 10].map((wch) => ({ wch })),
        { title: '巡查记录' },
      );
    } finally {
      exporting.value = false;
    }
  }

  const [registerTable, { reload }] = useTable({
    api: fetchProposedInspectionPage,
    // 弹框懒挂载：等 useModalInner 拿到 parentId 再首次查询
    immediate: false,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, xcTimeRange, sfTbgz, ...rest } = params;
      const [begin, end] = Array.isArray(xcTimeRange) ? xcTimeRange : [];
      return {
        ...rest,
        parentId: parentId.value,
        pageNum: pageNo,
        pageSize,
        begin,
        end,
        // 「全部」值为空串：置 undefined 不下发，避免后端按空值过滤
        sfTbgz: sfTbgz || undefined,
      };
    },
    columns: tableColumns,
    actionColumn,
    useSearchForm: true,
    formConfig: {
      baseColProps: { md: 8, lg: 8 },
      labelWidth: 100,
      schemas: [
        {
          label: '巡查日期',
          field: 'xcTimeRange',
          component: 'RangePicker',
          componentProps: { valueFormat: 'YYYY-MM-DD' },
        },
        { label: '巡检人姓名', field: 'xcUserName', component: 'Input' },
        {
          label: '是否特别关注',
          field: 'sfTbgz',
          component: 'Select',
          componentProps: {
            options: [
              { label: '全部', value: '' },
              { label: '是', value: '1' },
              { label: '否', value: '0' },
            ],
            allowClear: true,
          },
        },
      ],
    },
    pagination: true,
    canResize: true,
  });

  const [registerModal, { setModalProps }] = useModalInner(async (data: Recordable) => {
    // 先查询后掀开：避免空表闪烁
    setModalProps({ open: false });
    parentId.value = String(data.id ?? '');
    buildingName.value = String(data.jzOldName ?? '');
    await reload();
    setModalProps({ open: true });
  });

  function openDetail(record: ProposedInspectionRow) {
    // 只传数据不掀开，抽屉回填完成后自行 setDrawerProps({ open: true })；
    // 精简字段集对齐老系统「拟优保建筑巡查」页
    openDetailDrawer(false, { id: record.id, simple: true, buildingLabel: '拟优保建筑' });
  }
</script>
