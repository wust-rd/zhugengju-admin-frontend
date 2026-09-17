<!--
  ifco —— 年度计划编制 · 计划编制管理（/ifco/annual-plan/compilation/list）

  年度计划编制任务列表。结构对齐设计稿：任务年份搜索 + BasicTable（启动编制、
  下载模板、一键导入 工具栏；无复选框列；投资目标完成率/距离编制结束天数/
  编制状态列；操作列按编制状态变化：进行中=查看+进入编制工作台、已归档=仅查看）。
  查看走一体表单抽屉 form.vue（只读）；进入编制工作台跳 RESTful show 子页
  _id/list.vue（record.code 作路由 id）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/compilation（内存假数据，
  前 2 行照设计稿抄录）；启动编制/下载模板/一键导入为占位。

  菜单注册（菜单名称「计划编制管理」）：
   - 链接地址：/ifco/annual-plan/compilation/list
   - 组件位置：/ifco/annual-plan/compilation/list（与链接地址一致）
   - 下级隐藏菜单：链接地址 /ifco/annual-plan/compilation/{id}（{id}=记录编码 code），
     组件位置 /ifco/annual-plan/compilation/_id/list（与链接地址不一致，需显式填写），
     上级菜单挂本菜单以点亮侧边栏
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <div class="text-16px font-600 text-gray-900">年度计划编制/计划编制管理</div>

    <!-- 列表：搜索表单 + 工具栏 + 表格（设计稿无复选框列） -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" @click="handleTodo('启动编制')">
          <Icon icon="i-fluent:add-12-filled" /> 启动编制
        </a-button>
        <a-button @click="handleTodo('下载模板')"> 下载模板 </a-button>
        <a-button @click="handleTodo('一键导入')"> 一键导入 </a-button>
      </template>
      <template #completionRate="{ record }">{{ completionRate(record) }}</template>
      <template #daysLeft="{ record }">
        {{ record.status === '进行中' ? daysUntilDeadline(record) : '-' }}
      </template>
      <template #status="{ record }">
        <Tag v-bind="compileStatusTagProps(record.status)" style="border-radius: 10px">
          {{ record.status }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看一体表单抽屉 -->
    <TaskForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanCompilationList">
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ACTIONS_BY_STATUS,
    compileStatusTagProps,
    completionRate,
    daysUntilDeadline,
    filterTasks,
    saveTask,
    taskYearOptions,
    type CompileAction,
    type CompileStatus,
    type CompilationTask,
  } from '@jeesite/ifco/api/ifco/compilation';
  import TaskForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 投资目标完成率/距离编制结束天数/编制状态用插槽渲染（已归档任务天数显示 -） */
  const columns: BasicColumn[] = [
    { title: '任务年份', dataIndex: 'taskYear', width: 100, fixed: 'left' },
    { title: '年度刚性投资目标（亿元）', dataIndex: 'annualRigidTarget', width: 190, align: 'right' },
    { title: '年度投资合计（亿元）', dataIndex: 'totalInvest', width: 170, align: 'right' },
    { title: '投资目标完成率', dataIndex: 'completionRate', width: 130, slot: 'completionRate' },
    { title: '编制开始时间', dataIndex: 'compileStartDate', width: 120 },
    { title: '编制结束时间', dataIndex: 'compileEndDate', width: 120 },
    { title: '距离编制结束天数', dataIndex: 'daysLeft', width: 140, slot: 'daysLeft' },
    { title: '编制状态', dataIndex: 'status', width: 110, fixed: 'right', slot: 'status' },
  ];

  /** 操作列：按钮随编制状态变化（已归档不可进入工作台） */
  const actionColumn: BasicColumn = {
    width: 200,
    actions: (record: Recordable) =>
      (ACTIONS_BY_STATUS[record.status as CompileStatus] ?? ['查看']).map((action: CompileAction) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 打开查看抽屉：openDrawer 传 open=false，回填就绪后由 form.vue 掀开
   *  （防闪烁，见前端 AGENTS.md 抽屉硬性规则） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(false, { ...record, isView: true });
  }

  /** 查看走只读表单；进入编制工作台走 RESTful show 路由（record.code 作 id） */
  function handleAction(action: CompileAction, record: Recordable) {
    if (action === '进入编制工作台') {
      router.push(`/ifco/annual-plan/compilation/${record.code}`);
      return;
    }
    handleForm(record);
  }

  /** 表单保存回调：写回内存数据并重铺表格（TODO: 后端接入后改为接口保存+reload） */
  function handleSuccess(data: Recordable) {
    saveTask(data as CompilationTask);
    applyFilter();
    showMessage('保存成功（本地演示，未持久化）');
  }

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterTasks({}),
    columns,
    actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '任务年份',
          field: 'taskYear',
          component: 'Select',
          componentProps: { options: taskYearOptions(), allowClear: true, placeholder: '请选择任务年份' },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      applyFilter(params);
      return params;
    },
  });

  /** 按当前搜索条件重铺表格数据 */
  function applyFilter(formValues?: Recordable) {
    const values = formValues ?? getForm().getFieldsValue();
    setTableData(filterTasks(values));
  }

  /** 占位操作（TODO：随启动编制/导入功能接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
