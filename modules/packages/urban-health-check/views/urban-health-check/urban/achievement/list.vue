<!--
  市住更局 —— 体检成果管理（列表页，原型图1）

  菜单注册（菜单名称「体检成果管理」）:
   - 链接地址:/urban-health-check/urban/achievement/list
   - 组件位置:/urban-health-check/urban/achievement/list(与链接地址一致)
   - 是否可见:显示
  show 页路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/achievement/{id}({id}=成果目录主键)
   - 组件位置:/urban-health-check/urban/achievement/_id/list;上级菜单挂「体检成果管理」点亮侧边栏
  接口已接入：achievementPage / achievementDelete（/cityCheck/achievement）。
  列:序号/体检年份/体检成果目录/清单明细数量/填报时间/提交状态/操作。
  查看/编辑下钻 RESTful 页面（编辑页=原型图2，明细表头按成果类型切换）；
  已提交只读（仅查看）；待提交行可编辑/删除。
  新增抽屉仅开放问题清单/资源清单两种类型（用户 2026-10-04 决策，按 2025 现有成果先做）。
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
      <template #submitStatus="{ record }">
        <Tag v-if="isSubmitted(record)" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
        <Tag v-else color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
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
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { Achievement } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    achievementDelete,
    achievementPage,
    ACHIEVEMENT_TYPES,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  /** 下钻路由基址（编辑页=原型图2，RESTful {id}） */
  const ROUTE_BASE = '/urban-health-check/urban/achievement';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '体检成果管理',
  };

  /** 后端 submitStatus 为数字，SUBMIT_STATUS 常量为字符串 → 统一 String 比较 */
  function isSubmitted(record: Recordable) {
    return String(record.submitStatus) === SUBMIT_STATUS.SUBMITTED;
  }

  /** 成果目录筛选下拉（含全部 5 类：历史数据可能有意愿/需求/储备库类型行） */
  const catalogOptions = [
    ACHIEVEMENT_TYPES.PROBLEM,
    ACHIEVEMENT_TYPES.RESOURCE,
    ACHIEVEMENT_TYPES.WILLING,
    ACHIEVEMENT_TYPES.DEMAND,
    ACHIEVEMENT_TYPES.STOCK,
  ].map((v) => ({ label: v, value: v }));

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
        component: 'Select',
        componentProps: { options: catalogOptions, allowClear: true },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '体检年份', dataIndex: 'setYear', width: 110, align: 'center' },
    { title: '体检成果目录', dataIndex: 'achievementType', width: 180 },
    { title: '清单明细数量（项）', dataIndex: 'itemCount', width: 150, align: 'center' },
    {
      title: '填报时间',
      dataIndex: 'fillDate',
      width: 120,
      align: 'center',
      format: (value: any) => (value == null || value === '' ? '-' : String(value).slice(0, 10)),
    },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列（已提交只读，仅查看） */
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
        popConfirm: { title: '删除后其清单明细与关联指标项将一并删除，是否确认？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: achievementPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 新增成果目录（抽屉） */
  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 查看/编辑 → 编辑页(原型图2)；查看态加 ?view=1 整页只读 */
  function handleDetail(record: Recordable, isView: boolean) {
    go(`${ROUTE_BASE}/${record.id}${isView ? '?view=1' : ''}`);
  }

  /** 删除 */
  async function handleDelete(record: Achievement) {
    try {
      await achievementDelete([record.id!]);
      showMessage('删除成功');
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  /** 表单保存成功回调：刷新列表 */
  function handleSuccess() {
    reload();
  }
</script>
