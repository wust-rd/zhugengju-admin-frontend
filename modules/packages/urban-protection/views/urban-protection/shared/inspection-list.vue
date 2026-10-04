<!--
  市住更局 —— 名城保护 · 巡查列表页实现（优保建筑巡查 / 拟保护建筑巡查共用）

  scope=excellent 走优保巡查接口（WHFW_AQJD_EXCELLENT_XC，按父建筑在册过滤）；
  scope=proposed 走拟优保巡查接口（WHFW_OLDJZ_XC 独立表，无是否上报字段）。
  列与操作对齐老系统：序号/区划/建筑原名称/巡查人/录入时间/巡查时间/联系电话/是否特别关注/
  录入类型（PC|APP）/[是否上报]/操作（查看巡查、修改特别关注）。
  「联系电话」三表无对应字段，暂以 — 占位，待后端加字段后接入。
  工具栏对齐老系统：导出EXCEL（按当前 scope 导出全量）。
  搜索条件对齐老系统「详细查询」：建筑所属区（含全市）/建筑原名称/巡查日期/
  巡检人姓名/是否特别关注（含全部），「全市/全部」值为空串不下发后端。
  simpleSearch=true 时（拟优保巡查页）仅保留：巡查日期/巡检人姓名/是否特别关注。
  支持 ?parentId=&jzOldName= 路由参数定向进入（建筑列表「巡查记录(NN)」入口）。
  老系统列表的「联系电话」列无数据来源（两族表均无巡查人电话），未实现。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>

      <template #toolbar>
        <a-button :loading="exporting" @click="handleExport()">
          <Icon icon="i-ant-design:download-outlined" /> 导出EXCEL
        </a-button>
      </template>

      <template #firstColumn="{ record }">
        <a v-if="!props.plainName" @click="openDetail(record)" :title="record.jzOldName">{{ record.jzOldName }}</a>
        <span v-else :title="record.jzOldName">{{ record.jzOldName }}</span>
      </template>

      <template #sfTbgz="{ record }">
        <Tag :color="record.sfTbgz ? 'red' : 'default'">{{ record.sfTbgz ? '是' : '否' }}</Tag>
      </template>

      <template #typeView="{ record }">{{ record.typeView }}</template>

      <template v-if="showSfsb" #sfSb="{ record }">
        <Tag :color="record.sfSb ? 'green' : 'default'">{{ record.sfSb ? '已上报' : '未上报' }}</Tag>
      </template>
    </BasicTable>

    <InspectionDetailDrawer :scope="scope" @register="registerDrawer" />
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
  import {
    fetchProposedInspectionPage,
    setProposedInspectionAttention,
    fetchProposedDict,
    ProposedInspectionRow,
  } from '@jeesite/urban-protection/api/urban-protection/proposed';
  import { fetchExcellentDict } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import InspectionDetailDrawer from './inspection-detail-drawer.vue';
  import { exportBorderedSheet } from './excel-export';
  import { fmtDate } from './excellent-format';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';

  const props = defineProps<{
    /** excellent=优保巡查（WHFW_AQJD_EXCELLENT_XC） proposed=拟优保巡查（WHFW_OLDJZ_XC） */
    scope: 'excellent' | 'proposed';
    /** 列表页标题（缺省取路由 meta.title） */
    title?: string;
    /** 是否展示「是否上报」列（拟优保巡查不展示） */
    showSfsb?: boolean;
    /** 建筑原名称是否纯文本显示（true=不加详情链接；优保巡查页用） */
    plainName?: boolean;
    /** 精简查询条件（拟优保巡查页用）：仅 巡查日期/巡检人姓名/是否特别关注 */
    simpleSearch?: boolean;
  }>();

  const { createConfirm } = useMessage();
  const { meta, query } = unref(router.currentRoute);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:file-search-outlined',
    value: props.title ?? String(meta.title ?? '建筑巡查'),
  }));

  /** 列表/详情/特别关注的行类型（两族接口共有字段） */
  type Row = InspectionRow | ProposedInspectionRow;

  /** 按数据源分流：拟优保走 proposed 接口（无 scope 参数），优保走 inspection 接口 */
  const isProposed = props.scope === 'proposed';

  /** 区下拉（库内实际区名，按各自数据源取；首位「全市」= 不筛选） */
  const districtOptions = ref<{ label: string; value: string }[]>([{ label: '全市', value: '' }]);
  if (isProposed) {
    fetchProposedDict().then((dict) => {
      districtOptions.value = [
        { label: '全市', value: '' },
        ...dict.districts.map((d) => ({ label: d, value: d })),
      ];
    });
  } else {
    fetchExcellentDict().then((dict) => {
      districtOptions.value = [
        { label: '全市', value: '' },
        ...dict.districts.map((d) => ({ label: d, value: d })),
      ];
    });
  }

  /** 分页取数（适配 useTable 的 api 签名，返回 {list, count}） */
  function fetchPage(params: Recordable) {
    return isProposed ? fetchProposedInspectionPage(params) : fetchInspectionPage(params);
  }

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
      width: 110,
      align: 'center',
      format: (text) => fmtDate(text as string),
    },
    { title: '巡查时间', dataIndex: 'xcTime', width: 110, align: 'center', format: (text) => fmtDate(text as string) },
    // 联系电话：三表无对应字段，暂以 — 占位（见文件头注释）
    { title: '联系电话', dataIndex: 'phone', width: 110, align: 'center', format: () => '—' },
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

  const exporting = ref(false);

  /** 导出EXCEL：按当前 scope（含路由定向建筑）导出巡查记录全量，联系电话无字段导出为 — */
  async function handleExport() {
    exporting.value = true;
    try {
      const data = await fetchPage({
        ...(isProposed ? {} : { scope: props.scope }),
        parentId: routeParentId || undefined,
        jzOldName: routeBuildingName || undefined,
        pageNum: 1,
        pageSize: 9999,
      });
      const rows: (string | number)[][] = [
        [
          '序号', '区划', '建筑原名称', '巡查人', '录入时间', '巡查时间', '联系电话', '是否特别关注', '录入类型',
          ...(props.showSfsb !== false ? ['是否上报'] : []),
        ],
        ...data.list.map((r, i) => {
          const row: (string | number)[] = [
            i + 1, r.qu, r.jzOldName, r.xcUserName, fmtDate(r.czTime), fmtDate(r.xcTime), '—',
            r.sfTbgz ? '是' : '否', r.typeView || '—',
          ];
          if (props.showSfsb !== false) {
            // 仅优保有 sfSb 字段（拟优保页 showSfsb=false 不会走到）
            row.push((r as InspectionRow).sfSb ? '已上报' : '未上报');
          }
          return row;
        }),
      ];
      exportBorderedSheet(
        `${props.scope === 'proposed' ? '拟优保' : '优保'}建筑巡查记录_${dateUtil().format('YYYYMMDD')}.xlsx`,
        rows,
        [6, 10, 30, 10, 12, 12, 12, 12, 10, ...(props.showSfsb !== false ? [10] : [])].map((wch) => ({ wch })),
        { title: '建筑巡查记录' },
      );
    } finally {
      exporting.value = false;
    }
  }

  const [registerTable, { reload }] = useTable({
    api: fetchPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, xcTimeRange, ...rest } = params;
      const [begin, end] = Array.isArray(xcTimeRange) ? xcTimeRange : [];
      return {
        ...rest,
        ...(isProposed ? {} : { scope: props.scope }),
        pageNum: pageNo,
        pageSize,
        begin,
        end,
        // 「全市 / 全部」选项值为空串：置 undefined 不下发，避免后端按空值过滤
        qu: rest.qu || undefined,
        sfTbgz: rest.sfTbgz || undefined,
        sfSb: rest.sfSb || undefined,
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
      schemas: props.simpleSearch
        ? // 精简查询（对齐老系统拟优保巡查「详细查询」）：巡查日期 / 巡检人姓名 / 是否特别关注
          [
            {
              label: '巡查日期',
              field: 'xcTimeRange',
              component: 'RangePicker' as const,
              componentProps: { valueFormat: 'YYYY-MM-DD' },
            },
            { label: '巡检人姓名', field: 'xcUserName', component: 'Input' },
            {
              label: '是否特别关注',
              field: 'sfTbgz',
              component: 'Select' as const,
              componentProps: {
                options: [
                  { label: '全部', value: '' },
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ],
                allowClear: true,
              },
            },
          ]
        : [
        {
          label: '建筑所属区',
          field: 'qu',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        { label: '建筑原名称', field: 'jzOldName', component: 'Input' },
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

  function openDetail(record: Row) {
    // 只传数据不掀开，抽屉回填完成后自行 setDrawerProps({ open: true })；
    // 拟优保走精简字段集（对齐老系统拟优保建筑巡查页）
    openDrawer(false, {
      id: record.id,
      simple: isProposed,
      buildingLabel: isProposed ? '拟优保建筑' : '优保建筑',
    });
  }

  function toggleAttention(record: Row) {
    const next = record.sfTbgz ? '0' : '1';
    const actionText = record.sfTbgz ? '取消特别关注' : '设为特别关注';
    createConfirm({
      iconType: 'warning',
      title: `确认${actionText}？`,
      content: `建筑「${record.jzOldName}」${fmtDate(record.xcTime)} 的巡查记录`,
      onOk: async () => {
        if (isProposed) {
          await setProposedInspectionAttention(record.id, next as '0' | '1');
        } else {
          await setInspectionAttention(record.id, next as '0' | '1');
        }
        reload();
      },
    });
  }
</script>
