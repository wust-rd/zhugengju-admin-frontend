<!--
  ifco —— 年度项目安排 · 任务分解与派发（/ifco/annual-plan/task-dispatch/list）

  市局按年度下发刚性投资目标并分解到各区。结构对齐设计稿：
  BasicTable（新增年度任务 工具栏；
  任务状态=Tag 标签；表头允许换行；操作列按任务状态变化：进行中=查看+编辑、
  已结束=仅查看）。查看/新增/编辑走一体表单抽屉 form.vue（市级任务要求 +
  区级任务分解要求两分区，取消/提交）。
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
  import { onMounted } from 'vue';
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ACTIONS_BY_STATUS,
    fetchAnnualTasks,
    statusTagProps,
    type TaskAction,
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
    { title: '市级编制结束时间', dataIndex: 'cityCompileEndDate', width: 130 },
    { title: '区级编制结束时间', dataIndex: 'districtCompileEndDate', width: 130 },
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

  /** 表单保存回调（表单内已调保存接口）：重拉清单 */
  async function handleSuccess() {
    await loadTasks();
    showMessage('保存成功');
  }

  const [registerTable, { setTableData }] = useTable({
    dataSource: [],
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 10 },
    canResize: true,
  });

  /** 拉取任务清单重铺表格（全量展示，无筛选） */
  async function loadTasks() {
    setTableData((await fetchAnnualTasks()) ?? []);
  }

  onMounted(loadTasks);
</script>

<style scoped>
  /* 长表头（市级/区级编制结束时间等）允许在列宽内换行 */
  :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
