<!--
  市住更局 —— 区级体检指标体系管理（列表页，原型图1）

  菜单注册（菜单名称「指标体系管理」，区级体检管理下）:
   - 链接地址:/urban-health-check/district/indicator-system/list
   - 组件位置:/urban-health-check/district/indicator-system/list;是否可见:显示
  接口：districtSetPage / districtSetDelete（/cityCheck/district/set）。
  列:编码/体检年份/行政区划/体检片区/功能定位/指标项数量/提交状态/操作。
  每个片区一套体系（同年同片区唯一）；查看/编辑下钻 RESTful 编辑页（原型图3）。
  「每个区只看自己区」本期未做按登录人过滤（后端匿名接口无用户上下文），
  以行政区划筛选过渡——后续后端支持用户上下文后再加数据权限。
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
        <Tag v-if="isSubmitted(record)" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
        <Tag v-else color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorSystemList">
  import { onMounted, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { DistrictSet } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    districtSetDelete,
    districtSetPage,
    fetchEspAreas,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { DISTRICTS, toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import InputForm from './form.vue';

  /** 下钻路由基址（编辑页=原型图3） */
  const ROUTE_BASE = '/urban-health-check/district/indicator-system';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '区级体检指标体系管理',
  };

  function isSubmitted(record: Recordable) {
    return String(record.submitStatus) === SUBMIT_STATUS.SUBMITTED;
  }

  /** 体检片区筛选下拉（前期规划片区，showSearch 搜索） */
  const areaOptions = ref<{ label: string; value: string }[]>([]);
  onMounted(async () => {
    try {
      const areas = await fetchEspAreas();
      areaOptions.value = areas.map((a) => ({ label: `${a.district ? a.district + ' · ' : ''}${a.name}`, value: a.name }));
    } catch {
      // 前期规划片区接口失败不阻塞列表，筛选退化为无选项
    }
  });

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
        component: 'Select',
        componentProps: () => ({
          options: areaOptions.value,
          showSearch: true,
          optionFilterProp: 'label',
          allowClear: true,
        }),
      },
    ],
  };

  /** 表格列（原型无"编码"列，sysNo 不展示） */
  const tableColumns: BasicColumn[] = [
    { title: '体检年份', dataIndex: 'setYear', width: 100, align: 'center' },
    { title: '行政区划', dataIndex: 'district', width: 100, align: 'center' },
    { title: '体检片区', dataIndex: 'areaName', slot: 'firstColumn', width: 160 },
    { title: '功能定位', dataIndex: 'funcOrientation', width: 140, ellipsis: true },
    { title: '指标项数量（项）', dataIndex: 'indicatorCount', width: 130, align: 'center' },
    {
      title: '填报时间',
      dataIndex: 'updateDate',
      width: 120,
      align: 'center',
      format: (v: any) => (v == null || v === '' ? '-' : String(v).slice(0, 10)),
    },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列（已提交只读） */
  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleDetail(record, true),
      },
      {
        label: '编辑',
        ifShow: () => !isSubmitted(record),
        onClick: () => handleDetail(record, false),
      },
      {
        label: '删除',
        color: 'error',
        ifShow: () => !isSubmitted(record),
        popConfirm: { title: '删除后其指标项与结果数据将一并删除，是否确认？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: districtSetPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 新增体系（抽屉；保存成功后自动代入 17 项必选指标项） */
  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  function handleDetail(record: Recordable, isView = false) {
    go(`${ROUTE_BASE}/${record.id}${isView ? '?view=1' : ''}`);
  }

  async function handleDelete(record: DistrictSet) {
    try {
      await districtSetDelete([record.id!]);
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
