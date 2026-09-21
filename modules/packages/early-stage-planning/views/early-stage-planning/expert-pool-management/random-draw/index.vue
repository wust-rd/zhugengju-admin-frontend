<!--
  市住更局 —— 随机分配三师（三师库管理）

  为「片区 × 专业领域 × 三师角色」随机分配专家：
  - 上方面板：片区下拉（可搜索，数据来自 ESP_MAP_AREA）+ 专业领域多选（全选/清空一键切换）+ 三师角色复选（默认不勾）+ 回避规则 + 重置/抽取；
  - 选择片区后回显该片区最近一次抽取的专家；再次点击抽取若已有专家，先确认「继续抽取会覆盖原有专家」；
  - 点击抽取：按勾选的三师数量生成对应数量的专家卡片（各卡片带责任角色标签）；
  - 卡片操作：单卡「随机更换」换同角色专家、「指定人员」弹出 Modal 按姓名/领域/单位/电话模糊搜索并单选指定；
  - 结果右侧「确认选用」生成一条分配记录（整批重抽直接点「抽取」）；
  - 下方「分配记录」列表展示每条记录（时间/抽取片区/抽取领域/抽取人数/三师/详情）。

  已接后端（modules/esp）：字典（1.1/1.2）、抽取（3.1）、单角色更换（3.2）、确认选用（3.3）、
  分配记录（3.4/3.5）、片区最近记录（3.6）走接口层 @jeesite/early-stage-planning/api/early-stage-planning/expert-pool。

  UI 子组件（同目录）：expert-card（结果单卡）/ assign-modal（指定人员）/
  record-detail-modal（分配详情 Tab）/ expert-detail-modal（专家详情）；角色常量见 shared.ts。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/random-draw/index
   - 组件位置：/early-stage-planning/expert-pool-management/random-draw/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px p-16px">
    <!-- 抽取器：片区下拉搜索 + 专业领域多选 + 三师复选 + 回避规则 + 按钮 -->
    <div class="rd-10px p-16px h-88px" style="background-color: rgba(15, 23, 42, 0.02)">
      <div
        class="flex rd-12px flex-wrap items-center gap-x-24px gap-y-12px size-full bg-white p-8px"
        style="box-shadow: 0 16px 36px -20px rgba(76, 132, 192, 0.12)"
      >
        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4 px-12px">
          <span class="w-52px shrink-0 text-right text-14px text-gray-500">片区</span>
          <Select
            v-model:value="query.district"
            :options="AREA_OPTIONS"
            placeholder="请选择片区"
            class="w-260px"
            :bordered="false"
            allowClear
            showSearch
            optionFilterProp="label"
            :filter-option="filterAreaOption"
            @change="onDistrictChange"
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px b-1 b-solid b-black/4 rd-8px px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">专业领域</span>
          <!-- 一键全选 / 全不选 -->
          <a-button type="link" size="small" class="h-24px px-0px text-13px" @click="toggleAllFields(true)"
            >全选</a-button
          >
          <a-button
            type="link"
            size="small"
            class="h-24px px-0px text-13px"
            :disabled="query.fields.length === 0"
            @click="toggleAllFields(false)"
            >清空</a-button
          >
          <Select
            v-model:value="query.fields"
            :options="FIELD_OPTIONS"
            placeholder="请选择（多选）"
            mode="multiple"
            class="w-220px rd-8px"
            allowClear
            showSearch
            :bordered="false"
            :max-tag-count="'responsive'"
          />
        </div>

        <div class="flex items-center gap-12px">
          <span class="text-14px text-gray-500">三师</span>
          <Checkbox v-for="opt in TYPE_OPTIONS" :key="opt.value" v-model:checked="typeChecked[opt.value]">
            {{ opt.label }}
          </Checkbox>
        </div>

        <div class="flex items-center gap-8px">
          <span class="text-14px text-gray-700">回避规则</span>
          <Checkbox v-model:checked="query.avoidDrawn">排除已入三师专家</Checkbox>
        </div>

        <div class="ml-auto flex items-center gap-12px">
          <a-button @click="handleReset" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 重置
            </span>
          </a-button>
          <a-button type="primary" :loading="drawing" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px"> <span class="i-ri:search-2-line"></span> 抽取 </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 抽取结果：按勾选三师数量生成卡片 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:team-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">抽取结果</span>

        <div class="ml-auto flex items-center gap-12px">
          <a-button type="primary" :disabled="results.length === 0" @click="handleConfirm" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:check-outlined"></span> 确认选用
            </span>
          </a-button>
        </div>
      </div>

      <div class="mt-16px flex h-300px items-stretch gap-16px overflow-x-auto bg-[#519bd40a] rd-8px p-12px">
        <template v-if="results.length > 0">
          <ExpertCard
            v-for="card in results"
            :key="card.role"
            :role="card.role"
            :expert="card.expert"
            @replace="replaceOne(card)"
            @assign="openAssign(card)"
            @detail="openExpertModal"
          />
        </template>

        <div v-else class="flex w-full items-center justify-center text-14px text-gray-400">
          {{ query.district ? '该片区暂无抽取记录，请设置抽取条件后点击「抽取」' : '请选择片区并设置抽取条件后点击「抽取」' }}
        </div>
      </div>
    </div>

    <!-- 分配记录 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:file-text-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">分配记录</span>
      </div>

      <BasicTable @register="registerTable" :showIndexColumn="false" class="px-16px pb-16px">
        <template #operation="{ record }">
          <a-button type="link" @click="showRecordDetail(record)">详情</a-button>
        </template>
      </BasicTable>
    </div>

    <!-- 指定人员 Modal -->
    <AssignModal
      v-model:open="assignModal.open"
      :role="assignModal.role"
      :exclude-ids="assignExcludeIds"
      :field-options="FIELD_OPTIONS"
      @confirm="confirmAssign"
    />

    <!-- 分配详情 Modal（摘要条 + 三师 Tab 全景卡） -->
    <RecordDetailModal v-model:open="detailModal.open" :record-id="detailModal.recordId" />

    <!-- 专家详情 Modal（卡片履历摘要「更多信息」） -->
    <ExpertDetailModal v-model:open="expertModal.open" :expert="expertModal.expert" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawIndex">
  import { computed, reactive, ref } from 'vue';
  import { message } from 'antdv-next';
  import { Checkbox, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    espDictAreas,
    espDictOptions,
    espDrawConfirm,
    espDrawDraw,
    espDrawLatest,
    espDrawRecords,
    espDrawReplace,
    type EspExpert,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import { TYPE_OPTIONS, type RoleKey } from './shared';
  import ExpertCard from './expert-card.vue';
  import AssignModal from './assign-modal.vue';
  import RecordDetailModal from './record-detail-modal.vue';
  import ExpertDetailModal from './expert-detail-modal.vue';

  const { showMessage, createConfirm } = useMessage();

  // ---- 抽取器条件 ----

  const EXPERT_FIELD_FALLBACK = ['城乡规划学', '建筑学', '市政工程', '交通工程'];

  /** 专业领域下拉（接口 1.1 字典；加载前静态兜底） */
  const FIELD_OPTIONS = ref(EXPERT_FIELD_FALLBACK.map((f) => ({ label: f, value: f })));
  /** 片区下拉（接口 1.2：label=area_name，value=a_uid） */
  const AREA_OPTIONS = ref<{ label: string; value: string }[]>([]);
  espDictOptions().then((dict) => {
    FIELD_OPTIONS.value = dict.fields.map((f) => ({ label: f, value: f }));
  });
  espDictAreas().then((areas) => {
    AREA_OPTIONS.value = (areas ?? []).map((a) => ({
      label: a.areaName || a.key,
      value: a.areaCode || a.value,
    }));
  });

  /** 片区下拉按名称或唯一号过滤 */
  function filterAreaOption(input: string, option: { label?: string; value?: string }) {
    const q = (input ?? '').trim().toLowerCase();
    if (!q) return true;
    return String(option?.label ?? '')
      .toLowerCase()
      .includes(q)
      || String(option?.value ?? '')
        .toLowerCase()
        .includes(q);
  }

  /** 三师角色勾选状态（默认全部不勾选） */
  const typeChecked = reactive<Record<RoleKey, boolean>>({ planner: false, architect: false, assessor: false });

  /** 抽取条件（片区下拉取 a_uid、专业领域多选） */
  const query = reactive({
    district: undefined as string | undefined,
    fields: [] as string[],
    avoidDrawn: true,
  });

  /** 专业领域一键全选 / 全不选 */
  function toggleAllFields(selectAll: boolean) {
    query.fields = selectAll ? FIELD_OPTIONS.value.map((o) => o.value) : [];
  }

  /** 勾选的三师角色 key 列表 */
  function checkedTypes(): RoleKey[] {
    return TYPE_OPTIONS.filter((o) => typeChecked[o.value]).map((o) => o.value);
  }

  // ---- 抽取结果 ----

  /** 抽取结果：每个勾选的角色一个卡片（接口 3.1 返回三角色专家，按勾选角色过滤展示） */
  const results = ref<{ role: RoleKey; expert: EspExpert | null }[]>([]);
  /** 抽取中 loading */
  const drawing = ref(false);

  /** 选择片区后回显该片区最近一次已抽取专家 */
  async function onDistrictChange(aUid: string | undefined) {
    results.value = [];
    if (!aUid) return;
    try {
      const latest = await espDrawLatest(aUid);
      if (!latest) return;
      typeChecked.planner = false;
      typeChecked.architect = false;
      typeChecked.assessor = false;
      const roles: RoleKey[] = ['planner', 'architect', 'assessor'];
      const cards: { role: RoleKey; expert: EspExpert | null }[] = [];
      for (const role of roles) {
        if (latest[role]) {
          typeChecked[role] = true;
          cards.push({ role, expert: latest[role] });
        }
      }
      results.value = cards;
      if (latest.drawFields) {
        query.fields = latest.drawFields
          .split('、')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch (e: any) {
      message.warning(e?.message || '查询已有抽取记录失败');
    }
  }

  /** 抽取（接口 3.1：服务端按 规划师→建筑师→评估师 各抽一名，同批次不重复；整批重抽也走这里） */
  async function handleDraw() {
    const roles = checkedTypes();
    if (roles.length === 0) {
      message.warning('请至少勾选一种三师类型');
      return;
    }
    if (!query.district) {
      message.warning('请先选择片区');
      return;
    }
    const hasExperts = results.value.some((r) => r.expert);
    if (hasExperts) {
      createConfirm({
        title: '提示',
        content: '继续抽取会覆盖原有专家',
        iconType: 'warning',
        okText: '确认',
        cancelText: '取消',
        onOk: () => doDraw(roles),
      });
      return;
    }
    await doDraw(roles);
  }

  /** 执行随机抽取并替换当前展示的专家 */
  async function doDraw(roles: RoleKey[]) {
    drawing.value = true;
    try {
      const data = await espDrawDraw({
        districtCode: query.district as string,
        fields: query.fields,
        roles,
        avoidDrawn: query.avoidDrawn,
      });
      results.value = roles.map((role) => ({ role, expert: data[role] ?? null }));
    } finally {
      drawing.value = false;
    }
  }

  /** 单卡随机更换（接口 3.2：换同角色另一位专家，其余卡片不动；排除当前批次已抽中的） */
  async function replaceOne(card: { role: RoleKey; expert: EspExpert | null }) {
    const excludeIds = results.value.map((r) => r.expert?.id).filter((v): v is string => !!v);
    try {
      const { expert } = await espDrawReplace({
        fields: query.fields,
        role: card.role,
        avoidDrawn: query.avoidDrawn,
        excludeIds,
      });
      results.value = results.value.map((r) => (r.role === card.role ? { ...r, expert } : r));
    } catch (e: any) {
      message.warning(e?.message || '没有更多符合条件的专家可供更换');
    }
  }

  // ---- 指定人员 ----

  /** 指定人员 Modal 状态 */
  const assignModal = reactive({
    open: false,
    role: 'planner' as RoleKey,
  });

  /** 排除已在其它卡片上的专家（一人只当一师；随卡片变化响应式计算） */
  const assignExcludeIds = computed(() =>
    results.value
      .filter((r) => r.role !== assignModal.role)
      .map((r) => r.expert?.id)
      .filter((v): v is string => !!v),
  );

  /** 打开指定人员 Modal（记录当前卡片角色） */
  function openAssign(card: { role: RoleKey; expert: EspExpert | null }) {
    assignModal.role = card.role;
    assignModal.open = true;
  }

  /** 指定人员确认：把选中的专家替换到该角色卡片 */
  function confirmAssign(expert: EspExpert) {
    results.value = results.value.map((r) => (r.role === assignModal.role ? { ...r, expert } : r));
  }

  // ---- 确认选用 ----

  /** 确认选用（接口 3.3：落分配记录 + 专家置已入选） */
  async function handleConfirm() {
    if (results.value.length === 0) {
      message.warning('请先抽取');
      return;
    }
    if (!query.district) {
      message.warning('请先选择片区');
      return;
    }
    const assigned = results.value.filter((r) => r.expert);
    if (assigned.length === 0) {
      message.warning('没有已分配专家');
      return;
    }
    const idOf = (role: RoleKey) => results.value.find((r) => r.role === role)?.expert?.id ?? null;
    const result = await espDrawConfirm({
      districtCode: query.district,
      fields: query.fields,
      plannerId: idOf('planner'),
      architectId: idOf('architect'),
      assessorId: idOf('assessor'),
      assignFlag: false,
    });
    showMessage(result?.overwrite ? '已覆盖该片区原有专家并生成分配记录' : '已生成一条分配记录');
    reload();
    await onDistrictChange(query.district);
  }

  // ---- 分配记录表 ----

  /** 记录列表列（接口 3.4 字段：drawDate/districtName/drawFields/drawCount/xxxName） */
  const recordColumns: BasicColumn[] = [
    { title: '时间', dataIndex: 'drawDate', width: 110 },
    { title: '抽取片区', dataIndex: 'districtName', width: 140 },
    { title: '抽取领域', dataIndex: 'drawFields', width: 320, ellipsis: true },
    { title: '抽取人数', dataIndex: 'drawCount', width: 90, align: 'center' },
    { title: '责任规划师', dataIndex: 'plannerName', width: 110 },
    { title: '责任建筑师', dataIndex: 'architectName', width: 110 },
    { title: '责任评估师', dataIndex: 'assessorName', width: 110 },
    { title: '操作', dataIndex: 'operation', width: 90, slot: 'operation' },
  ];

  /** 分配记录（服务端分页，接口 3.4；确认选用后 reload） */
  const [registerTable, { reload }] = useTable({
    api: espDrawRecords,
    columns: recordColumns,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 10 },
    canResize: true,
  });

  // ---- 弹窗状态 ----

  /** 分配详情 Modal 状态（组件内部自行拉 3.5 详情） */
  const detailModal = reactive({ open: false, recordId: '' });

  /** 打开分配详情 Modal */
  function showRecordDetail(record: Recordable) {
    detailModal.recordId = String(record.id);
    detailModal.open = true;
  }

  /** 专家详情 Modal 状态（卡片履历摘要「更多信息」） */
  const expertModal = reactive({
    open: false,
    expert: null as EspExpert | null,
  });

  /** 打开专家详情 Modal */
  function openExpertModal(expert: EspExpert) {
    expertModal.expert = expert;
    expertModal.open = true;
  }

  /** 重置：所有配置都不填不选（片区空、领域空、三师全不勾、回避规则不勾）并清空结果 */
  function handleReset() {
    query.district = undefined;
    query.fields = [];
    query.avoidDrawn = false;
    typeChecked.planner = false;
    typeChecked.architect = false;
    typeChecked.assessor = false;
    results.value = [];
  }
</script>

<style>
  /* antdv Button 的内置 border-radius（默认 6px）优先级高于 UnoCSS 的 .rd-8px，
     用更高特异性 + !important 兜底，确保按钮圆角按 rd-8px（8px）生效。 */
  .ant-btn.rd-8px {
    border-radius: 8px !important;
  }
</style>
