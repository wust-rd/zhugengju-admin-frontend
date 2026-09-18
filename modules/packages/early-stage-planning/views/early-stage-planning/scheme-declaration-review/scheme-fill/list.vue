<!--
  市住更局 —— 策划方案填报（片区策划申报审查 · 子模块一）

  页面对齐设计稿：顶部一层 Tab（1 已批准片区填报 / 2 待审查片区填报）。
  后端已对接（modules/esp，接口文档见后端 modules/esp/docs/接口文档-方案填报.md）：
   - 两 Tab 共用一张 BasicTable，按 isApprove 分开查询（1=已批准存量片区（默认）/
     2=待审查（新增填报）片区，后端语义：新增保存的片区进入 Tab②）；
   - 「新增」仅 Tab② 显示：Tab① 已批准片区为手动入库的存量数据，只查看/编辑，
     不可新增（后端也拒绝删除）；
   - 两 Tab 各自列布局：Tab① 批次列；Tab② 申报年份列（=batch，新增填报片区存年份）
     + 状态列。审核状态四类（通过/未提交/审核中/退回修改）**后端暂无字段，前端 mock**
     （按 id 哈希稳定分配 + 提交/重新提交写内存覆盖，刷新恢复；接口就绪后替换）；
     操作按状态出：通过/审核中仅查看；未提交 加 编辑/提交/删除；退回修改 加
     编辑/重新提交/修改意见；
   - 操作列：查看/编辑按 id 拉详情回显；删除仅 Tab② 显示（后端拒绝删除存量
     已批准片区，Tab① 不给入口）。
  新增 / 查看 / 编辑 均以组件方式切换到整页填报表单（form.vue），不新增路由与菜单注册；
  列表视图用 v-show 保留挂载（表格不卸载，搜索/分页状态与 reload 均不受切换影响）。
  注意：Tabs 需显式导入（本项目全局仅注册了 a-button/a-input，裸用 a-tabs 不会渲染）；
  contentClass 的 overflow-visible! 用于覆盖 PageWrapper 容器的 overflow-y:auto——
  祖先 overflow 非 visible 会使填报页操作栏的 sticky 吸顶失效（该容器本无高度约束，覆盖无副作用）。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址 / 组件位置：/early-stage-planning/scheme-declaration-review/scheme-fill/list
     （推荐，与文件名一致）；已注册成 …/index 的无需改——同目录 index.vue 为兼容别名。
   ⚠️ 组件位置必须与实际文件名精确一致——路由 dynamicImport 按「去扩展名后全等」
   匹配 views 下文件，配成不存在的文件名会整页 404。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px overflow-visible!">
    <!-- 列表视图（v-show：切到表单时不卸载，保留表格搜索/分页状态） -->
    <div v-show="!formVisible" class="flex flex-col gap-16px">
      <!-- 顶部 Tab：已批准片区填报（默认）/ 待审查片区填报（新增填报片区） -->
      <Tabs v-model:activeKey="activeTab">
        <Tabs.TabPane key="approved" tab="已批准片区填报" />
        <Tabs.TabPane key="reviewing" tab="待审查片区填报" />
      </Tabs>

      <!-- 填报列表（两 Tab 共用，isApprove 由 beforeFetch 注入） -->
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>填报列表</span>
        </template>
        <template #toolbar>
          <!-- 新增仅 Tab②：Tab① 已批准片区为手动入库的存量数据，只让编辑；
               isApprove='2' 供表单按「申报年份」模式渲染（值仍存 batch） -->
          <a-button
            v-if="activeTab === 'reviewing'"
            type="primary"
            @click="handleForm({ isNewRecord: true, isApprove: '2' })"
          >
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
        <!-- 审核状态（Tab②；mock 分配见 script 的 statusKeyOf） -->
        <template #reviewStatus="{ record }">
          <span
            class="text-13px font-500"
            :style="{ color: REVIEW_STATUS[statusKeyOf(record) as keyof typeof REVIEW_STATUS].color }"
          >
            {{ REVIEW_STATUS[statusKeyOf(record) as keyof typeof REVIEW_STATUS].label }}
          </span>
        </template>
      </BasicTable>
    </div>

    <!-- 填报视图：新增 / 查看 / 编辑 整页表单（组件切换，不走路由） -->
    <SchemeForm v-if="formVisible" :record="formRecord" @success="handleSuccess" @back="handleBack" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillList">
  import { ref, watch } from 'vue';
  import { Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    schemeFillDelete,
    schemeFillPage,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import SchemeForm from './form.vue';

  const { showMessage } = useMessage();

  /** 当前 Tab：approved=已批准片区填报（isApprove=1）/ reviewing=待审查片区填报（isApprove=2） */
  const activeTab = ref('approved');

  /** 填报视图状态：formVisible=true 时整页显示表单，formRecord 为进入时记录快照（id + isView） */
  const formVisible = ref(false);
  const formRecord = ref<Recordable>({});

  /** 表格列 · Tab① 已批准片区（对齐设计稿；批次=第一批/第二批） */
  const approvedColumns: BasicColumn[] = [
    { title: '片区名称', dataIndex: 'name', width: 120 },
    { title: '行政区', dataIndex: 'district', width: 100 },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 130, align: 'center' },
    { title: '片区功能定位', dataIndex: 'funcTypes', width: 160, slot: 'funcType' },
    { title: '片区批次', dataIndex: 'batch', width: 100 },
    { title: '总体投资估算（亿元）', dataIndex: 'invest', width: 160, align: 'center' },
    { title: '填报时间', dataIndex: 'reportTime', width: 150 },
    { title: '填报单位', dataIndex: 'reportOrg', width: 140 },
  ];

  /**
   * 表格列 · Tab② 待审查片区（对齐设计稿：申报年份 + 状态列，无批次列）。
   * 申报年份 = batch（新增填报片区存年份，见 section-basic-info 申报年份模式）。
   */
  const reviewingColumns: BasicColumn[] = [
    { title: '申报年份', dataIndex: 'batch', width: 90, align: 'center' },
    { title: '片区名称', dataIndex: 'name', width: 120 },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 120, align: 'center' },
    { title: '片区功能定位', dataIndex: 'funcTypes', width: 130, slot: 'funcType' },
    { title: '总体投资估算（亿元）', dataIndex: 'invest', width: 140, align: 'center' },
    { title: '填报时间', dataIndex: 'reportTime', width: 140 },
    { title: '填报单位', dataIndex: 'reportOrg', width: 130 },
    { title: '状态', dataIndex: 'reviewStatus', width: 90, slot: 'reviewStatus' },
  ];

  /**
   * 审核状态（四类，对齐设计稿）。后端暂无状态字段（is_approve 仅批准标记 1/2），
   * 前端 mock：按记录 id 哈希稳定分配（多数「通过」），提交/重新提交动作写入内存
   * 覆盖表（刷新恢复）；后端状态接口就绪后以接口值为准并去掉本段。
   */
  type ReviewStatusKey = 'passed' | 'unsubmitted' | 'reviewing' | 'returned';
  const REVIEW_STATUS: Record<ReviewStatusKey, { label: string; color: string }> = {
    passed: { label: '通过', color: '#52c41a' },
    unsubmitted: { label: '未提交', color: '#f5222d' },
    reviewing: { label: '审核中', color: '#1677ff' },
    returned: { label: '退回修改', color: '#fa8c16' },
  };

  /** 内存状态覆盖（提交/重新提交后写入；仅本页会话有效） */
  const statusOverrides = new Map<string, ReviewStatusKey>();

  /** 字符串哈希 → 稳定 mock 状态（7 取模：0/1/2 为未提交/审核中/退回修改，其余通过） */
  function mockStatusKey(record: Recordable): ReviewStatusKey {
    const id = String(record.id ?? record.name ?? '');
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) % 997;
    }
    return (['unsubmitted', 'reviewing', 'returned'] as const)[h % 7] ?? 'passed';
  }

  function statusKeyOf(record: Recordable): ReviewStatusKey {
    return statusOverrides.get(String(record.id)) ?? mockStatusKey(record);
  }

  /** 操作列 · Tab①：查看 / 编辑（存量片区不可新增不可删） */
  const approvedActionColumn: BasicColumn = {
    width: 120,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleForm({ ...record, isView: true }) },
      { label: '编辑', onClick: () => handleForm({ ...record }) },
    ],
  };

  /** 操作列 · Tab②：按状态出操作——通过/审核中仅查看；未提交 加编辑/提交/删除；
      退回修改 加编辑/重新提交/修改意见（提交类动作 mock：写内存状态 + 刷新） */
  const reviewingActionColumn: BasicColumn = {
    width: 230,
    actions: (record: Recordable) => {
      const base: Recordable[] = [{ label: '查看', onClick: () => handleForm({ ...record, isView: true }) }];
      const status = statusKeyOf(record);
      if (status === 'unsubmitted') {
        base.push(
          { label: '编辑', onClick: () => handleForm({ ...record }) },
          {
            label: '提交',
            popConfirm: { title: '确认提交审核？', confirm: () => handleSubmit(record, '已提交审核（演示）') },
          },
          {
            label: '删除',
            color: 'error',
            popConfirm: { title: '是否确认删除该填报记录？', confirm: () => handleDelete(record) },
          },
        );
      } else if (status === 'returned') {
        base.push(
          { label: '编辑', onClick: () => handleForm({ ...record }) },
          {
            label: '重新提交',
            popConfirm: { title: '确认重新提交审核？', confirm: () => handleSubmit(record, '已重新提交审核（演示）') },
          },
          { label: '修改意见', onClick: () => showMessage('演示：修改意见待后端接口（审批流程未建设）') },
        );
      }
      return base;
    },
  };

  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));
  /** 功能定位选项（对齐后端 esp 字典：TOD/COD/SOD/EOD/IOD/HOD/POD） */
  const FUNC_OPTIONS = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD', 'POD'].map((f) => ({ label: f, value: f }));
  const BATCH_OPTIONS = ['第一批', '第二批'].map((b) => ({ label: b, value: b }));

  const [registerTable, { reload, setColumns, setProps }] = useTable({
    api: schemeFillPage,
    beforeFetch: (params: Recordable) => ({ ...params, isApprove: activeTab.value === 'approved' ? '1' : '2' }),
    columns: approvedColumns,
    actionColumn: approvedActionColumn,
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
  });

  /** Tab 切换 → 换列与操作列（Tab② 为申报年份+状态列、按状态操作）+ 按新 isApprove 重新查询 */
  watch(activeTab, (tab) => {
    const reviewing = tab === 'reviewing';
    void setColumns(reviewing ? reviewingColumns : approvedColumns);
    void setProps({ actionColumn: reviewing ? reviewingActionColumn : approvedActionColumn });
    if (!formVisible.value) {
      void reload();
    }
  });

  /** 提交 / 重新提交（mock：后端无审核流转接口，仅写内存状态并刷新本页） */
  async function handleSubmit(record: Recordable, tip: string) {
    statusOverrides.set(String(record.id), 'reviewing');
    showMessage(tip);
    void reload();
  }

  /** 新增/查看/修改：切换到整页表单（组件形式，不走路由）；详情由 form.vue 按 id 拉取 */
  function handleForm(record: Recordable) {
    formRecord.value = record;
    formVisible.value = true;
  }

  /** 返回列表（取消/头部返回/详情加载失败） */
  function handleBack() {
    formVisible.value = false;
  }

  /** 表单保存回调：刷新列表（新落在待审查 Tab②，可在该 Tab 查看） */
  function handleSuccess(saved: Recordable) {
    void reload();
    formVisible.value = false;
    // 新增落待审查 Tab：切过去让用户立即看到刚保存的记录
    if (saved.isNewRecord) {
      activeTab.value = 'reviewing';
    }
  }

  /** 删除（仅待审查片区；后端校验存量已批准片区不可删） */
  async function handleDelete(record: Recordable) {
    try {
      await schemeFillDelete(String(record.id));
      showMessage('删除成功');
      void reload();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '删除失败');
    }
  }
</script>
