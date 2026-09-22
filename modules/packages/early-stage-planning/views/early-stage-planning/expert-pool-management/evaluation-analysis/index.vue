<!--
  市住更局 —— 考评分析（三师库管理）

  三师库管理 · 子模块三：对入库专家打分考评。布局对齐原型：
  - 顶部三张排名卡（活跃度/专业覆盖度/评审效率 Top5，渐变条）——子组件 rank-card；
  - 下方专家列表（仅展示已入选三师的专家；姓名/性别/年龄/联系电话/身份证号/评价次数/三维度得分/操作）；
  - 操作列「评价」弹出打分 Modal（Rate 半星步进，一颗星 2 分、半颗星 1 分，三维度各 10 分），
    提交后实时刷新列表与排名；「历史记录」弹历史评价 Modal——子组件 history-modal。

  已接后端（modules/esp）：排名（4.1）/列表（4.2）/打分（4.4）/历史（4.3）/删除（4.5）走接口层
  @jeesite/early-stage-planning/api/early-stage-planning/expert-pool。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/evaluation-analysis/index
   - 组件位置：/early-stage-planning/expert-pool-management/evaluation-analysis/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三张排名卡：活跃度 / 专业覆盖度 / 评审效率 Top5 -->
    <div class="grid grid-cols-3 gap-16px">
      <RankCard
        v-for="card in rankCards"
        :key="card.title"
        :title="card.title"
        :accent="card.accent"
        :bar-gradient="card.barGradient"
        :rows="card.rows"
      />
    </div>

    <!-- 专家列表 -->
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>专家列表</span>
      </template>
      <!-- 每列独立具名插槽（列定义 slot: 'xxx'）：不能用 #bodyCell，会覆盖操作列渲染 -->
      <template #selected="{ record }">
        <Tag :color="record.selected ? 'success' : 'default'">{{ record.selected ? '是' : '否' }}</Tag>
      </template>
    </BasicTable>

    <!-- 打分 Modal：三维度星形评分（半星步进）+ 实时显示得分（Modal 显式导入——全局仅注册了 Input/Button） -->
    <Modal
      v-model:open="rateModal.open"
      :title="`评价专家 - ${rateModal.expert?.name ?? ''}`"
      :confirm-loading="rateModal.loading"
      ok-text="确定"
      centered
      cancel-text="取消"
      @ok="submitRate"
    >
      <div class="flex flex-col gap-18px py-16px">
        <div v-for="dim in RATE_DIMENSIONS" :key="dim.key" class="flex items-center gap-12px">
          <span class="shrink-0 text-right text-14px text-gray-700 w-200px">{{ dim.label }}（10分）:</span>
          <Rate v-model:value="rateModal[dim.key]" allow-half />
          <span class="text-14px text-gray-500">{{ (rateModal[dim.key] * 2).toFixed(1) }} 分</span>
        </div>

        <div class="flex items-start gap-12px">
          <span class="w-110px shrink-0 text-right text-14px leading-32px text-gray-700">评价说明:</span>
          <Input.TextArea v-model:value="rateModal.comment" :rows="4" placeholder="请输入内容" class="flex-1" />
        </div>
      </div>
    </Modal>

    <!-- 历史评价 Modal（内嵌展示，不单独开路由） -->
    <HistoryModal
      v-model:open="historyModal.open"
      :expert-id="historyModal.expertId"
      :expert-name="historyModal.expertName"
      @deleted="refreshTable"
    />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolEvaluationAnalysisIndex">
  import { computed, onActivated, reactive, ref } from 'vue';
  import { Input, Modal, Rate, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    espDictAreas,
    espEvaluationList,
    espEvaluationRank,
    espEvaluationSave,
    type EspEvalExpertRow,
    type EspRankRow,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import RankCard from './rank-card.vue';
  import HistoryModal from './history-modal.vue';

  const { showMessage } = useMessage();

  const areaOptions = ref<{ label: string; value: string }[]>([]);
  espDictAreas().then((areas) => {
    areaOptions.value = (areas ?? []).map((a) => ({
      label: a.areaName || a.key,
      value: a.areaCode || a.value,
    }));
  });

  /** 打分维度定义（Modal 行 + 得分换算共用） */
  const RATE_DIMENSIONS = [
    { key: 'activity', label: '活跃度' },
    { key: 'coverage', label: '专业覆盖度' },
    { key: 'efficiency', label: '评审效率' },
  ] as const;
  type RateDimensionKey = (typeof RATE_DIMENSIONS)[number]['key'];

  /** 专家列表（接口 4.2：仅已入选专家，服务端聚合三维度平均分与评价次数）
      注意：BasicTable 的 dataSource 取的是 setup 时快照，接口返回后必须 setTableData 同步（见下方初始加载） */
  const expertRows = ref<EspEvalExpertRow[]>([]);
  const lastSearch = reactive({ name: undefined as string | undefined, areaUid: undefined as string | undefined });
  async function reloadExperts(name?: string, areaUid?: string) {
    lastSearch.name = name;
    lastSearch.areaUid = areaUid;
    expertRows.value = await espEvaluationList(name, areaUid);
  }

  /** 三张排名卡（接口 4.1：三维度 Top5，无评价专家不参与） */
  const rank = ref<{ activity: EspRankRow[]; coverage: EspRankRow[]; efficiency: EspRankRow[] }>({
    activity: [],
    coverage: [],
    efficiency: [],
  });
  async function reloadRank() {
    rank.value = await espEvaluationRank();
  }
  reloadRank();

  const rankCards = computed(() => [
    {
      title: '活跃度排名',
      accent: '#3A8EF6',
      barGradient: 'linear-gradient(90deg, #5AB2FF 0%, #3A8EF6 100%)',
      rows: rank.value.activity.map((r) => ({ name: r.name, score: r.avgScore })),
    },
    {
      title: '专业覆盖度排名',
      accent: '#2AB69B',
      barGradient: 'linear-gradient(90deg, #4ED3B8 0%, #2AB69B 100%)',
      rows: rank.value.coverage.map((r) => ({ name: r.name, score: r.avgScore })),
    },
    {
      title: '评审效率排名',
      accent: '#F7A832',
      barGradient: 'linear-gradient(90deg, #FFC163 0%, #F7A832 100%)',
      rows: rank.value.efficiency.map((r) => ({ name: r.name, score: r.avgScore })),
    },
  ]);

  /** 表格列（对齐原型：姓名/性别/年龄/电话/身份证/评价次数/三维度得分/操作） */
  const columns: BasicColumn[] = [
    { title: '专家姓名', dataIndex: 'name', width: 100 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '身份证号', dataIndex: 'idCard', width: 170 },
    { title: '所属片区', dataIndex: 'areaNames', width: 180, ellipsis: true },
    { title: '评价次数', dataIndex: 'evalCount', width: 90, align: 'center' },
    { title: '活跃度得分（10）', dataIndex: 'avgActivity', width: 140, align: 'center' },
    { title: '专业覆盖度得分（10）', dataIndex: 'avgCoverage', width: 160, align: 'center' },
    { title: '评审效率得分（10）', dataIndex: 'avgEfficiency', width: 140, align: 'center' },
  ];

  /** 操作列：评价（弹打分 Modal）/ 历史记录（弹历史 Modal） */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      { label: '评价', onClick: () => openRateModal(record as unknown as EspEvalExpertRow) },
      {
        label: '历史记录',
        onClick: () => openHistory(record as unknown as EspEvalExpertRow),
      },
    ],
  };

  const [registerTable, { setTableData }] = useTable({
    dataSource: expertRows.value,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 6, lg: 5 },
      labelWidth: 100,
      schemas: [
        { label: '专家姓名', field: 'name', component: 'Input', componentProps: { placeholder: '请输入' } },
        {
          label: '所属片区',
          field: 'areaUid',
          component: 'Select',
          componentProps: () => ({
            options: areaOptions.value,
            allowClear: true,
            showSearch: true,
            optionFilterProp: 'label',
            placeholder: '请选择',
          }),
        },
      ],
    },
    // 接口 4.2 支持姓名模糊、所属片区精确（整包返回，前端仍做本地分页展示）
    handleSearchInfoFn: (params: Recordable) => {
      const name = String(params.name ?? '').trim() || undefined;
      const areaUid = String(params.areaUid ?? '').trim() || undefined;
      reloadExperts(name, areaUid).then(() => setTableData(expertRows.value));
      return params;
    },
  });

  // 初始加载：dataSource 快照为空数组，接口返回后必须 setTableData 同步进表格
  reloadExperts().then(() => setTableData(expertRows.value));

  /** 打分 Modal 状态（三维度星级 0.5 步进 + 评价说明） */
  const rateModal = reactive({
    open: false,
    loading: false,
    activity: 0,
    coverage: 0,
    efficiency: 0,
    comment: '',
    expert: null as EspEvalExpertRow | null,
  });

  /** 打开打分 Modal（星级与说明每次重置） */
  function openRateModal(expert: EspEvalExpertRow) {
    rateModal.expert = expert;
    rateModal.activity = 0;
    rateModal.coverage = 0;
    rateModal.efficiency = 0;
    rateModal.comment = '';
    rateModal.open = true;
  }

  /** 提交评价（接口 4.4：评价人/评价单位由后端取当前登录用户快照，前端不传） */
  async function submitRate() {
    const expert = rateModal.expert;
    if (!expert) return;
    if (!rateModal.activity || !rateModal.coverage || !rateModal.efficiency) {
      showMessage('请为三个维度都打分');
      return;
    }
    rateModal.loading = true;
    try {
      await espEvaluationSave({
        expertId: expert.id,
        activityStars: rateModal.activity,
        coverageStars: rateModal.coverage,
        efficiencyStars: rateModal.efficiency,
        comment: rateModal.comment,
      });
      rateModal.open = false;
      // 评价记录变化后刷新列表与排名：让「评价次数 / 三维度平均分 / Top5」即时联动
      refreshTable();
      showMessage('评价成功');
    } finally {
      rateModal.loading = false;
    }
  }

  /** 重新拉取列表与排名（评价/删除后调用） */
  function refreshTable() {
    reloadExperts(lastSearch.name, lastSearch.areaUid).then(() => setTableData(expertRows.value));
    reloadRank();
  }

  /** 历史评价 Modal 状态（组件内部自行拉 4.3 记录、处理 4.5 删除） */
  const historyModal = reactive({
    open: false,
    expertId: '',
    expertName: '',
  });

  /** 打开历史评价 Modal */
  function openHistory(expert: EspEvalExpertRow) {
    historyModal.expertId = expert.id;
    historyModal.expertName = expert.name;
    historyModal.open = true;
  }

  // keep-alive 页签再次进入时同步（其它页可能删除过记录/确认过选用）
  onActivated(refreshTable);
</script>
