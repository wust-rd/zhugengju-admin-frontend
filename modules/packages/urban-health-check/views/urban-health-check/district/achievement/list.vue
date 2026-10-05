<!--
  市住更局 —— 区级体检成果管理（列表页，原型图1）

  菜单注册:
   - 链接地址:/urban-health-check/district/achievement/list
   - 组件位置:/urban-health-check/district/achievement/list;是否可见:显示
  与市级的区别：区级「一成果目录挂五类清单」，列表行直接展示五类清单计数；
  查看/编辑下钻 RESTful 页面 /district/achievement/{id}（编辑页=五页签）。
  接口：districtAchievementPage / Delete。
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
        <a @click="handleDetail(record)" :title="record.areaName">{{ record.areaName }}</a>
      </template>
      <template #submitStatus="{ record }">
        <Tag v-if="String(record.submitStatus) === '1'" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
        <Tag v-else color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementList">
  import { unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { DistrictAchievement } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    districtAchievementDelete,
    districtAchievementPage,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { DISTRICTS, toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import InputForm from './form.vue';

  /** 下钻路由基址（编辑页=五页签） */
  const ROUTE_BASE = '/urban-health-check/district/achievement';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '区级体检成果管理',
  };

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
        label: '行政区划',
        field: 'districtName',
        component: 'Select',
        componentProps: { options: toOptions(DISTRICTS), allowClear: true },
      },
      { label: '体检片区', field: 'area', component: 'Input' },
    ],
  };

  /** 表格列（五类清单计数展开为列） */
  const tableColumns: BasicColumn[] = [
    { title: '体检年份', dataIndex: 'setYear', width: 90, align: 'center' },
    { title: '行政区划', dataIndex: 'district', width: 90, align: 'center' },
    { title: '体检片区', dataIndex: 'areaName', slot: 'firstColumn', width: 150 },
    { title: '填报单位', dataIndex: 'fillUnit', width: 130, ellipsis: true },
    { title: '问题整治', dataIndex: 'problemCount', width: 90, align: 'center' },
    { title: '发展机遇', dataIndex: 'opportunityCount', width: 90, align: 'center' },
    { title: '更新诉求', dataIndex: 'demandCount', width: 90, align: 'center' },
    { title: '基础资料', dataIndex: 'baseCount', width: 90, align: 'center' },
    { title: '储备项目', dataIndex: 'stockCount', width: 90, align: 'center' },
    {
      title: '填报时间',
      dataIndex: 'fillDate',
      width: 110,
      align: 'center',
      format: (v: any) => (v == null || v === '' ? '-' : String(v).slice(0, 10)),
    },
    { title: '提交状态', dataIndex: 'submitStatus', width: 95, align: 'center', slot: 'submitStatus' },
  ];

  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleDetail(record),
      },
      {
        label: '编辑',
        ifShow: () => String(record.submitStatus) !== '1',
        onClick: () => handleDetail(record),
      },
      {
        label: '删除',
        color: 'error',
        ifShow: () => String(record.submitStatus) !== '1',
        popConfirm: { title: '删除后五类清单明细将一并删除，是否确认？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: districtAchievementPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  function handleDetail(record: Recordable) {
    go(`${ROUTE_BASE}/${record.id}`);
  }

  async function handleDelete(record: DistrictAchievement) {
    try {
      await districtAchievementDelete([record.id!]);
      showMessage('删除成功');
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  function handleSuccess() {
    reload();
  }
</script>
