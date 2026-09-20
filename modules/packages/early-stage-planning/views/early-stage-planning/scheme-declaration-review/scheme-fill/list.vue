<!--
  市住更局 —— 策划方案填报（片区策划申报审查 · 子模块一）

  页面对齐设计稿：顶部一层 Tab（1 已批准片区填报 / 2 待审查片区填报）。
  后端已对接（modules/esp，接口文档见后端 modules/esp/docs/接口文档-方案填报.md）：
   - 两 Tab 共用一张 BasicTable，按 isApprove 分开查询（1=已批准存量片区（默认）/
     2=待审查（新增填报）片区，后端语义：新增保存的片区进入 Tab②）；
   - 「新增」仅 Tab② 显示：Tab① 已批准片区为手动入库的存量数据，只查看/编辑，
     不可新增（后端也拒绝删除）；
   - 两 Tab 各自列布局：Tab① 批次列；Tab② 申报年份列（=batch，新增填报片区存年份）
     + 状态列。审核状态读后端 page 行 reviewStatus（approve_status 五态，2026-09-20 起
     page/form 均返回；「联合审查中」在填报单位侧仍显示「审核中」，见 fillSideStatusOf）：
     填报单位「暂存」→ 未提交（可继续编辑），「提交」→ 审核中（填报单位只能查看，
     主审单位在 …/scheme-review/list 可见）；
     操作按状态出：未提交 查看/编辑/删除；退回修改 查看/编辑/修改意见（弹窗按时间线列出
     **主审单位的审查记录** —— 后端按填报角色过滤，填报单位只能看到主审意见）；
     审核中（含联合审查中）/通过 仅查看。
   - 操作列：查看/编辑按 id 拉详情回显；删除仅 Tab② 显示（后端拒绝删除存量
     已批准片区，Tab① 不给入口；且仅 未提交/退回修改 状态可删）。
  新增 / 编辑 / 查看 以组件方式切换到整页表单（不走路由，不新增菜单注册）：
  Tab① → form-approved.vue〔查看/编辑，后端已接〕；Tab② 新增/编辑 → form-reviewing.vue
  〔申报年份 + 9 位附件材料版〕；Tab② 查看 → ../scheme-review/form.vue mode=view
   （填报内容 + 审查记录：主审与各轮联合审查意见），与审查页共用同一份假数据；
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
        <!-- 审核状态（Tab②；读后端 page 行 reviewStatus=approve_status 五态）：
             「联合审查中」在填报单位看来仍显示为「审核中」（fillSideStatusOf） -->
        <template #reviewStatus="{ record }">
          <span class="text-13px font-500" :style="{ color: REVIEW_STATUS[fillSideStatusOf(record)].color }">
            {{ REVIEW_STATUS[fillSideStatusOf(record)].label }}
          </span>
        </template>
      </BasicTable>
    </div>

    <!-- 整页表单（组件切换，不走路由）：
         Tab① 已批准片区 → form-approved.vue（查看/编辑，后端已接）；
         Tab② 待审查片区 → 查看走审查页的只读模式（scheme-review/form.vue mode=view：
           填报内容 + 审查记录），新增/编辑走 form-reviewing.vue（申报年份/9 位附件材料版） -->
    <ReviewForm
      v-if="formVisible && formKind === 'view' && activeTab === 'reviewing'"
      :record="formRecord"
      mode="view"
      viewer="fill"
      @success="handleBack"
      @back="handleBack"
    />
    <component
      :is="activeTab === 'reviewing' ? SchemeFormReviewing : SchemeFormApproved"
      v-else-if="formVisible"
      :record="formRecord"
      @success="handleSuccess"
      @back="handleBack"
    />

    <!-- 修改意见：只显示主审单位的审查记录（后端按填报角色过滤 records）；弹窗上下居中 -->
    <Modal v-model:open="opinionOpen" title="修改意见" :width="800" :footer="null" centered>
      <ReviewRecords :records="opinionRecords" :rounds="opinionRounds" :show-joint="false" />
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillList">
  import { ref, watch } from 'vue';
  import { Modal, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    schemeFillDelete,
    schemeFillPage,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import SchemeFormApproved from './form-approved.vue';
  import SchemeFormReviewing from './form-reviewing.vue';
  import ReviewForm from '../scheme-review/form.vue';
  import ReviewRecords from '../shared/review-records.vue';
  import { REVIEW_STATUS, fillSideStatusOf } from '../shared/review-constants';
  import {
    schemeReviewForm,
    type EspJointRound,
    type EspReviewRecord,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';
  import { useSchemeDict } from '../shared/use-scheme-dict';

  const { showMessage } = useMessage();

  /** 搜索区下拉选项（后端字典 dictOptions，失败回退内置清单；函数式 componentProps 保持联动） */
  const { districtOptions, funcTypeOptions } = useSchemeDict();

  /** 当前 Tab：approved=已批准片区填报（isApprove=1）/ reviewing=待审查片区填报（isApprove=2） */
  const activeTab = ref('approved');

  /** 填报视图状态：formVisible=true 时整页显示表单，formRecord 为进入时记录快照（id + isView） */
  const formVisible = ref(false);
  const formRecord = ref<Recordable>({});
  /** Tab② 表单形态：edit=新增/编辑（form-reviewing）/ view=查看（审查页只读模式，含审查记录） */
  const formKind = ref<'edit' | 'view'>('edit');

  /** 修改意见弹窗（Tab② 退回修改）：按时间线展示主审单位的审查记录（填报单位看不到联审意见） */
  const opinionOpen = ref(false);
  const opinionRecords = ref<EspReviewRecord[]>([]);
  const opinionRounds = ref<EspJointRound[]>([]);

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
   * 审核状态（Tab② 状态列/操作分支）：读后端 page 行 reviewStatus（approve_status 五态，
   * 与主审单位审查列表同一数据源）；填报单位口径「联合审查中」显示为「审核中」：
   *  - 暂存 → 未提交（可编辑/删除）；提交 → 审核中（填报单位只读）；
   *  - 退回修改 → 可编辑 + 修改意见；通过 → 只读。
   */

  /** 操作列 · Tab①：查看 / 编辑（存量片区不可新增不可删） */
  const approvedActionColumn: BasicColumn = {
    width: 120,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleForm({ ...record, isView: true }) },
      { label: '编辑', onClick: () => handleForm({ ...record }) },
    ],
  };

  /**
   * 操作列 · Tab②：按状态出操作（状态取填报单位口径，联合审查中视为审核中）——
   *  - 未提交：查看 / 编辑 / 删除；
   *  - 退回修改：查看 / 编辑 / **修改意见**（弹窗按时间线列出主审单位的审查记录）；
   *  - 审核中（含联合审查中）/ 通过：仅查看（已提交，填报单位不可再编辑）。
   * ⚠️ **提交只在「编辑」表单里做**（表单头部 暂存 / 提交），列表不再给「提交 / 重新提交」入口
   * （业务确认：退回修改后必须进编辑页改完再提交，避免列表里原样重提）。
   */
  const reviewingActionColumn: BasicColumn = {
    width: 200,
    actions: (record: Recordable) => {
      const base: Recordable[] = [{ label: '查看', onClick: () => handleView(record) }];
      const status = fillSideStatusOf(record);
      if (status === 'unsubmitted') {
        base.push(
          { label: '编辑', onClick: () => handleForm({ ...record }) },
          {
            label: '删除',
            color: 'error',
            popConfirm: { title: '是否确认删除该填报记录？', confirm: () => handleDelete(record) },
          },
        );
      } else if (status === 'returned') {
        base.push(
          { label: '编辑', onClick: () => handleForm({ ...record }) },
          { label: '修改意见', onClick: () => showOpinion(record) },
        );
      }
      return base;
    },
  };

  const BATCH_OPTIONS = ['第一批', '第二批', '新增'].map((b) => ({ label: b, value: b }));

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
          // 函数式 componentProps：字典后到也能刷新选项（FormItem computed 依赖）
          componentProps: () => ({ options: districtOptions.value, placeholder: '请选择', allowClear: true }),
        },
        {
          label: '片区功能定位',
          field: 'funcType',
          component: 'Select',
          componentProps: () => ({ options: funcTypeOptions.value, placeholder: '请选择', allowClear: true }),
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

  /** 新增/编辑：切换到整页填报表单（组件形式，不走路由）；详情由对应表单文件按 id 拉取 */
  function handleForm(record: Recordable) {
    formKind.value = 'edit';
    formRecord.value = record;
    formVisible.value = true;
  }

  /**
   * 查看：Tab① 走已批准片区表单（form-approved 只读）；Tab② 走审查页只读模式
   * （scheme-review/form.vue mode=view：填报内容 + 审查记录，含主审与联合审查意见）
   */
  function handleView(record: Recordable) {
    formKind.value = 'view';
    formRecord.value = activeTab.value === 'reviewing' ? { ...record } : { ...record, isView: true };
    formVisible.value = true;
  }

  /** 修改意见：打开弹窗即拉审查详情（records 后端按填报角色过滤=只含主审记录） */
  function showOpinion(record: Recordable) {
    opinionRecords.value = [];
    opinionRounds.value = [];
    opinionOpen.value = true;
    schemeReviewForm(String(record.id))
      .then((detail) => {
        opinionRecords.value = detail.records ?? [];
        opinionRounds.value = detail.rounds ?? [];
      })
      .catch((error) => {
        showMessage(error instanceof Error ? error.message : '加载审查记录失败');
      });
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
