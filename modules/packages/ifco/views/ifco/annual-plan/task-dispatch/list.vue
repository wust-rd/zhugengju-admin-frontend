<!--
  ifco —— 年度项目安排 · 任务分解与派发（/ifco/annual-plan/task-dispatch/list）

  市局按年度下发刚性投资目标并分解到各区。结构对齐设计稿：
  任务年份搜索表单 + BasicTable（新增年度任务、下载模板、一键导入 工具栏；
  启用状态=行内开关、任务状态=Tag 标签；操作列按任务状态变化：进行中=查看+编辑、
  已结束=仅查看）。查看/新增/编辑走一体表单抽屉 form.vue（市级任务要求 +
  区级任务分解要求两分区，取消/暂存/提交）。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/task-dispatch（内存假数据，
  前 2 行照设计稿抄录；保存/启用开关写回内存，刷新即恢复）。

  菜单注册（菜单名称「任务分解与派发」）：
   - 链接地址：/ifco/annual-plan/task-dispatch/list
   - 组件位置：/ifco/annual-plan/task-dispatch/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <div class="text-16px font-600 text-gray-900">年度项目安排/任务分解与派发</div>

    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增年度任务
        </a-button>
        <a-button @click="handleTodo('下载模板')"> 下载模板 </a-button>
        <a-button @click="handleTodo('一键导入')"> 一键导入 </a-button>
      </template>
      <template #enabled="{ record }">
        <Switch :checked="record.enabled" @change="(checked) => handleToggleEnabled(record, checked)" />
      </template>
      <template #status="{ record }">
        <Tag v-bind="statusTagProps(record.status)" style="border-radius: 10px">
          {{ record.status }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/新增/编辑一体表单抽屉 -->
    <TaskForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanTaskDispatchList">
  import { Switch, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ACTIONS_BY_STATUS,
    filterTasks,
    saveTask,
    statusTagProps,
    taskYearOptions,
    type TaskAction,
    type TaskDispatchItem,
    type TaskStatus,
  } from '@jeesite/ifco/api/ifco/task-dispatch';
  import TaskForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 编制结束时间列展示市级编制结束时间；启用状态/任务状态用插槽自定义渲染 */
  const columns: BasicColumn[] = [
    { title: '任务年份', dataIndex: 'taskYear', width: 100 },
    { title: '年度刚性投资目标（亿元）', dataIndex: 'annualRigidTarget', width: 190, align: 'right' },
    { title: '创建时间', dataIndex: 'createTime', width: 120 },
    { title: '编制开始时间', dataIndex: 'compileStartDate', width: 120 },
    { title: '编制结束时间', dataIndex: 'cityCompileEndDate', width: 120 },
    { title: '启用状态', dataIndex: 'enabled', width: 100, slot: 'enabled' },
    { title: '任务状态', dataIndex: 'status', width: 100, fixed: 'right', slot: 'status' },
  ];

  /** 操作列：按钮随任务状态变化（已结束仅可查看） */
  const actionColumn: BasicColumn = {
    width: 140,
    actions: (record: Recordable) =>
      (ACTIONS_BY_STATUS[record.status as TaskStatus] ?? ['查看']).map((action: TaskAction) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 打开表单抽屉：查看/编辑一体（查看=表单禁用）。openDrawer 传 open=false——
   *  数据先回填（form.vue 的 useDrawerInner 回调），回填完成后由 form.vue 掀开
   *  抽屉：打开动画期间不发生内容/props 翻转，避免抽屉闪烁（force-render 只
   *  解决首击懒挂载，动画期间翻转是另一类问题）；showFooter 亦在闭合状态下预设 */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(false, record);
  }

  /** 查看走只读表单、编辑走可写表单 */
  function handleAction(action: TaskAction, record: Recordable) {
    if (action === '编辑') {
      handleForm(record);
    } else {
      handleForm({ ...record, isView: true });
    }
  }

  /** 表单保存回调：写回内存数据并重铺表格（TODO: 后端接入后改为接口保存+reload） */
  function handleSuccess(data: Recordable) {
    saveTask(data as TaskDispatchItem);
    applyFilter();
    showMessage('保存成功（本地演示，未持久化）');
  }

  /** 启用状态开关：写回当前行并重铺（本地演示，未持久化） */
  function handleToggleEnabled(record: TaskDispatchItem, checked: string | number | boolean) {
    record.enabled = !!checked;
    applyFilter();
    showMessage(`已${record.enabled ? '启用' : '停用'} ${record.taskYear} 年度任务`);
  }

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterTasks({}),
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
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

  /** 占位操作（TODO：随导入功能接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
