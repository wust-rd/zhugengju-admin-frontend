<!--
  市住更局 —— 区级体检指标项结果管理（列表页 = 体系列表）

  菜单注册:
   - 链接地址:/urban-health-check/district/indicator-result/list
   - 组件位置:/urban-health-check/district/indicator-result/list;是否可见:显示
  行=区级体检指标体系（数据与指标体系管理同源 district/set/page）；
  点片区下钻 RESTful 页面 /district/indicator-result/{setId}（结果编辑页）。
  本页不提供新增/删除（体系在「指标体系管理」维护）。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleDetail(record)" :title="record.areaName">{{ record.areaName }}</a>
      </template>
      <template #fillProgress="{ record }">
        <Progress class="w-28" :percent="record.fillProgress ?? 0" :size="['100%', 6]" :show-info="false" />
      </template>
      <template #submitStatus="{ record }">
        <Tag v-if="String(record.submitStatus) === SUBMIT_STATUS.SUBMITTED" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
        <Tag v-else color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorResultList">
  import { unref } from 'vue';
  import { Progress, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { FormProps } from '@jeesite/core/components/Form';
  import {
    districtSetPage,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { DISTRICTS, toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';

  /** 下钻路由基址（结果编辑页） */
  const ROUTE_BASE = '/urban-health-check/district/indicator-result';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '区级指标项结果管理',
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
      {
        label: '体检片区',
        field: 'areaName',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '体检年份', dataIndex: 'setYear', width: 100, align: 'center' },
    { title: '行政区划', dataIndex: 'district', width: 100, align: 'center' },
    { title: '体检片区', dataIndex: 'areaName', slot: 'firstColumn', width: 170 },
    { title: '功能定位', dataIndex: 'funcOrientation', width: 130, ellipsis: true },
    { title: '指标项数量（项）', dataIndex: 'indicatorCount', width: 130, align: 'center' },
    { title: '填报进度', dataIndex: 'fillProgress', width: 150, align: 'center', slot: 'fillProgress' },
    {
      title: '填报时间',
      dataIndex: 'updateDate',
      width: 120,
      align: 'center',
      format: (v: any) => (v == null || v === '' ? '-' : String(v).slice(0, 10)),
    },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  const [registerTable] = useTable({
    api: districtSetPage,
    columns: tableColumns,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleDetail(record: Recordable) {
    go(`${ROUTE_BASE}/${record.id}`);
  }
</script>
