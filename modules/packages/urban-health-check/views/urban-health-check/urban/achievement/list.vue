<!--
  市住更局 —— 体检成果管理（列表页）

  菜单注册（菜单名称「体检成果管理」）:
   - 链接地址:/urban-health-check/urban/achievement/list
   - 组件位置:/urban-health-check/urban/achievement/list(与链接地址一致)
   - 是否可见:显示
  show 页路由(RESTful,后端隐藏菜单,待注册):
   - 链接地址:/urban-health-check/urban/achievement/{id}({id}=记录编码 code)
   - 组件位置:/urban-health-check/urban/achievement/_id/list;上级菜单挂「体检成果管理」点亮侧边栏
  组件格式对齐 satisfaction-survey/list.vue;
  当前后端尚未介入，页面为纯 UI：不发起任何接口请求；
  字段与假数据定义见 @jeesite/urban-health-check/api/urban-health-check/urban/achievement。
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
        <a @click="handleDetail(record)" :title="record.catalog">
          {{ record.catalog }}
        </a>
      </template>
      <template #submitStatus="{ record }">
        <Tag
          :color="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'blue' : 'blue'"
          :variant="record.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'solid' : 'outlined'"
          style="border-radius: 10px"
        >
          {{ record.submitStatus === SUBMIT_STATUS.SUBMITTED ? '已提交' : '待提交' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementList">
  import { unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { Achievement } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import { MOCK_LIST } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '体检成果管理',
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
        label: '体检成果目录',
        field: 'catalog',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '体检年份', dataIndex: 'year', width: 100, align: 'center' },
    { title: '体检成果目录', dataIndex: 'catalog', slot: 'firstColumn', width: 200 },
    { title: '填报时间', dataIndex: 'reportDate', width: 120, align: 'center' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 110, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该成果目录？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable] = useTable({
    dataSource: MOCK_LIST,
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
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 打开该成果目录的 show 页(RESTful:/…/achievement/{id},{id}=记录编码 code) */
  function handleDetail(record: Recordable) {
    go(`/urban-health-check/urban/achievement/${record.code}`);
  }

  /** 删除 */
  function handleDelete(_record: Achievement) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
