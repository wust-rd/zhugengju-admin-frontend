<!--
  市住更局 —— 评审管理 · 项目评审列表

  对齐设计稿：搜索（项目名称 / 片区名称）+ 新增项目 + 项目列表。
  状态：待提交 / 评审中 / 已完成；操作按状态出入口：
    评审中：查看 / 评审（评审页下期）
    待提交：查看 / 编辑 / 提交 / 删除
    已完成：查看 / 生成综合评审意见书（下期）
  新增 / 编辑 / 查看 以组件方式切换到整页表单（不走路由）。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/review-management/list
   - 组件位置：/early-stage-planning/review-management/list（与链接地址一致）
   - 权限标识：esp:reviewProject:view（查询）/ esp:reviewProject:edit（维护，挂在按钮权限）
  ⚠️ 组件位置必须与实际文件名精确一致——路由 dynamicImport 按「去扩展名后全等」匹配。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px overflow-visible!">
    <div v-show="!formVisible" class="flex flex-col gap-16px">
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>项目列表</span>
        </template>
        <template #toolbar>
          <a-button type="primary" @click="handleForm({ isNewRecord: true })">
            <span class="inline-flex items-center gap-4px">
              <span class="i-fluent:add-12-filled"></span> 新增项目
            </span>
          </a-button>
        </template>
        <template #status="{ record }">
          <span class="text-13px font-500" :style="{ color: STATUS_META[record.status]?.color || '#8c8c8c' }">
            {{ record.statusLabel || STATUS_META[record.status]?.label || record.status }}
          </span>
        </template>
      </BasicTable>
    </div>

    <ReviewForm v-if="formVisible" :record="formRecord" @success="handleSuccess" @back="handleBack" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningReviewManagementList">
  import { ref } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    reviewProjectDelete,
    reviewProjectPage,
    reviewProjectSubmit,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/review-management';
  import ReviewForm from './form.vue';

  const { showMessage } = useMessage();

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft: { label: '待提交', color: '#8c8c8c' },
    reviewing: { label: '评审中', color: '#1677ff' },
    completed: { label: '已完成', color: '#52c41a' },
  };

  const formVisible = ref(false);
  const formRecord = ref<Recordable>({});

  const columns: BasicColumn[] = [
    { title: '项目名称', dataIndex: 'projectName', width: 180, ellipsis: true },
    { title: '片区名称', dataIndex: 'areaName', width: 120 },
    { title: '行政区', dataIndex: 'dist', width: 100 },
    { title: '片区三师', dataIndex: 'expertsText', width: 200, ellipsis: true },
    { title: '统筹主体', dataIndex: 'coordOrg', width: 160, ellipsis: true },
    { title: '责任部门', dataIndex: 'respDept', width: 140, ellipsis: true },
    { title: '开始时间', dataIndex: 'startDate', width: 120 },
    { title: '状态', dataIndex: 'status', width: 90, slot: 'status' },
  ];

  const actionColumn: BasicColumn = {
    width: 260,
    actions: (record: Recordable) => {
      const actions: Recordable[] = [{ label: '查看', onClick: () => handleForm({ ...record, isView: true }) }];
      if (record.status === 'reviewing') {
        actions.push({ label: '评审', onClick: () => showMessage('评审功能开发中') });
      } else if (record.status === 'draft') {
        actions.push(
          { label: '编辑', onClick: () => handleForm({ ...record }) },
          {
            label: '提交',
            popConfirm: {
              title: '提交后项目进入评审中，不可再编辑，是否确认提交？',
              confirm: () => handleSubmit(record),
            },
          },
          {
            label: '删除',
            color: 'error',
            popConfirm: { title: '是否确认删除该项目？', confirm: () => handleDelete(record) },
          },
        );
      } else if (record.status === 'completed') {
        actions.push({ label: '生成综合评审意见书', onClick: () => showMessage('生成综合评审意见书功能开发中') });
      }
      return actions;
    },
  };

  const [registerTable, { reload }] = useTable({
    api: reviewProjectPage,
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
        { label: '项目名称', field: 'projectName', component: 'Input', componentProps: { placeholder: '请输入' } },
        { label: '片区名称', field: 'areaName', component: 'Input', componentProps: { placeholder: '请输入' } },
      ],
    },
  });

  function handleForm(record: Recordable) {
    formRecord.value = record;
    formVisible.value = true;
  }

  function handleBack() {
    formVisible.value = false;
  }

  function handleSuccess() {
    formVisible.value = false;
    reload();
  }

  async function handleSubmit(record: Recordable) {
    try {
      await reviewProjectSubmit(record.id);
      reload();
      showMessage('提交成功');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '提交失败');
    }
  }

  async function handleDelete(record: Recordable) {
    try {
      await reviewProjectDelete(record.id);
      reload();
      showMessage('删除成功');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '删除失败');
    }
  }
</script>
