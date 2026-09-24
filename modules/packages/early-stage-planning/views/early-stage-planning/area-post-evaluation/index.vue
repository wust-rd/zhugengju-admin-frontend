<!--
  市住更局 —— 片区更新后评估（列表页，模块唯一路由）

  流程（页内三步切换，不新增路由，做法同 review-management 的整页表单）：
    列表 → 新增评估片区（第一步：选已批准片区 + 评估年份）→ 评估页（成效指标对比 / 满意度分析）。
  列表初始为空（没有评估记录就是空表），记录只能由「新增评估片区」产生。

  列表列：评估年份 / 片区名称（可点，进只读评估页）/ 行政区 / 片区批次 / 片区规模（公顷）/
         功能定位 / 填报单位 / 操作（查看 · 编辑 · 删除 · 生成评估报告——导出功能暂不做，先占位）。

  接口（详见 /a/esp/postEval/*）：
    GET  page      列表分页（评估年份/片区名称/行政区/批次）
    GET  areaPage  新增第一步的已批准片区分页（带该年度是否已评估标记）
    GET  detail    评估明细（含清单全量行、结论、更新后效果图）
    GET  catalog   清单（新增时构造空白表格）
    POST save      暂存 / 保存（同一接口）
    POST delete    删除（物理删除主表与明细）

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/area-post-evaluation/index
   - 组件位置：/early-stage-planning/area-post-evaluation/index（与链接地址一致）
   - 权限标识：esp:postEval:view（查询）/ esp:postEval:edit（保存、删除）
  ⚠️ 组件位置必须与实际文件名精确一致——路由 dynamicImport 按「去扩展名后全等」匹配。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 列表 -->
    <div v-show="view === 'list'" class="flex flex-col gap-16px">
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>评估片区列表</span>
        </template>
        <template #toolbar>
          <a-button type="primary" @click="handleCreate">新增评估片区</a-button>
        </template>
        <template #areaName="{ record }">
          <a @click="handleView(record)">{{ record.areaName }}</a>
        </template>
      </BasicTable>
    </div>

    <!-- 新增第一步：选片区 + 评估年份 -->
    <AreaPicker v-if="view === 'create'" @back="handleBack" @next="handlePicked" />

    <!-- 评估页：成效指标对比 / 满意度分析 -->
    <EvaluatePage
      v-else-if="view === 'evaluate'"
      :record="current"
      :readonly="readonly"
      @back="handleBack"
      @saved="handleSaved"
    />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningAreaPostEvaluationIndex">
  import { ref } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { postEvalDelete, postEvalPage } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import AreaPicker from './area-picker.vue';
  import EvaluatePage from './evaluate.vue';
  import { BATCH_OPTIONS, buildYearOptions, type PostEvalTarget } from './shared';
  // 行政区下拉复用方案填报的字典接口（/a/esp/schemeFill/dictOptions，权限只要求登录）
  import { useSchemeDict } from '../scheme-declaration-review/shared/use-scheme-dict';

  const { showMessage } = useMessage();
  /** 行政区选项：后端 DISTRICT_BOUNDARYS.name 去重（接口失败回退内置清单） */
  const { districtOptions } = useSchemeDict();

  /** 页内视图：列表 / 新增（选片区）/ 评估页 */
  const view = ref<'list' | 'create' | 'evaluate'>('list');
  /** 查看模式（列表「查看」进入时只读） */
  const readonly = ref(false);
  /** 当前评估对象（编辑/查看带 id，新增只有片区 + 年份） */
  const current = ref<PostEvalTarget>({ aUid: '', areaName: '', evalYear: '' });

  const columns: BasicColumn[] = [
    { title: '评估年份', dataIndex: 'evalYear', width: 110, align: 'center' },
    { title: '片区名称', dataIndex: 'areaName', width: 160, align: 'center', slot: 'areaName' },
    { title: '行政区', dataIndex: 'dist', width: 110, align: 'center' },
    { title: '片区批次', dataIndex: 'batch', width: 110, align: 'center' },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 140, align: 'center' },
    { title: '功能定位', dataIndex: 'funcTypeName', width: 120, align: 'center' },
    { title: '填报单位', dataIndex: 'reportOrg', width: 180, align: 'center' },
  ];

  /** 操作列：查看 / 编辑 / 删除（不可恢复，二次确认）/ 生成评估报告（占位） */
  const actionColumn: BasicColumn = {
    width: 250,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleView(record) },
      { label: '编辑', onClick: () => handleEdit(record) },
      {
        label: '删除',
        color: 'error',
        popConfirm: {
          title: '删除后评估记录与其指标/满意度明细一并清除且不可恢复，是否继续？',
          confirm: () => handleDelete(record),
        },
      },
      { label: '生成评估报告', onClick: () => handleReport() },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: postEvalPage,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    canResize: true,
    // 设计稿：共 X 条 / 10 条/页（不显示「跳至 X 页」）
    pagination: { pageSize: 10, showQuickJumper: false },
    formConfig: {
      // 四个筛选项与「查询/重置」按钮同排铺满一行：lg 5×4 + 4 = 24
      baseColProps: { xs: 24, sm: 12, md: 8, lg: 5 },
      actionColOptions: { xs: 24, sm: 12, md: 8, lg: 4 },
      labelWidth: 80,
      schemas: [
        {
          label: '评估年份',
          field: 'evalYear',
          component: 'Select',
          componentProps: { options: buildYearOptions(), allowClear: true, placeholder: '请选择' },
        },
        {
          label: '片区名称',
          field: 'areaName',
          component: 'Input',
          componentProps: { placeholder: '请输入' },
        },
        {
          label: '行政区',
          field: 'dist',
          component: 'Select',
          // 函数式 componentProps：跟随字典接口结果刷新（静态对象会取到初始兜底值）
          componentProps: () => ({ options: districtOptions.value, allowClear: true, placeholder: '请选择' }),
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: BATCH_OPTIONS, allowClear: true, placeholder: '请选择' },
        },
      ],
    },
  });

  /** 新增：进入选片区页 */
  function handleCreate() {
    readonly.value = false;
    current.value = { aUid: '', areaName: '', evalYear: '' };
    view.value = 'create';
  }

  /** 选好片区 + 年份：进入评估页（无 id，保存即新增） */
  function handlePicked(payload: { aUid: string; areaName: string; evalYear: string }) {
    current.value = { ...payload };
    readonly.value = false;
    view.value = 'evaluate';
  }

  /** 查看：只读评估页 */
  function handleView(record: Recordable) {
    openEvaluate(record, true);
  }

  /** 编辑：可写评估页 */
  function handleEdit(record: Recordable) {
    openEvaluate(record, false);
  }

  function openEvaluate(record: Recordable, isReadonly: boolean) {
    current.value = {
      id: record.id,
      aUid: record.aUid,
      areaName: record.areaName,
      evalYear: record.evalYear,
    };
    readonly.value = isReadonly;
    view.value = 'evaluate';
  }

  /** 暂存留在评估页、保存回列表，两者都刷新列表；新增首次落库后回填 id（再次暂存即更新而非新增） */
  function handleSaved(payload: { stay: boolean; id: string }) {
    if (!current.value.id && payload.id) {
      current.value = { ...current.value, id: payload.id };
    }
    reload();
    if (!payload.stay) {
      view.value = 'list';
    }
  }

  function handleBack() {
    view.value = 'list';
  }

  /** 删除（物理删除，不可恢复） */
  async function handleDelete(record: Recordable) {
    try {
      await postEvalDelete(record.id);
      showMessage('删除成功');
      reload();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '删除失败');
    }
  }

  /** 生成评估报告：导出功能暂不做，先占位 */
  function handleReport() {
    showMessage('生成评估报告：待接入（导出功能暂不做）');
  }
</script>
