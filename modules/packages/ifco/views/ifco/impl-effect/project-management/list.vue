<!--
  ifco —— 项目实施成效管理（/ifco/impl-effect/project-management/index）

  实施成效评估 · 项目实施成效管理。顶部状态页签（全部/已完成/待评估，带数量，
  页签即成效评估状态筛选）+ BasicTable（项目名称/五改类型/四好目标 搜索表单；
  一键导出 工具栏）。操作列按评估状态变化：待评估=查看+去评估，已完成=仅查看
  （exhaustive 分支）。查看/去评估走一体评估表单抽屉 form.vue（查看=只读+底部
  仅关闭；去评估可填报，暂存/提交区别在是否转已完成）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/impl-effect（内存假数据，
  前 3 行照设计稿抄录共 7 行；刷新即恢复）。

  菜单注册（上级菜单「实施成效评估」）：
   - 菜单名称：项目实施成效管理
   - 链接地址：/ifco/impl-effect/project-management/index
   - 组件位置：/ifco/impl-effect/project-management/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 状态页签（全部/已完成/待评估，页签即评估状态筛选） -->
    <div class="bg-white rd-8px px-8px py-4px shadow-sm">
      <Tabs v-model:active-key="activeStatus" :items="tabItems" @change="handleTabChange" />
    </div>

    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #evaluateStatus="{ record }">
        <Tag v-bind="evaluateStatusTagProps(record.evaluateStatus)" style="border-radius: 10px">
          {{ record.evaluateStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/去评估一体评估表单抽屉 -->
    <EffectForm @register="registerDrawer" @success="refresh" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplEffectProjectManagementIndex">
  import { computed, ref } from 'vue';
  import { Tabs, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { FIVE_REFORM_TYPE_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    EFFECT_ITEMS,
    FOUR_GOOD_GOAL_OPTIONS,
    actionsByEvaluateStatus,
    evaluateStatusTagProps,
    filterEffects,
    fiveReformLabel,
    type EffectAction,
    type EffectItem,
    type EvaluateStatus,
  } from '@jeesite/ifco/api/ifco/impl-effect';
  import EffectForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 状态页签 ─────────────────────────────────────────────────────────
  const activeStatus = ref<EvaluateStatus | ''>('');

  /** 页签数量按全量数据统计（不随搜索条件变化） */
  const tabItems = computed(() => [
    { key: '', label: `全部(${EFFECT_ITEMS.length})` },
    ...([['已完成'], ['待评估']] as const).map(([status]) => ({
      key: status,
      label: `${status}(${EFFECT_ITEMS.filter((item) => item.evaluateStatus === status).length})`,
    })),
  ]);

  /** 页签切换 → 按当前搜索条件 + 页签状态重铺数据 */
  function handleTabChange() {
    setTableData(filterEffects({ ...getForm().getFieldsValue(), evaluateStatus: activeStatus.value }));
  }

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧，成效评估状态/操作固定右侧；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 220, fixed: 'left', ellipsis: true },
    { title: '更新片区', dataIndex: 'renewalAreaName', width: 100 },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '四好目标', dataIndex: 'fourGoodGoal', width: 90 },
    { title: '投资估算(亿元)', dataIndex: 'investEstimate', width: 120, align: 'right' },
    { title: '实际投资(亿元)', dataIndex: 'actualInvest', width: 120, align: 'right' },
    { title: '竣工日期', dataIndex: 'completionDate', width: 110 },
    { title: '责任主体', dataIndex: 'responsibleOrg', width: 130 },
    { title: '运营主体', dataIndex: 'operatingOrg', width: 180, ellipsis: true },
    { title: '成效评估状态', dataIndex: 'evaluateStatus', width: 110, fixed: 'right', slot: 'evaluateStatus' },
  ];

  /** 操作列按钮按评估状态变化（exhaustive：新增状态漏配时编译报错） */
  const actionColumn: BasicColumn = {
    width: 140,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByEvaluateStatus(record.evaluateStatus as EvaluateStatus).map((action: EffectAction) => ({
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

  const fiveReformOptions = [...FIVE_REFORM_TYPE_OPTIONS];
  const fourGoodGoalOptions = FOUR_GOOD_GOAL_OPTIONS.map((name) => ({ label: name, value: name }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterEffects({}),
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
          componentProps: { options: fiveReformOptions, allowClear: true },
        },
        {
          label: '四好目标',
          field: 'fourGoodGoal',
          component: 'Select',
          componentProps: { options: fourGoodGoalOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤（页签状态合并进过滤条件）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterEffects({ ...params, evaluateStatus: activeStatus.value }));
      return params;
    },
  });

  /** 保存/提交后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterEffects({ ...getForm().getFieldsValue(), evaluateStatus: activeStatus.value }));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
