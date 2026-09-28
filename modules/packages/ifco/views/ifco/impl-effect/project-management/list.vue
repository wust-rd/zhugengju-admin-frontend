<!--
  ifco —— 项目实施成效管理（/ifco/impl-effect/project-management/index）

  实施成效评估 · 项目实施成效管理。BasicTable（项目名称/五改类型/四好目标/成效
  评估状态 搜索表单，状态筛选即「成效评估状态」下拉；一键导出 工具栏）。成效评
  估状态列用彩色 Tag（待评估=蓝描边、已完成=绿实心）。操作列按评估状态变化：待评估=查看+去评估，
  已完成=仅查看（exhaustive 分支）。查看/去评估走一体评估表单抽屉 form.vue
  （查看=只读+底部仅关闭；去评估可填报，暂存/提交区别在是否转已完成）。
  收录口径：仅「实施库 + 已完工（竣工日期非空）」的项目可进入本页（收口在 api
  的 filterEffects，后端接入后改为项目库查询条件）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/impl-effect（内存假数据，
  前 3 行照设计稿抄录共 7 行；刷新即恢复）。

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
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { FIVE_REFORM_TYPE_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
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

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧，成效评估状态/操作固定右侧；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 220, fixed: 'left', ellipsis: true },
    { title: '更新片区', dataIndex: 'renewalAreaName', width: 100 },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '四好目标', dataIndex: 'fourGoodGoal', width: 90 },
    { title: '投资估算（亿元）', dataIndex: 'investEstimate', width: 120, align: 'right' },
    { title: '实际投资（亿元）', dataIndex: 'actualInvest', width: 120, align: 'right' },
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
  /** 状态下拉选项（JeeSiteSelect 需要 label/value 对象，纯字符串会渲染报错） */
  const evaluateStatusOptions = (['待评估', '已完成'] as const).map((status) => ({
    label: status,
    value: status,
  }));

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
        {
          label: '成效评估状态',
          field: 'evaluateStatus',
          component: 'Select',
          componentProps: { options: evaluateStatusOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤（含成效评估状态下拉）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterEffects(params));
      return params;
    },
  });

  /** 保存/提交后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterEffects(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
