<!--
  市住更局 —— 策划方案填报（片区策划申报审查 · 子模块一）

  页面对齐设计稿：顶部一层 Tab（1 已批准片区填报 / 2 待审查片区填报，后者本期不做留空）。
  「已批准片区填报」内容：搜索区（片区名称/行政区/片区功能定位/片区批次 + 查询/重置；
  showAdvancedButton=false，四项与按钮一行平铺，无展开/折叠）+
  填报列表（BasicTable：片区名称/行政区/片区规模/片区功能定位/片区批次/总体投资估算/填报时间/填报单位/操作），
  操作列 查看/编辑/删除（删除带二次确认）+ 工具栏「新增」。
  新增 / 查看 / 编辑 均以组件形式切换到整页填报表单（form.vue），不新增路由与菜单注册；
  列表视图用 v-show 保留挂载（表格不卸载，搜索/分页状态与 setTableData 均不受切换影响）。
  注意：Tabs 需显式导入（本项目全局仅注册了 a-button/a-input，裸用 a-tabs 不会渲染）；
  contentClass 的 overflow-visible! 用于覆盖 PageWrapper 容器的 overflow-y:auto——
  祖先 overflow 非 visible 会使填报页操作栏的 sticky 吸顶失效（该容器本无高度约束，覆盖无副作用）。
  当前后端尚未介入：数据来自本地 mock（内存副本，刷新恢复），接口就绪后替换加载/保存逻辑。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/scheme-declaration-review/scheme-fill/list
   - 组件位置：/early-stage-planning/scheme-declaration-review/scheme-fill/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px overflow-visible!">
    <!-- 列表视图（v-show：切到表单时不卸载，保留表格搜索/分页状态） -->
    <div v-show="!formVisible" class="flex flex-col gap-16px">
      <!-- 顶部 Tab：已批准片区填报（默认）/ 待审查片区填报（本期不做） -->
      <Tabs v-model:activeKey="activeTab">
        <Tabs.TabPane key="approved" tab="已批准片区填报" />
        <Tabs.TabPane key="reviewing" tab="待审查片区填报" />
      </Tabs>

      <!-- 已批准片区填报：搜索区 + 填报列表 -->
      <BasicTable v-if="activeTab === 'approved'" @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>填报列表</span>
        </template>
        <template #toolbar>
          <a-button type="primary" @click="handleForm({ isNewRecord: true })">
            <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增 </span>
          </a-button>
        </template>
        <!-- 片区功能定位：多维度胶囊并列展示 -->
        <template #funcType="{ record }">
          <span class="inline-flex flex-wrap items-center gap-4px">
            <span
              v-for="t in record.funcTypes"
              :key="t"
              class="inline-flex rd-4px px-6px py-2px text-12px font-500 text-gray-700"
              style="background: #eff6ff"
            >
              {{ t }}
            </span>
          </span>
        </template>
      </BasicTable>

      <!-- 待审查片区填报 tab：本期不做，留空 -->
      <div v-else class="flex h-200px items-center justify-center rd-8px bg-white text-14px text-gray-400 shadow-sm">
        待审查片区填报（待建设）
      </div>
    </div>

    <!-- 填报视图：新增 / 查看 / 编辑 整页表单（组件切换，不走路由） -->
    <SchemeForm v-if="formVisible" :record="formRecord" @success="handleSuccess" @back="handleBack" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillList">
  import { ref } from 'vue';
  import { Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import SchemeForm from './form.vue';

  const { showMessage } = useMessage();

  /** 当前 Tab：approved=已批准片区填报（当前唯一有内容）/ reviewing=待审查片区填报（本期不做） */
  const activeTab = ref('approved');

  /** 填报视图状态：formVisible=true 时整页显示表单，formRecord 为进入时记录快照 */
  const formVisible = ref(false);
  const formRecord = ref<Recordable>({});

  /** 片区项目（项目情况 tab 逐个填报） */
  type ProjectItem = {
    /** 项目名称 */
    name: string;
    /** 改造类别 */
    category: string;
    /** 实施主体 */
    implOrg: string;
    /** 项目总投资估算（亿元） */
    investEstimate: number;
    /** 项目资金来源（可多选） */
    fundSources: string[];
    /** 本年度计划完成投资（亿元） */
    yearInvest: number;
    /** 计划开工时间（YYYY-MM） */
    startDate: string;
    /** 计划竣工时间（YYYY-MM） */
    endDate: string;
    /** 主要建设内容 */
    content: string;
    /** 实施方案附件（文件名） */
    planFiles: string[];
    /** 项目矢量图斑（GeoJSON 字符串，GeoDataSection 维护） */
    mapSpot?: string;
    /** 项目矢量图斑源文件名（上传解析时记录，地图绘制则为空） */
    mapSpotFileName?: string;
  };

  /** 片区实体（填报字段对齐「片区基本信息」设计稿；完整字段待后端接口文档确定后扩展） */
  type Scheme = {
    id: number;
    /** 片区名称 */
    name: string;
    /** 行政区 */
    district: string;
    /** 片区规模（公顷） */
    areaHa: number;
    /** 片区批次（第一批/第二批） */
    batch: string;
    /** 起始时间（YYYY-MM） */
    startTime: string;
    /** 统筹主体 */
    overallOrg: string;
    /** 片区概况（不超过150字） */
    overview: string;
    /** 片区概况图片（文件名，1-3张） */
    overviewImages: string[];
    /** 片区范围（文字描述：东至…西至…） */
    scopeDesc: string;
    /** 片区范围线（GeoJSON 字符串，GeoDataSection 维护） */
    scopeLine?: string;
    /** 片区范围线源文件名（上传解析时记录，地图绘制则为空） */
    scopeLineFileName?: string;
    /** 问题整治清单（一行一条） */
    problemList: string[];
    /** 发展机遇清单（一行一条） */
    opportunityList: string[];
    /** 更新诉求清单（一行一条） */
    demandList: string[];
    /** 片区功能定位（多选：TOD/EOD/IOD/SOD/COD/HOD/其他）——亦用于列表胶囊展示 */
    funcTypes: string[];
    /** 功能策划（文字描述） */
    funcPlan: string;
    /** 策划图册（图片文件名，最多5张） */
    atlas: string[];
    /** 片区项目情况（项目 tab 逐个填报） */
    projects: ProjectItem[];
    /** 片区资金来源：{ 来源名: 金额（亿元）| null }，键存在即选中 */
    fundSources: Record<string, number | null>;
    /** 附件材料（文件名清单，均支持多文件） */
    schemePlanFiles: string[];
    chartFiles: string[];
    healthReportFiles: string[];
    approvalFiles: string[];
    otherFiles: string[];
    /** 以下为列表展示字段（来自早期设计稿，待与后端接口对齐后调整） */
    /** 总体投资估算（亿元） */
    invest: number;
    /** 填报时间（YYYY-MM-DD HH:mm） */
    reportTime: string;
    /** 填报单位 */
    reportOrg: string;
  };

  /** 本地假数据（内存副本，刷新恢复；接口就绪后替换为 defHttp 分页查询） */
  const schemes = ref<Scheme[]>(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: 'xx片',
      district: '汉阳区',
      areaHa: 25.7,
      batch: i % 2 === 0 ? '第一批' : '第二批',
      startTime: '2026-06',
      overallOrg: '汉阳区住更局',
      overview: '片区位于汉阳区核心地段，老旧小区集中，拟通过连片改造完善公共服务配套。',
      overviewImages: [],
      scopeDesc: '东至龙阳大道，西至芳草路，北至汉阳大道，南至墨水湖南路。',
      problemList: ['片区内 3 个老旧小区供水管网老化，雨污分流不彻底。'],
      opportunityList: ['轨道 12 号线站点规划落地，带动周边连片开发。'],
      demandList: ['恳请市级统筹加快片区供排水管网改造立项。'],
      funcTypes: ['COD', 'XOD'],
      funcPlan: '以 COD 文化导向为主、XOD 混合开发为辅，打造滨水活力街区。',
      atlas: [],
      projects: [
        {
          name: 'xx片区供水管网改造项目',
          category: '老旧小区改造',
          implOrg: '汉阳区水务有限公司',
          investEstimate: 3.2,
          fundSources: ['财政资金', '专项债券'],
          yearInvest: 1.5,
          startDate: '2026-10',
          endDate: '2027-12',
          content: '改造供水管网 8.6 公里，同步实施雨污分流与泵站更新。',
          planFiles: [],
        },
      ],
      fundSources: { '中央预算资金—中央预算内投资': 0.8, 地方政府专项债券: 2.5 },
      schemePlanFiles: ['xx片区更新策划方案.pdf'],
      chartFiles: [],
      healthReportFiles: [],
      approvalFiles: [],
      otherFiles: [],
      invest: 10,
      reportTime: '2026-12-10 10:30',
      reportOrg: '汉阳区住更局',
    })),
  );

  /** 表格列（对齐设计稿） */
  const columns: BasicColumn[] = [
    { title: '片区名称', dataIndex: 'name', width: 120 },
    { title: '行政区', dataIndex: 'district', width: 100 },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 130, align: 'center' },
    { title: '片区功能定位', dataIndex: 'funcTypes', width: 160, slot: 'funcType' },
    { title: '片区批次', dataIndex: 'batch', width: 100 },
    { title: '总体投资估算（亿元）', dataIndex: 'invest', width: 160, align: 'center' },
    { title: '填报时间', dataIndex: 'reportTime', width: 150 },
    { title: '填报单位', dataIndex: 'reportOrg', width: 140 },
  ];

  /** 操作列：查看 / 编辑 / 删除 */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleForm({ ...record, isView: true }) },
      { label: '编辑', onClick: () => handleForm({ ...record }) },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该填报记录？', confirm: () => handleDelete(record) },
      },
    ],
  };

  /** 搜索表单（本地过滤，接口就绪后改为服务端查询） */
  const searchParams = ref<Recordable>({});

  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));
  const FUNC_OPTIONS = ['COD', 'TOD', 'IOD', 'SOD', 'EOD', 'HOD', 'XOD'].map((f) => ({ label: f, value: f }));
  const BATCH_OPTIONS = ['第一批', '第二批'].map((b) => ({ label: b, value: b }));

  const [registerTable, { setTableData }] = useTable({
    dataSource: schemes.value,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 6, lg: 5 },
      labelWidth: 90,
      // 不折叠：四项 + 查询/重置一行平铺（lg 下 4×5 + 按钮列 4 = 24）
      showAdvancedButton: false,
      actionColOptions: { md: 6, lg: 4 },
      schemas: [
        { label: '片区名称', field: 'name', component: 'Input', componentProps: { placeholder: '请输入/选择' } },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: DISTRICT_OPTIONS, placeholder: '请选择', allowClear: true },
        },
        {
          label: '片区功能定位',
          field: 'funcType',
          component: 'Select',
          componentProps: { options: FUNC_OPTIONS, placeholder: '请选择', allowClear: true },
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: BATCH_OPTIONS, placeholder: '请选择', allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      searchParams.value = { ...params };
      setTableData(filtered());
      return params;
    },
  });

  /** 按搜索条件过滤（name 模糊；district/batch 精确；funcType 命中标签数组任一项） */
  function filtered(): Scheme[] {
    const { name, district, batch, funcType } = searchParams.value;
    return schemes.value.filter((s) => {
      if (name && !s.name.includes(String(name).trim())) return false;
      if (district && s.district !== district) return false;
      if (batch && s.batch !== batch) return false;
      if (funcType && !s.funcTypes.includes(String(funcType))) return false;
      return true;
    });
  }

  /** 新增/查看/修改：切换到整页表单（组件形式，不走路由） */
  function handleForm(record: Recordable) {
    formRecord.value = record;
    formVisible.value = true;
  }

  /** 返回列表（取消/头部返回） */
  function handleBack() {
    formVisible.value = false;
  }

  /** 表单保存回调：新增插到最前、修改原地合并（内存操作，TODO 后端就绪后调接口） */
  function handleSuccess(data: Recordable) {
    if (data.isNewRecord) {
      schemes.value = [
        {
          ...(data as unknown as Scheme),
          id: schemes.value.reduce((max, s) => Math.max(max, s.id), 0) + 1,
          reportTime: data.reportTime || '2026-12-10 10:30',
        },
        ...schemes.value,
      ];
      showMessage('新增成功（本地演示，未持久化）');
    } else {
      schemes.value = schemes.value.map((s) => (s.id === data.id ? { ...s, ...data } : s));
      showMessage('保存成功（本地演示，未持久化）');
    }
    setTableData(filtered());
    formVisible.value = false;
  }

  /** 删除（内存操作，TODO 后端就绪后调接口） */
  function handleDelete(record: Recordable) {
    schemes.value = schemes.value.filter((s) => s.id !== record.id);
    setTableData(filtered());
    showMessage('删除成功（本地演示，未持久化）');
  }
</script>
