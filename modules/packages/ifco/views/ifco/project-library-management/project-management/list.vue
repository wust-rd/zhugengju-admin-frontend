<!--
  ifco —— 在库项目管理（/ifco/project-library-management/project-management/list）

  项目库管理 · 四库在库项目查询。策划库→储备库→实施库为项目三段生命周期，
  项目可随时退出，退出的项目归集为已退出（状态显示「已退出」，只能查看）。
  顶部四张统计卡（卡即单选 select——默认选中策划库，点选切换筛选表格，
  数字经 stats 接口动态加载）+ BasicTable（分页走 page 接口，行键=后端联查
  列名小写；项目名称/行政区/片区名称/片区批次/五改类别/入库年份/
  最新项目状态/项目归属 搜索表单；新增项目、一键导出 工具栏；操作列按钮随项目状态变化，视角固定为填报主体）。

  状态随所在卡片库决定：策划库/储备库共用 待提交(draft)/审核中(reviewing)/
  退回修改(rejected)/审核通过(passed) 四状态流转，实施库=已入库(stored)，
  已退出(exited)终态只读（后端英文枚举，展示经 STATUS_LABEL 转中文）。

  路由参数（与列表页 URL 绑定，可分享/收藏/前进后退）：
  - ?library= 四库点选，单选、默认策划库（planning/reserve/implementing/exited）；
  - ?district= 行政区（搜索表单提交/重置时同步进 URL，请求参数经 beforeFetch 合入）。

  查看/编辑/新增/审核走一体表单抽屉 form.vue（详情经 detail 接口回填；
  页脚=取消/暂存/申请转库，审核模式=取消/保存审查）；转入下个库/转退出为
  操作列按钮（二次确认后调 transferNext/transferExit 接口，成功刷新列表与统计卡）。
  一键提交等批量操作与导入导出仍为占位待接入。

  菜单注册（菜单名称「在库项目管理」，js_sys_menu=ifco_lib_project）：
   - 链接地址：/ifco/project-library-management/project-management/list
   - 组件位置：/ifco/project-library-management/project-management/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 四库统计卡：单选 select（路由参数 ?library=），默认选中策划库，点选切换；数字走 stats 接口 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in libraryCards"
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

    <!-- 列表：搜索表单 + 工具栏 + 表格（分页接口） -->
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #areaName="{ record }">{{ withSlash(record.area_name) }}</template>
      <template #funcTypeName="{ record }">{{ withSlash(record.func_type_name) }}</template>
      <template #wgBig="{ record }">{{ withSlash(record.wg_big) }}</template>
      <template #fundSrc="{ record }">{{ withSlash(joinList(splitList(record.fund_src))) }}</template>
      <template #projectAffiliation="{ record }">
        {{ withSlash(PROJECT_AFFILIATION_LABEL[record.project_affiliation] ?? record.project_affiliation) }}
      </template>
      <template #industryDeptList="{ record }">{{ withSlash(record.industry_dept_list) }}</template>
      <template #implementOrgList="{ record }">{{ withSlash(record.implement_org_list) }}</template>
      <template #coordinateOrgList="{ record }">{{ withSlash(record.coordinate_org_list) }}</template>
      <template #reportOrg="{ record }">{{ withSlash(record.report_org) }}</template>
      <template #status="{ record }">
        <Tag v-bind="statusTagProps(record.status as ProjectStatus)" style="border-radius: 10px">
          {{ statusLabel(record.status) }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/新增/编辑/审核一体表单抽屉 -->
    <ProjectForm @register="registerDrawer" @success="refreshAll" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementList">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Modal, Tag } from 'antdv-next';
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
    FIVE_REFORM_TYPE_OPTIONS,
    LIBRARY_CARDS,
    PROJECT_AFFILIATION_LABEL,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
    RENEWAL_AREA_NAME_LIST,
    STATUS_OPTIONS,
    fetchLibPage,
    fetchLibStats,
    splitList,
    statusLabel,
    statusTagProps,
    transferLibExit,
    transferLibNext,
    type LibraryKey,
    type ProjectAction,
    type ProjectRole,
    type ProjectStatus,
  } from '@jeesite/ifco/api/ifco/project-library';
  import ProjectForm from './form.vue';

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

  // ── 四库统计卡（stats 接口） ────────────────────────────────────────
  /** 各库统计（library → {cnt, invSum}；invSum=亿元） */
  const statsMap = ref<Record<string, { cnt: number; invSum: number }>>({});

  /** 卡片=静态文案 + stats 接口数字（已退出卡无总投资） */
  const libraryCards = computed(() =>
    LIBRARY_CARDS.map((card) => {
      const stat = statsMap.value[card.key];
      return {
        ...card,
        count: stat?.cnt ?? 0,
        invest: card.key === 'exited' ? undefined : (stat?.invSum ?? 0),
      };
    }),
  );

  async function loadStats() {
    statsMap.value = {};
    for (const row of (await fetchLibStats()) ?? []) {
      statsMap.value[row.library] = { cnt: Number(row.cnt ?? 0), invSum: Number(row.invSum ?? 0) };
    }
  }

  /** 流转成功后：刷新列表与统计卡 */
  function refreshAll() {
    reload();
    loadStats();
  }

  // ── 表格（分页接口；行键=后端联查列名小写） ─────────────────────────
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'lib_project_code', width: 110, fixed: 'left' },
    { title: '项目名称', dataIndex: 'pj_name', width: 240, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'dist', width: 90 },
    { title: '片区名称', dataIndex: 'area_name', width: 100, slot: 'areaName' },
    { title: '片区功能定位', dataIndex: 'func_type_name', width: 170, slot: 'funcTypeName' },
    { title: '片区批次', dataIndex: 'batch', width: 90 },
    { title: '五改类别', dataIndex: 'wg_big', width: 110, slot: 'wgBig' },
    { title: '主要建设内容', dataIndex: 'content', width: 260, ellipsis: true },
    { title: '项目投资估算（亿元）', dataIndex: 'inv_bil', width: 130, align: 'right' },
    { title: '资金来源', dataIndex: 'fund_src', width: 200, slot: 'fundSrc' },
    { title: '项目归属', dataIndex: 'project_affiliation', width: 130, slot: 'projectAffiliation' },
    {
      title: '行业主管部门',
      dataIndex: 'industry_dept_list',
      width: 160,
      slot: 'industryDeptList',
    },
    { title: '责任部门', dataIndex: 'resp_dept', width: 120 },
    { title: '实施主体', dataIndex: 'implement_org_list', width: 160, slot: 'implementOrgList' },
    { title: '统筹主体', dataIndex: 'coordinate_org_list', width: 140, slot: 'coordinateOrgList' },
    { title: '指定填报主体', dataIndex: 'report_org', width: 150, slot: 'reportOrg' },
    { title: '最新项目状态', dataIndex: 'status', width: 120, fixed: 'right', slot: 'status' },
  ];

  /** 操作列固定视角：填报主体（按钮随状态变化；视角切换 UI 已按需求移除，
   *  行业主管部门/责任部门视角的操作差异由权限侧角色控制，不在页面演示切换） */
  const ACTION_ROLE: ProjectRole = 'report-org';

  /** 操作列：按钮随 状态 变化（查看/编辑/审核走一体表单抽屉，转入下个库/转退出带二次确认） */
  const actionColumn: BasicColumn = {
    width: 240,
    actions: (record: Recordable) =>
      (ACTIONS_BY_STATUS_ROLE[record.status as ProjectStatus]?.[ACTION_ROLE] ?? ['查看']).map(
        (action: ProjectAction) => ({
          label: action,
          onClick: () => handleAction(action, record),
        }),
      ),
  };

  const [registerDrawer, { openDrawer }] = useDrawer();

  /** 打开表单抽屉：view=只读、edit=编辑（页脚 取消/暂存/申请转库）、review=审核（页脚 取消/保存审查） */
  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 查看走只读表单；编辑/审核走可写表单（审核=审查人员在步骤②③填审查结论并保存）；
   *  转入下个库/转退出带二次确认（exhaustive：漏分支编译报错） */
  function handleAction(action: ProjectAction, record: Recordable) {
    match(action)
      .with('查看', () => handleForm({ ...record, mode: 'view' }))
      .with('编辑', () => handleForm({ ...record, mode: 'edit' }))
      .with('审核', () => handleForm({ ...record, mode: 'review' }))
      .with('转入下个库', () =>
        Modal.confirm({
          title: '转入下个库',
          content: `确定将「${record.pj_name}」转入下个库吗？`,
          okText: '确定转入',
          cancelText: '取消',
          onOk: async () => {
            await transferLibNext(record.p_uid);
            showMessage('已转入下个库');
            refreshAll();
          },
        }),
      )
      .with('转退出', () =>
        Modal.confirm({
          title: '转退出',
          content: `确定将「${record.pj_name}」移入已退出库吗？退出后项目只读。`,
          okText: '确定退出',
          cancelText: '取消',
          onOk: async () => {
            await transferLibExit(record.p_uid, '责任部门转退出');
            showMessage('已转退出');
            refreshAll();
          },
        }),
      )
      .exhaustive();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const renewalAreaNameOptions = RENEWAL_AREA_NAME_LIST.map((name) => ({ label: name, value: name }));
  const renewalAreaBatchOptions = [...RENEWAL_AREA_BATCH_OPTIONS];
  const fiveReformTypeOptions = [...FIVE_REFORM_TYPE_OPTIONS];
  const affiliationOptions = [...PROJECT_AFFILIATION_OPTIONS];
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { reload, getForm }] = useTable({
    api: fetchLibPage,
    // 分页字段对齐后端（框架 pageNo/pageSize → pageNum/pageSize），并合入 URL 参数
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, ...rest } = params;
      const url = urlParams();
      return {
        ...rest,
        pageNum: pageNo,
        pageSize,
        library: url.library,
        district: rest.district || url.district,
      };
    },
    // 框架按 listField 抽行数组（afterFetch 契约=收数组返数组）；后端总数键为 total，此处对齐
    fetchSetting: { pageField: 'pageNo', sizeField: 'pageSize', listField: 'list', totalField: 'total' },
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
          field: 'areaName',
          component: 'Select',
          componentProps: { options: renewalAreaNameOptions, allowClear: true },
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: renewalAreaBatchOptions, allowClear: true },
        },
        {
          label: '五改类别',
          field: 'wgBig',
          component: 'Select',
          componentProps: { options: fiveReformTypeOptions, allowClear: true },
        },
        {
          label: '入库年份',
          field: 'year',
          component: 'Select',
          componentProps: { options: yearOptions, allowClear: true },
        },
        {
          label: '最新项目状态',
          field: 'status',
          component: 'Select',
          componentProps: { options: STATUS_OPTIONS, allowClear: true },
        },
        {
          label: '项目归属',
          field: 'affiliation',
          component: 'Select',
          componentProps: { options: affiliationOptions, allowClear: true },
        },
      ],
    },
    // 行政区是路由参数：提交/重置时同步进 URL（beforeFetch 会再合入）
    handleSearchInfoFn: (params: Recordable) => {
      const query: Record<string, string> = {};
      for (const [name, value] of Object.entries(route.query)) {
        if (typeof value === 'string' && value && name !== 'district') query[name] = value;
      }
      if (params.district) query.district = String(params.district);
      router.replace({ query });
      return params;
    },
  });

  /** 前进/后退或统计卡点选：URL 参数变化 → 回填表单并重新查询 */
  watch(
    () => [route.query.library, route.query.district],
    () => {
      const district = route.query.district;
      if (typeof district === 'string' && district && getForm().getFieldsValue().district !== district) {
        getForm().setFieldsValue({ district });
      }
      reload();
    },
  );

  /** 进入页面：加载统计卡；URL 带了行政区时回填搜索表单（请求参数经 beforeFetch 合入） */
  onMounted(() => {
    loadStats();
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

  /** 占位操作（TODO：随后端批量/导入导出接口接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
