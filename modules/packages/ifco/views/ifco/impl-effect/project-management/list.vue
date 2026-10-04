<!--
  ifco —— 项目实施成效管理（/ifco/impl-effect/project-management/index）

  实施成效评估 · 项目实施成效管理。BasicTable（项目名称/五改类型/四好目标/成效
  评估状态 搜索表单；一键导出 工具栏）走后端分页 /a/ifco/impl-eval/page
  （行键蛇形：p_uid/project_name/evaluate_status…）。成效评估状态列彩色 Tag
  （待评估=蓝描边、已完成=绿实心，evaluate_status 英文码经 label 映射）。
  操作列按评估状态变化：待评估=查看+去评估，已完成=仅查看（exhaustive 分支）。
  查看/去评估走一体评估表单抽屉 form.vue（按 p_uid 拉详情；查看=只读+底部仅
  关闭；去评估可填报，暂存/提交走 /save，提交校验必填并转已完成）。
  收录口径·并集（后端 SQL 收口）：在实施库（library='implementing'）或已完工
  （current_status='已完工'）的项目；无评估行=待评估。

  菜单注册（上级菜单「实施成效评估」）：
   - 菜单名称：项目实施成效管理
   - 链接地址：/ifco/impl-effect/project-management/index
   - 组件位置：/ifco/impl-effect/project-management/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.five_reform_type) }}</template>
      <template #evaluateStatus="{ record }">
        <Tag v-bind="evaluateStatusTagProps(record.evaluate_status)" style="border-radius: 10px">
          {{ EVALUATE_STATUS_LABELS[record.evaluate_status] }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/去评估一体评估表单抽屉 -->
    <EffectForm @register="registerDrawer" @success="refresh" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplEffectProjectManagementIndex">
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useFiveReformTypeOptions } from '../../shared/ifco-dicts';
  import {
    EVALUATE_STATUS_LABELS,
    EVALUATE_STATUS_OPTIONS,
    FOUR_GOOD_GOAL_OPTIONS,
    actionsByEvaluateStatus,
    evaluateStatusTagProps,
    fetchImplEvalPage,
    fiveReformLabel,
    type EffectAction,
    type EvaluateStatus,
  } from '@jeesite/ifco/api/ifco/impl-effect';
  import EffectForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧，成效评估状态/操作固定右侧；金额右对齐；行键蛇形（后端列别名） */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'project_code', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'project_name', width: 220, fixed: 'left', ellipsis: true },
    { title: '更新片区', dataIndex: 'renewal_area_name', width: 100 },
    { title: '五改分类', dataIndex: 'five_reform_type', width: 110, slot: 'fiveReformType' },
    { title: '四好目标', dataIndex: 'four_good_goal', width: 90 },
    { title: '投资估算（亿元）', dataIndex: 'invest_estimate', width: 120, align: 'right' },
    { title: '实际投资（亿元）', dataIndex: 'actual_invest', width: 120, align: 'right' },
    { title: '竣工日期', dataIndex: 'completion_date', width: 110 },
    { title: '责任主体', dataIndex: 'responsible_org', width: 130 },
    { title: '运营主体', dataIndex: 'operating_org', width: 180, ellipsis: true },
    { title: '成效评估状态', dataIndex: 'evaluate_status', width: 110, fixed: 'right', slot: 'evaluateStatus' },
  ];

  /** 操作列按钮按评估状态变化（exhaustive：新增状态漏配时编译报错） */
  const actionColumn: BasicColumn = {
    width: 140,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByEvaluateStatus(record.evaluate_status as EvaluateStatus).map((action: EffectAction) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 查看走只读表单、去评估走可写表单；showFooter 打开前预设（硬性规则） */
  function handleAction(action: EffectAction, record: Recordable) {
    const isView = action === '查看';
    setDrawerProps({ showFooter: !isView });
    openDrawer(true, { ...record, isView });
  }

  const fiveReformOptions = useFiveReformTypeOptions();
  const fourGoodGoalOptions = FOUR_GOOD_GOAL_OPTIONS.map((name) => ({ label: name, value: name }));

  const [registerTable, { reload }] = useTable({
    api: fetchImplEvalPage,
    fetchSetting: { pageField: 'pageNum', sizeField: 'pageSize', listField: 'list', totalField: 'total' },
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 100,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '五改类型',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: () => ({ options: fiveReformOptions.value, allowClear: true }),
        },
        {
          label: '四好目标',
          field: 'fourGoodGoal',
          component: 'Select',
          componentProps: { options: fourGoodGoalOptions, allowClear: true },
        },
        {
          label: '成效评估状态',
          field: 'evaluateStatus',
          component: 'Select',
          componentProps: { options: EVALUATE_STATUS_OPTIONS, allowClear: true },
        },
      ],
    },
  });

  /** 保存/提交后按当前条件刷新 */
  function refresh() {
    reload();
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
