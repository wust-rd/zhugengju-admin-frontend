<!--
  ifco —— 项目资料管理（/ifco/project-file-management/list）

  项目资料管理 · 实施库项目 + 资料归集入口。BasicTable 分页走项目库 page 接口
  （固定 library=implementing，仅实施库在库项目）；项目名称/行政区/片区名称/
  片区批次/五改类别 搜索表单（服务端过滤）；操作列题头为「资料归集」，按钮
  「编辑」打开资料归集抽屉 collect-form.vue（70% 宽：目录+文件管理，会话内存
  演示口径）。行字段与在库项目管理同源（后端联查
  列名小写：lib_project_code/pj_name/dist/area_name/batch/wg_big/inv_bil/
  project_affiliation/status）。

  菜单注册（上级菜单按菜单管理实际配置）：
   - 菜单名称：项目资料管理
   - 链接地址：/ifco/project-file-management/list
   - 组件位置：/ifco/project-file-management/list（与链接地址一致）
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #areaName="{ record }">{{ withSlash(record.area_name) }}</template>
      <template #batch="{ record }">{{ withSlash(RENEWAL_AREA_BATCH_LABEL[record.batch] ?? record.batch) }}</template>
      <template #wgBig="{ record }">{{ withSlash(FIVE_REFORM_TYPE_LABEL[record.wg_big] ?? record.wg_big) }}</template>
      <template #projectAffiliation="{ record }">
        {{ withSlash(PROJECT_AFFILIATION_LABEL[record.project_affiliation] ?? record.project_affiliation) }}
      </template>
      <template #status="{ record }">
        <Tag v-bind="statusTagProps(record.status as ProjectStatus)" style="border-radius: 10px">
          {{ STATUS_LABEL[record.status as ProjectStatus] ?? record.status }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 资料归集抽屉（目录+文件管理；会话内存演示口径） -->
    <CollectForm @register="registerDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProjectFileManagementList">
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import {
    FIVE_REFORM_TYPE_LABEL,
    PROJECT_AFFILIATION_LABEL,
    RENEWAL_AREA_BATCH_LABEL,
    RENEWAL_AREA_BATCH_OPTIONS,
    RENEWAL_AREA_NAME_LIST,
    STATUS_LABEL,
    fetchLibPage,
    statusTagProps,
    type ProjectStatus,
  } from '@jeesite/ifco/api/ifco/project-library';
  import { useDistrictOptions, useFiveReformTypeOptions } from '../shared/ifco-dicts';
  import CollectForm from './collect-form.vue';

  /** 空值显示 /（与在库项目管理同款） */
  function withSlash(value: string | number | undefined) {
    return value ? value : '/';
  }

  /** 项目编号/项目名称固定左侧，资料归集（操作）列固定右侧；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'lib_project_code', width: 110, fixed: 'left' },
    { title: '项目名称', dataIndex: 'pj_name', width: 240, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'dist', width: 90 },
    { title: '片区名称', dataIndex: 'area_name', width: 100, slot: 'areaName' },
    { title: '片区批次', dataIndex: 'batch', width: 90, slot: 'batch' },
    { title: '五改类别', dataIndex: 'wg_big', width: 110, slot: 'wgBig' },
    { title: '项目投资估算（亿元）', dataIndex: 'inv_bil', width: 130, align: 'right' },
    { title: '项目归属', dataIndex: 'project_affiliation', width: 130, slot: 'projectAffiliation' },
    { title: '最新项目状态', dataIndex: 'status', width: 120, fixed: 'right', slot: 'status' },
  ];

  /** 操作列题头=资料归集；「编辑」开资料归集抽屉（目录+文件管理，见 collect-form.vue） */
  const actionColumn: BasicColumn = {
    title: '资料归集',
    width: 90,
    fixed: 'right',
    actions: (record: Recordable) => [{ label: '编辑', onClick: () => openCollectDrawer(record) }],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();

  /** 打开资料归集抽屉（按项目 pUid 隔离目录集） */
  function openCollectDrawer(record: Recordable) {
    openDrawer(true, { pUid: record.p_uid, projectName: record.pj_name });
  }

  const districtOptions = useDistrictOptions();
  const renewalAreaNameOptions = RENEWAL_AREA_NAME_LIST.map((name) => ({ label: name, value: name }));
  const renewalAreaBatchOptions = [...RENEWAL_AREA_BATCH_OPTIONS];
  const fiveReformTypeOptions = useFiveReformTypeOptions();

  const [registerTable] = useTable({
    api: fetchLibPage,
    // 分页字段对齐后端（框架 pageNo/pageSize → pageNum/pageSize）；固定实施库（仅实施库在库项目）
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      return { ...rest, pageNum: pageNo, pageSize, library: 'implementing' };
    },
    // 框架按 listField 抽行数组（afterFetch 契约=收数组返数组）；后端总数键为 total，此处对齐
    fetchSetting: { pageField: 'pageNo', sizeField: 'pageSize', listField: 'list', totalField: 'total' },
    columns,
    actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: () => ({ options: districtOptions.value, allowClear: true }),
        },
        {
          label: '片区名称',
          field: 'areaName',
          component: 'Select',
          componentProps: { options: renewalAreaNameOptions, allowClear: true },
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: renewalAreaBatchOptions, allowClear: true },
        },
        {
          label: '五改类别',
          field: 'wgBig',
          component: 'Select',
          componentProps: () => ({ options: fiveReformTypeOptions.value, allowClear: true }),
        },
      ],
    },
  });
</script>
<style scoped>
  /* 表头换行显示（窄列长列名自动折行，如「项目投资估算（亿元）」；antd th 默认 nowrap） */
  :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
