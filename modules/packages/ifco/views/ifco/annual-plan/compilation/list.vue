<!--
  ifco —— 年度计划编制 · 计划编制管理（/ifco/annual-plan/compilation/list）

  年度计划编制任务列表。无搜索表单（全量展示）、无工具栏按钮；表头允许换行；
  列：任务年份/年度刚性投资目标/本年度计划完成投资合计/投资目标完成率/
  编制开始时间/市级编制结束时间/区级编制结束时间/编制状态；操作列按编制状态
  变化：进行中=查看+进入编制工作台、已归档=仅查看。
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
      <template #completionRate="{ record }">{{ completionRate(record) }}</template>
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
  import { onMounted } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ACTIONS_BY_STATUS,
    compileStatusTagProps,
    completionRate,
    fetchCompileTasks,
    type CompileAction,
    type CompileStatus,
  } from '@jeesite/ifco/api/ifco/compilation';
  import TaskForm from './form.vue';

  const { showMessage } = useMessage();

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 投资目标完成率/距离编制结束天数/编制状态用插槽渲染（已归档任务天数显示 -） */
  const columns: BasicColumn[] = [
    { title: '任务年份', dataIndex: 'taskYear', width: 100, fixed: 'left' },
    { title: '年度刚性投资目标（亿元）', dataIndex: 'annualRigidTarget', width: 190, align: 'right' },
    { title: '本年度计划完成投资合计（亿元）', dataIndex: 'totalInvest', width: 190, align: 'right' },
    { title: '投资目标完成率', dataIndex: 'completionRate', width: 130, slot: 'completionRate' },
    { title: '编制开始时间', dataIndex: 'compileStartDate', width: 120 },
    { title: '市级编制结束时间', dataIndex: 'compileEndDate', width: 130 },
    { title: '区级编制结束时间', dataIndex: 'districtCompileEndDate', width: 130 },
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

  /** 表单回调（查看抽屉只读，正常不触发；兜底重拉） */
  async function handleSuccess() {
    await loadTasks();
  }

  const [registerTable, { setTableData }] = useTable({
    dataSource: [],
    columns,
    actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 10 },
    canResize: true,
  });

  /** 拉取编制任务清单重铺表格（全量展示，无筛选） */
  async function loadTasks() {
    setTableData((await fetchCompileTasks()) ?? []);
  }

  onMounted(loadTasks);
</script>

<style scoped>
  /* 长表头（市级/区级编制结束时间等）允许在列宽内换行 */
  :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
