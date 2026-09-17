<!--
  ifco —— 年度计划编制 · 计划编制工作台（show 子页）

  规划路由（RESTful，后端隐藏菜单）：
   - 链接地址：/ifco/annual-plan/compilation/{id}（{id}=任务记录编码 code，如 2027）
   - 组件位置：/ifco/annual-plan/compilation/_id/list（与链接地址不一致，菜单里需显式填写）
   - 是否可见：隐藏；上级菜单挂「计划编制管理」以点亮侧边栏
  列表页「进入编制工作台」以 record.code 跳入（下钻路由约定）。

  页面结构（对齐设计稿，上下区块）：
  标题行（计划编制工作台 · NNNN 年度计划编制 + 返回）→ 计划提交周期提示条
  （提交周期/距离截止剩余天数+进度/年度投资合计÷刚性目标/提交年度计划）→
  BasicTable（七字段搜索：采纳状态/项目名称/行政区/五改类型/入库年份/最新项目
  状态/项目归属 + 一键采纳、一键导出工具栏 + 复选框 + 项目 13 列；操作列按
  采纳状态：待采纳/不采纳=查看+采纳编辑、已采纳=仅查看）。查看/采纳编辑均走
  项目级「纳入年度计划」抽屉 ./form.vue（任务信息只读回显；采纳编辑＝确认信息
  可编辑、查看＝整表只读底部隐藏，先回填后掀开），保存即把该项目置为已采纳
  并写入本年度计划完成投资/备注（本地演示）。
  当前后端尚未介入：任务与项目行来自 @jeesite/ifco/api/ifco/compilation（内存假数据）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-12px">
    <!-- 标题行 + 返回列表 -->
    <div class="flex items-center justify-between">
      <div class="text-16px font-600 text-gray-900">{{ pageTitle }}</div>
      <a-button @click="goBack"> <Icon icon="i-ant-design:arrow-left-outlined" /> 返回 </a-button>
    </div>

    <!-- 计划提交周期提示条：周期 / 剩余天数+进度 / 投资合计÷目标 / 提交年度计划 -->
    <div
      v-if="task"
      class="flex flex-wrap items-center gap-x-32px gap-y-8px b-1 b-solid b-#ffe58f bg-#fffbe6 rd-8px px-20px py-12px text-14px"
    >
      <span class="flex items-center gap-6px">
        <Icon icon="i-ant-design:clock-circle-outlined" class="text-16px text-#faad14" />
        <span class="text-gray-700">
          年度计划提交周期：{{ task.taskYear }} 年 · {{ task.compileStartDate }} 至 {{ task.compileEndDate }}
        </span>
      </span>
      <span v-if="task.status === '进行中'" class="flex items-center gap-8px text-gray-700">
        距离截止时间剩余 {{ daysUntilDeadline(task) }} 天
        <Progress class="w-160px" :percent="completionPercent" :show-info="false" size="small" />
      </span>
      <span v-else class="text-gray-500">编制已结束（已归档）</span>
      <span class="text-gray-700">
        年度投资合计 <span class="font-600 text-gray-900">{{ task.totalInvest.toFixed(2) }}</span> 亿 / 刚性目标
        <span class="font-600 text-gray-900">{{ task.annualRigidTarget.toFixed(2) }}</span> 亿
      </span>
      <a-button type="primary" class="ml-auto" @click="handleTodo('提交年度计划')"> 提交年度计划 </a-button>
    </div>

    <!-- 项目表：搜索表单（采纳状态在最前）+ 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" @click="handleAdoptAll"> 一键采纳 </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #renewalAreaName="{ record }">{{ record.renewalAreaName || '/' }}</template>
      <template #fiveReformType="{ record }">
        {{ record.fiveReformType ? FIVE_REFORM_TYPE_LABEL[record.fiveReformType] : '/' }}
      </template>
      <template #yearPlanInvest="{ record }">
        {{ record.yearPlanInvest !== undefined && record.yearPlanInvest !== null ? record.yearPlanInvest : '-' }}
      </template>
      <template #fundSourceList="{ record }">{{ record.fundSourceList.join('、') || '/' }}</template>
      <template #projectAffiliation="{ record }">
        {{ record.projectAffiliation ? PROJECT_AFFILIATION_LABEL[record.projectAffiliation] : '/' }}
      </template>
      <template #status="{ record }">
        <Tag color="blue" variant="outlined" style="border-radius: 10px">{{ record.status }}</Tag>
      </template>
      <template #adoptStatus="{ record }">
        <Tag v-bind="adoptStatusTagProps(record.adoptStatus)" style="border-radius: 10px">
          {{ record.adoptStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 采纳编辑表单抽屉（先回填后掀开） -->
    <TaskForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoAnnualPlanCompilationIdList">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Progress, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import {
    ACTIONS_BY_ADOPT,
    ADOPT_STATUS_OPTIONS,
    DISTRICTS,
    adoptProject,
    adoptProjects,
    adoptStatusTagProps,
    daysUntilDeadline,
    filterWorkbench,
    findTask,
    type AdoptStatus,
    type CompilationTask,
    type WorkbenchProject,
  } from '@jeesite/ifco/api/ifco/compilation';
  import {
    FIVE_REFORM_TYPE_LABEL,
    FIVE_REFORM_TYPE_OPTIONS,
    PROJECT_AFFILIATION_LABEL,
    PROJECT_AFFILIATION_OPTIONS,
    STATUS_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import TaskForm from './form.vue';

  const { showMessage } = useMessage();
  const { params } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}：路由参数名与占位符一致
  const code = ((params.id ?? params.code) as string) || '';

  /** 按记录编码反查任务（下钻路由约定） */
  const task = ref<CompilationTask | undefined>(findTask(code));

  const pageTitle = computed(() =>
    task.value ? `计划编制工作台 · ${task.value.taskYear}年度计划编制` : '计划编制工作台',
  );

  /** 页签标题随任务年份同步 */
  const { setTitle } = useTabs(router);
  onMounted(() => {
    if (task.value?.taskYear) {
      setTitle(`计划编制工作台-${task.value.taskYear}年`);
    }
  });

  /** 投资目标完成率（数值，驱动进度条；展示值同列表页 completionRate） */
  const completionPercent = computed(() => {
    const target = task.value?.annualRigidTarget ?? 0;
    if (!target) return 0;
    return Math.min(100, Math.round(((task.value?.totalInvest ?? 0) / target) * 1000) / 10);
  });

  /** 更新片区/五改分类/年度投资计划/资金来源/项目归属/项目状态/采纳状态用插槽渲染 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 220, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '更新片区', dataIndex: 'renewalAreaName', width: 110, slot: 'renewalAreaName' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '投资估算(亿元)', dataIndex: 'investEstimate', width: 120, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 140, align: 'right', slot: 'yearPlanInvest' },
    { title: '资金来源', dataIndex: 'fundSourceList', width: 180, slot: 'fundSourceList' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '计划开工时间', dataIndex: 'planStartDate', width: 110 },
    { title: '当前项目状态', dataIndex: 'status', width: 110, slot: 'status' },
    { title: '采纳状态', dataIndex: 'adoptStatus', width: 100, fixed: 'right', slot: 'adoptStatus' },
  ];

  /** 操作列：按钮随采纳状态变化（已采纳仅查看，待采纳/不采纳可采纳编辑改判） */
  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) =>
      (ACTIONS_BY_ADOPT[record.adoptStatus as AdoptStatus] ?? ['查看']).map((action: string) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const adoptStatusOptions = ADOPT_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const fiveReformTypeOptions = [...FIVE_REFORM_TYPE_OPTIONS];
  const statusOptions = STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const affiliationOptions = [...PROJECT_AFFILIATION_OPTIONS];
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm, getSelectRows }] = useTable({
    dataSource: filterWorkbench(code),
    columns,
    actionColumn,
    rowKey: 'projectCode',
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        {
          label: '采纳状态',
          field: 'adoptStatus',
          component: 'Select',
          componentProps: { options: adoptStatusOptions, allowClear: true, placeholder: '请选择采纳状态' },
        },
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '五改类型',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: { options: fiveReformTypeOptions, allowClear: true },
        },
        {
          label: '入库年份',
          field: 'inLibraryYear',
          component: 'Select',
          componentProps: { options: yearOptions, allowClear: true },
        },
        {
          label: '最新项目状态',
          field: 'status',
          component: 'Select',
          componentProps: { options: statusOptions, allowClear: true },
        },
        {
          label: '项目归属',
          field: 'projectAffiliation',
          component: 'Select',
          componentProps: { options: affiliationOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤（采纳状态在搜索表单内，空值 = 全部）
    handleSearchInfoFn: (params: Recordable) => {
      applyFilter(params);
      return params;
    },
  });

  /** 按当前搜索条件（含采纳状态）重铺表格数据 */
  function applyFilter(formValues?: Recordable) {
    const values = formValues ?? getForm().getFieldsValue();
    setTableData(filterWorkbench(code, values));
  }

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 查看/采纳编辑均走项目级「纳入年度计划」抽屉（./form.vue）：查看＝整表
   *  只读（底部按钮隐藏），采纳编辑＝确认信息可编辑 */
  function handleAction(action: string, record: Recordable) {
    if (action !== '查看' && action !== '采纳编辑') return;
    if (!task.value) return;
    // openDrawer 传 open=false：回填就绪后由 form.vue 掀开（防闪烁）；
    // showFooter 按只读与否预设（硬性规则：打开动画期间翻转会首击不弹）
    const isView = action === '查看';
    setDrawerProps({ showFooter: !isView });
    openDrawer(false, { task: task.value, project: record, isView });
  }

  /** 纳入年度计划保存回调：目标项目置为已采纳并写入本年度计划完成投资/备注 */
  function handleSuccess(data: Recordable) {
    adoptProject(code, data.projectCode, {
      yearPlanInvest: data.yearPlanInvest,
      remarks: data.remarks,
    });
    applyFilter();
    showMessage('已纳入年度计划（本地演示，未持久化）');
  }

  /** 一键采纳：勾选的项目批量置为已采纳 */
  function handleAdoptAll() {
    const rows = getSelectRows() as WorkbenchProject[];
    if (!rows.length) {
      showMessage('请先勾选需要采纳的项目');
      return;
    }
    adoptProjects(
      code,
      rows.map((row) => row.projectCode),
    );
    applyFilter();
    showMessage(`已采纳 ${rows.length} 个项目（本地演示，未持久化）`);
  }

  /** 返回计划编制管理列表 */
  function goBack() {
    router.push('/ifco/annual-plan/compilation/list');
  }

  /** 占位操作（TODO：随导出/提交/详情接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
