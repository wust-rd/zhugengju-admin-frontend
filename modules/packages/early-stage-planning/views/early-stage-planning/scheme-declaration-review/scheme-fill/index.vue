<!--
  市住更局 —— 策划方案填报（片区策划申报审查 · 子模块一）

  页面对齐设计稿：顶部两个 Tab（片区策划申报 / 策划方案填报，前者本期不做留空）；
  「策划方案填报」内部再分 已批准片区填报 / 待审查片区填报（后者本期不做留空）。
  「已批准片区填报」内容：搜索区（片区名称/行政区/片区功能定位/片区批次 + 查询/重置）+
  填报列表（BasicTable：片区名称/行政区/片区规模/片区功能定位/片区批次/总体投资估算/填报时间/填报单位/操作），
  操作列 查看/编辑/删除（查看与编辑右侧抽屉弹出，删除带二次确认）+ 工具栏「新增」。
  注意：Tabs 需显式导入（本项目全局仅注册了 a-button/a-input，裸用 a-tabs 不会渲染）。
  当前后端尚未介入：数据来自本地 mock（内存副本，刷新恢复），接口就绪后替换加载/保存逻辑。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/scheme-declaration-review/scheme-fill/list
   - 组件位置：/early-stage-planning/scheme-declaration-review/scheme-fill/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 顶部 Tab：片区策划申报 / 策划方案填报（当前唯一有内容） -->
    <Tabs v-model:activeKey="activeTab">
      <Tabs.TabPane key="declare" tab="片区策划申报" />
      <Tabs.TabPane key="fill" tab="策划方案填报" />
    </Tabs>

    <!-- 策划方案填报 -->
    <template v-if="activeTab === 'fill'">
      <!-- 子 Tab：已批准片区填报（默认）/ 待审查片区填报（本期不做） -->
      <Tabs v-model:activeKey="fillTab">
        <Tabs.TabPane key="approved" tab="已批准片区填报" />
        <Tabs.TabPane key="reviewing" tab="待审查片区填报" />
      </Tabs>

      <!-- 已批准片区填报：搜索区 + 填报列表 -->
      <template v-if="fillTab === 'approved'">
        <BasicTable @register="registerTable" :showIndexColumn="false">
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
      </template>

      <!-- 待审查片区填报：本期不做，留空 -->
      <template v-else>
        <div class="flex h-200px items-center justify-center rd-8px bg-white text-14px text-gray-400 shadow-sm">
          待审查片区填报（待建设）
        </div>
      </template>
    </template>

    <!-- 片区策划申报 tab：待建设，先留空 -->
    <template v-else>
      <div class="flex h-200px items-center justify-center rd-8px bg-white text-14px text-gray-400 shadow-sm">
        片区策划申报（待建设）
      </div>
    </template>

    <!-- 查看 / 新增 / 编辑 表单抽屉 -->
    <SchemeForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillList">
  import { ref } from 'vue';
  import { Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import SchemeForm from './form.vue';

  const { showMessage } = useMessage();

  /** 当前 Tab：fill=策划方案填报（当前唯一有内容）/ declare=片区策划申报（待建设） */
  const activeTab = ref('fill');
  /** 策划方案填报内部子 Tab：approved=已批准片区填报 / reviewing=待审查片区填报（本期不做） */
  const fillTab = ref('approved');

  /** 片区实体（列表字段为设计稿子集；完整字段待后端接口文档确定后扩展） */
  type Scheme = {
    id: number;
    /** 片区名称 */
    name: string;
    /** 行政区 */
    district: string;
    /** 片区规模（公顷） */
    areaHa: number;
    /** 片区功能定位（多维度标签） */
    funcTypes: string[];
    /** 片区批次（第一批/第二批） */
    batch: string;
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
      funcTypes: ['COD', 'XOD'],
      batch: i % 2 === 0 ? '第一批' : '第二批',
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
      labelWidth: 110,
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

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 新增/查看/修改（先预设底部按钮显隐：查看隐藏，再 openDrawer） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
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
  }

  /** 删除（内存操作，TODO 后端就绪后调接口） */
  function handleDelete(record: Recordable) {
    schemes.value = schemes.value.filter((s) => s.id !== record.id);
    setTableData(filtered());
    showMessage('删除成功（本地演示，未持久化）');
  }
</script>
