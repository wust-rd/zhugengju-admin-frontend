<!--
  ifco —— 在库项目管理（/ifco/project-library-management/project-management/list）

  项目库管理 · 四库在库项目查询。策划库→储备库→实施库为项目三段生命周期，
  项目可随时退出，退出的项目归集为已退出（状态显示「已退出」，只能查看）。
  结构对齐设计稿：
  顶部四张统计卡（策划库/储备库/实施库/已退出，卡即单选 select——默认选中
  策划库，点选切换筛选表格，URL 无 ?library= 参数时按策划库过滤）+
  BasicTable（项目名称/行政区/片区名称/片区批次/五改类型/入库年份/
  最新项目状态/项目归属 搜索表单；配置指定填报主体（维护候选机构清单，重名/
  空名红字拦截）、新增项目、一键提交、
  下载模板、一键导入、一键导出 工具栏；操作列按钮随 操作视角×项目状态 变化：
  视角=填报主体/行业主管部门/责任部门（「当前视角」切换，演示阶段页面切换、
  生产接机构角色），状态随所在卡片库决定——策划库/储备库共用 待提交/审核中/
  退回修改/审核通过 四状态流转，实施库=已入库（三视角仅查看+责任部门可转退出），
  已退出终态只读）。

  路由参数（与列表页 URL 绑定，可分享/收藏/前进后退）：
  - ?library= 四库点选，单选、默认策划库（planning/reserve/implementing/exited，
    无参数时同样按策划库过滤）；
  - ?district= 行政区（搜索表单提交/重置时同步进 URL，进入页面时回填表单）。

  查看/编辑/新增/审核走一体表单抽屉 form.vue（查看=表单禁用；审核=编辑态打开、
  审查人员在步骤②③填审查结论；页脚=取消/暂存/申请转库，申请转库二次确认后
  状态置审核中）；转入下个库/转退出为列表操作列按钮（二次确认，内存态挪库）。
  一键提交等批量操作与导入导出仍为占位待接入。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/project-library（内存假数据，
  统计卡数字与表格前 5 行照设计稿抄录，其余确定性生成共 50 条；刷新即恢复）。

  菜单注册（菜单名称「在库项目管理」）：
   - 链接地址：/ifco/project-library-management/project-management/list
   - 组件位置：/ifco/project-library-management/project-management/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 四库统计卡：单选 select（路由参数 ?library=），默认选中策划库，点选切换 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in LIBRARY_CARDS"
        :key="card.key"
        class="cursor-pointer bg-white rd-8px b-1 b-solid px-20px py-16px shadow-sm transition-colors"
        :class="selectedLibrary === card.key ? 'b-#1677ff bg-#f0f7ff' : 'b-gray-100 hover:b-gray-300'"
        @click="handleCardClick(card.key)"
      >
        <div class="flex items-center justify-between">
          <span class="text-15px font-600" :class="selectedLibrary === card.key ? 'text-#1677ff' : 'text-gray-900'">
            {{ card.label }}
          </span>
          <span
            v-if="selectedLibrary === card.key"
            class="i-ant-design:check-circle-filled text-16px text-#1677ff"
          ></span>
        </div>
        <div class="mt-4px text-12px text-gray-400">{{ card.description }}</div>
        <div class="mt-10px flex flex-wrap items-baseline gap-x-24px">
          <span class="text-14px text-gray-500">
            项目数 <span class="text-22px font-700 text-gray-900">{{ card.count }}</span> 项
          </span>
          <span v-if="card.invest !== undefined" class="text-14px text-gray-500">
            总投资 <span class="text-22px font-700 text-gray-900">{{ card.invest.toFixed(2) }}</span> 亿元
          </span>
        </div>
      </div>
    </div>

    <!-- 操作视角（操作列按钮随视角×状态变化；生产接机构角色，演示阶段页面切换） -->
    <div class="flex items-center gap-16px bg-white rd-8px px-20px py-10px shadow-sm">
      <span class="text-14px text-gray-600">当前视角</span>
      <RadioGroup v-model:value="currentRole" :options="roleOptions" option-type="button" />
    </div>

    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="openOrgDrawer(true)"> 配置指定填报主体 </a-button>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
        <a-button @click="handleTodo('一键提交')"> 一键提交 </a-button>
        <a-button @click="handleTodo('下载模板')"> 下载模板 </a-button>
        <a-button @click="handleTodo('一键导入')"> 一键导入 </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #renewalAreaName="{ record }">{{ withSlash(record.renewalAreaName) }}</template>
      <template #functionOrientationList="{ record }">
        {{ withSlash(joinList(record.functionOrientationList.map((code) => FUNCTION_ORIENTATION_LABEL[code] ?? code))) }}
      </template>
      <template #renewalAreaBatch="{ record }">
        {{ withSlash(record.renewalAreaBatch ? RENEWAL_AREA_BATCH_LABEL[record.renewalAreaBatch] : '') }}
      </template>
      <template #fiveReformType="{ record }">
        {{ withSlash(record.fiveReformType ? FIVE_REFORM_TYPE_LABEL[record.fiveReformType] : '') }}
      </template>
      <template #fundSourceList="{ record }">{{ withSlash(joinList(record.fundSourceList)) }}</template>
      <template #projectAffiliation="{ record }">
        {{ withSlash(record.projectAffiliation ? PROJECT_AFFILIATION_LABEL[record.projectAffiliation] : '') }}
      </template>
      <template #industrySupervisionDeptList="{ record }">
        {{ withSlash(joinList(record.industrySupervisionDeptList)) }}
      </template>
      <template #implementOrgList="{ record }">{{ withSlash(joinList(record.implementOrgList)) }}</template>
      <template #coordinateOrgList="{ record }">{{ withSlash(joinList(record.coordinateOrgList)) }}</template>
      <template #reportOrg="{ record }">{{ withSlash(record.reportOrg) }}</template>
      <template #status="{ record }">
        <Tag v-bind="statusTagProps(record.status)" style="border-radius: 10px">
          {{ record.status }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/新增/编辑一体表单抽屉 -->
    <ProjectForm @register="registerDrawer" @success="handleSuccess" />

    <!-- 配置指定填报主体抽屉（维护候选机构清单，重名/空名红字拦截） -->
    <OrgConfigDrawer @register="registerOrgDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementList">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Modal, RadioGroup, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import {
    ACTIONS_BY_STATUS_ROLE,
    DISTRICTS,
    FIVE_REFORM_TYPE_LABEL,
    FIVE_REFORM_TYPE_OPTIONS,
    FUNCTION_ORIENTATION_LABEL,
    FUNCTION_ORIENTATION_OPTIONS,
    LIBRARY_CARDS,
    PROJECT_AFFILIATION_LABEL,
    PROJECT_AFFILIATION_OPTIONS,
    ROLE_OPTIONS,
    RENEWAL_AREA_BATCH_LABEL,
    RENEWAL_AREA_BATCH_OPTIONS,
    RENEWAL_AREA_NAME_LIST,
    STATUS_OPTIONS,
    filterProjects,
    statusTagProps,
    transferToExited,
    transferToNextLibrary,
    type LibraryKey,
    type ProjectAction,
    type ProjectLibraryItem,
    type ProjectRole,
    type ProjectStatus,
  } from '@jeesite/ifco/api/ifco/project-library';
  import ProjectForm from './form.vue';
  import OrgConfigDrawer from './org-config-drawer.vue';

  const { showMessage } = useMessage();
  const route = useRoute();
  const router = useRouter();

  // ── 路由参数：library(四库点选) + district(行政区) ───────────────────
  /** 默认选中策划库（URL 无 ?library= 参数时同样按策划库过滤） */
  const DEFAULT_LIBRARY: LibraryKey = 'planning';

  /** 从 URL 读查询条件（进入页面时的初始过滤与表单回填来源） */
  function urlParams() {
    const library = route.query.library;
    const district = route.query.district;
    return {
      library: LIBRARY_CARDS.some((card) => card.key === library) ? (library as LibraryKey) : DEFAULT_LIBRARY,
      district: typeof district === 'string' && district ? district : undefined,
    };
  }

  const selectedLibrary = computed(() => urlParams().library);

  /** 统计卡点选（单选）：只改 URL，过滤由 route.query 的 watcher 统一触发 */
  function handleCardClick(key: LibraryKey) {
    if (selectedLibrary.value === key) return;
    const query: Record<string, string> = {};
    for (const [name, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) query[name] = value;
    }
    query.library = key;
    router.replace({ query });
  }

  // ── 表格 ────────────────────────────────────────────────────────────
  /** 项目编号/项目名称固定左侧（与复选框列同翼），最新项目状态固定右侧（与操作列同翼）；
   *  多选字段（顿号拼接）与可空字段空值显示 / */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 240, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100, slot: 'renewalAreaName' },
    { title: '片区功能定位', dataIndex: 'functionOrientationList', width: 150, slot: 'functionOrientationList' },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改类别', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '主要建设内容', dataIndex: 'mainConstructionContent', width: 260, ellipsis: true },
    { title: '项目投资估算（亿元）', dataIndex: 'investEstimate', width: 120, align: 'right' },
    { title: '资金来源', dataIndex: 'fundSourceList', width: 200, slot: 'fundSourceList' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    {
      title: '行业主管部门',
      dataIndex: 'industrySupervisionDeptList',
      width: 160,
      slot: 'industrySupervisionDeptList',
    },
    { title: '责任部门', dataIndex: 'responsibleDept', width: 120 },
    { title: '实施主体', dataIndex: 'implementOrgList', width: 160, slot: 'implementOrgList' },
    { title: '统筹主体', dataIndex: 'coordinateOrgList', width: 140, slot: 'coordinateOrgList' },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 150, slot: 'reportOrg' },
    { title: '最新项目状态', dataIndex: 'status', width: 120, fixed: 'right', slot: 'status' },
  ];

  /** 当前操作视角（默认填报主体；操作列按钮随视角×状态变化） */
  const currentRole = ref<ProjectRole>('report-org');

  const roleOptions = [...ROLE_OPTIONS];

  /** 操作列：按钮随 视角×状态 变化（查看/编辑/审核走一体表单抽屉，转入下个库/转退出带二次确认） */
  const actionColumn: BasicColumn = {
    width: 240,
    actions: (record: Recordable) =>
      (ACTIONS_BY_STATUS_ROLE[record.status as ProjectStatus]?.[currentRole.value] ?? ['查看']).map(
        (action: ProjectAction) => ({
          label: action,
          onClick: () => handleAction(action, record),
        }),
      ),
  };

  const [registerDrawer, { openDrawer }] = useDrawer();

  /** 配置指定填报主体抽屉（独立于表单抽屉的第二个 drawer 实例） */
  const [registerOrgDrawer, { openDrawer: openOrgDrawer }] = useDrawer();

  /** 打开表单抽屉：查看/编辑一体（查看=表单禁用；页脚按钮由 footer 插槽按 isView 自控） */
  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 查看走只读表单；编辑/审核走可写表单（审核=审查人员在步骤②③填审查结论，传原引用以便
   *  内存流转生效）；转入下个库/转退出带二次确认（exhaustive：漏分支编译报错） */
  function handleAction(action: ProjectAction, record: Recordable) {
    match(action)
      .with('查看', () => handleForm({ ...record, isView: true }))
      .with('编辑', '审核', () => handleForm(record))
      .with('转入下个库', () =>
        Modal.confirm({
          title: '转入下个库',
          content: `确定将「${record.projectName}」转入下个库吗？`,
          okText: '确定转入',
          cancelText: '取消',
          onOk: () => {
            transferToNextLibrary(record as ProjectLibraryItem);
            applyFilter();
            showMessage('已转入下个库（本地演示，未持久化）');
          },
        }),
      )
      .with('转退出', () =>
        Modal.confirm({
          title: '转退出',
          content: `确定将「${record.projectName}」移入已退出库吗？退出后项目只读。`,
          okText: '确定退出',
          cancelText: '取消',
          onOk: () => {
            transferToExited(record as ProjectLibraryItem);
            applyFilter();
            showMessage('已转退出（本地演示，未持久化）');
          },
        }),
      )
      .exhaustive();
  }

  /** 表单抽屉回调：暂存/申请转库后重铺表格（提示由表单内给出） */
  function handleSuccess(_data: Recordable) {
    applyFilter();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const renewalAreaNameOptions = RENEWAL_AREA_NAME_LIST.map((name) => ({ label: name, value: name }));
  const renewalAreaBatchOptions = [...RENEWAL_AREA_BATCH_OPTIONS];
  const fiveReformTypeOptions = [...FIVE_REFORM_TYPE_OPTIONS];
  const statusOptions = STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const affiliationOptions = [...PROJECT_AFFILIATION_OPTIONS];
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterProjects(urlParams()),
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '片区名称',
          field: 'renewalAreaName',
          component: 'Select',
          componentProps: { options: renewalAreaNameOptions, allowClear: true },
        },
        {
          label: '片区批次',
          field: 'renewalAreaBatch',
          component: 'Select',
          componentProps: { options: renewalAreaBatchOptions, allowClear: true },
        },
        {
          label: '五改类别',
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
    // 无后端：查询/重置走本地过滤；行政区是路由参数，提交时同步进 URL
    handleSearchInfoFn: (params: Recordable) => {
      const query: Record<string, string> = {};
      for (const [name, value] of Object.entries(route.query)) {
        if (typeof value === 'string' && value && name !== 'district') query[name] = value;
      }
      if (params.district) query.district = String(params.district);
      router.replace({ query });
      applyFilter(params);
      return params;
    },
  });

  /** 按当前条件重铺表格数据（库来自 URL，其余来自搜索表单） */
  function applyFilter(formValues?: Recordable) {
    const values = formValues ?? getForm().getFieldsValue();
    setTableData(filterProjects({ ...values, library: selectedLibrary.value }));
  }

  /** 前进/后退或统计卡点选：URL 参数变化 → 回填表单并重铺数据 */
  watch(
    () => [route.query.library, route.query.district],
    () => {
      const district = route.query.district;
      if (typeof district === 'string' && district && getForm().getFieldsValue().district !== district) {
        getForm().setFieldsValue({ district });
      }
      applyFilter();
    },
  );

  /** 切换视角：重铺表格刷新操作列按钮（数据不变） */
  watch(currentRole, () => applyFilter());

  /** 进入页面：URL 带了行政区时回填搜索表单（数据已按 URL 过滤） */
  onMounted(() => {
    const { district } = urlParams();
    if (district) getForm().setFieldsValue({ district });
  });

  /** 空值显示 / */
  function withSlash(value: string | number | undefined) {
    return value ? value : '/';
  }

  /** 多选字段：顿号拼接展示（列表单格约定） */
  function joinList(list?: string[]) {
    return (list ?? []).join('、');
  }

  /** 占位操作（TODO：随抽屉/后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
