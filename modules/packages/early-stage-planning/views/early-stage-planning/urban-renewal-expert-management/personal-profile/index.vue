<!--
  市住更局 —— 城市更新专家管理 · 个人档案

  专家基础信息的增删改查：顶部三张统计卡 + BasicTable（姓名/单位名称搜索表单）；
  新增/编辑走右侧表单抽屉（form.vue），查看跳二级详情页（_id/list，空间更大便于扩展）。
  已接后端（modules/esp UreExpertController / UreDictController）：分页/统计/保存/删除走接口层
  @jeesite/early-stage-planning/api/early-stage-planning/ure-expert。
  注意：后端分页仅支持 姓名/单位 模糊与是否入选过滤，搜索表单不再按专业领域过滤。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 统计卡 -->
    <div class="grid grid-cols-3 gap-16px">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rd-8px b-1 b-solid b-gray-100 py-20px text-center shadow-sm"
      >
        <div class="flex items-baseline justify-center gap-4px">
          <span class="text-36px font-700 text-gray-900">{{ card.value }}</span>
          <span class="text-14px text-gray-500">{{ card.unit }}</span>
        </div>
        <div class="mt-4px text-14px text-gray-600">{{ card.label }}</div>
      </div>
    </div>

    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>专家档案</span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增专家 </span>
        </a-button>
      </template>
    </BasicTable>

    <!-- 新增 / 编辑 表单抽屉 -->
    <ExpertForm @register="registerDrawer" @success="refreshTable" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProfileList">
  import { computed, ref } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import {
    ureExpertDelete,
    ureExpertPage,
    ureExpertStat,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import ExpertForm from './form.vue';

  const { showMessage } = useMessage();
  const go = useGo();

  /** 统计卡（接口 2.2：入库专家总数/正高级工程师/专业领域数量；增删改后 reloadStat 刷新） */
  const stat = ref({ total: 0, senior: 0, fieldCount: 0 });
  async function reloadStat() {
    stat.value = await ureExpertStat();
  }
  reloadStat().catch(() => {});
  const statCards = computed(() => [
    { label: '入库专家总数', value: stat.value.total, unit: '人' },
    { label: '正高级工程师', value: stat.value.senior, unit: '人' },
    { label: '专业领域数量', value: stat.value.fieldCount, unit: '个' },
  ]);

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '专业领域', dataIndex: 'field', width: 100 },
    { title: '职称', dataIndex: 'title', width: 120 },
    { title: '单位名称', dataIndex: 'org', width: 180, ellipsis: true },
    { title: '单位性质', dataIndex: 'orgType', width: 90 },
    { title: '入库时间', dataIndex: 'joinDate', width: 110 },
  ];

  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => go(`/early-stage-planning/urban-renewal-expert-management/personal-profile/${record.id}`),
      },
      { label: '修改', onClick: () => handleForm({ ...record }) },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该专家？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: ureExpertPage,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '姓名',
          field: 'name',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '单位名称',
          field: 'org',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
      ],
    },
  });

  /** 当前条件下重新加载表格 + 统计卡（增删改后调用） */
  function refreshTable() {
    reload();
    reloadStat().catch(() => {});
  }

  /** 新增/编辑表单抽屉（编辑时 form.vue 内按 id 拉详情回显；showFooter 必须显式开，否则底部无确定/取消按钮） */
  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: true });
    openDrawer(true, record);
  }

  /** 删除（接口 2.5：逻辑删除并级联删除其全部评价记录，登录账号保留） */
  async function handleDelete(record: Recordable) {
    try {
      await ureExpertDelete(record.id);
      showMessage('删除成功');
      refreshTable();
    } catch (error: any) {
      showMessage(error.message || '删除失败');
    }
  }
</script>
