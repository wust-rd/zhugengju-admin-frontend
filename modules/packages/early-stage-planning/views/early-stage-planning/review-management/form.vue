<!--
  市住更局 —— 评审管理 · 新增/编辑/查看 评审项目

  由列表页 list.vue 组件切换打开（不新增路由）。
  区块：项目基本信息 / 片区三师 / 评审材料；
  查看评审中/已完成项目时追加：专家个人意见 / 项目评估 / 综合评估
  （组员只填项目评估；组长看全部并可提交综合评估，综合评估通过/不通过均→已完成）。
  片区名称下拉取 ESP_MAP_AREA；选片区后调 areaFill：回填行政区 + 抽取记录里的三师
  （专家1 规划师 / 专家2 建筑师 / 专家3 评估师，字段姓名、职称、单位只读自动填充）。
  暂存宽校验（项目名称）；提交校验红星必填 + 至少一名三师 + 组长 + 至少一份材料。
-->
<template>
  <div class="flex flex-col gap-16px">
    <div class="sticky z-20 flex items-center gap-12px bg-white rd-8px px-16px py-12px shadow-sm" style="top: 0">
      <span class="text-16px font-500">{{ title }}</span>
    </div>

    <div v-if="ready" class="flex flex-col gap-16px">
      <!-- 项目基本信息 -->
      <section class="bg-white rd-8px px-24px py-20px shadow-sm">
        <div class="mb-16px flex items-center gap-8px">
          <span class="h-16px w-4px rd-2px bg-[#1677ff]"></span>
          <span class="text-16px font-500 text-gray-800">项目基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-x-32px gap-y-16px">
          <div class="flex flex-col gap-6px">
            <span class="text-13px text-gray-600"><span class="text-red-500">*</span> 项目名称</span>
            <Input v-model:value="form.projectName" placeholder="请输入" :maxlength="100" :disabled="isView" />
          </div>
          <div class="flex flex-col gap-6px">
            <span class="text-13px text-gray-600"><span class="text-red-500">*</span> 行政区</span>
            <Select
              v-model:value="form.dist"
              :options="distOptions"
              placeholder="请选择"
              allowClear
              showSearch
              optionFilterProp="label"
              :disabled="isView"
            />
          </div>
          <div class="flex flex-col gap-6px">
            <span class="text-13px text-gray-600"><span class="text-red-500">*</span> 片区名称</span>
            <Select
              v-model:value="form.aUid"
              :options="areaOptions"
              placeholder="请选择"
              allowClear
              showSearch
              optionFilterProp="label"
              :disabled="isView"
              :filter-option="filterOption"
              @change="onAreaChange"
            />
          </div>
          <div class="flex flex-col gap-6px">
            <span class="text-13px text-gray-600"><span class="text-red-500">*</span> 统筹主体</span>
            <Input v-model:value="form.coordOrg" placeholder="请输入" :maxlength="100" :disabled="isView" />
          </div>
          <div class="flex flex-col gap-6px">
            <span class="text-13px text-gray-600"><span class="text-red-500">*</span> 责任部门</span>
            <Input v-model:value="form.respDept" placeholder="请输入" :maxlength="100" :disabled="isView" />
          </div>
        </div>
      </section>

      <!-- 片区三师 -->
      <section class="bg-white rd-8px px-24px py-20px shadow-sm">
        <div class="mb-16px flex items-center gap-8px">
          <span class="h-16px w-4px rd-2px bg-[#1677ff]"></span>
          <span class="text-16px font-500 text-gray-800"><span class="text-red-500">*</span> 片区三师</span>
        </div>
        <div class="flex flex-col gap-12px">
          <div v-for="(row, index) in expertRows" :key="row.role" class="flex items-center gap-12px">
            <span class="w-56px shrink-0 text-14px text-gray-600">专家{{ index + 1 }}：</span>
            <Input :value="row.name" placeholder="自动填充" disabled class="flex-1" />
            <Input :value="row.title" placeholder="自动填充" disabled class="flex-1" />
            <Input :value="row.org" placeholder="自动填充" disabled class="flex-1" />
          </div>
          <div class="flex items-center gap-12px">
            <span class="w-56px shrink-0 text-14px text-gray-600">选择组长：</span>
            <Select
              v-model:value="form.leaderId"
              :options="leaderOptions"
              placeholder="根据上面的专家来选"
              allowClear
              class="w-320px"
              :disabled="isView"
            />
          </div>
        </div>
      </section>

      <!-- 评审材料 -->
      <section class="bg-white rd-8px px-24px py-20px shadow-sm b-1 b-solid b-[#1677ff]/30">
        <div class="mb-16px flex items-center gap-8px">
          <span class="h-16px w-4px rd-2px bg-[#1677ff]"></span>
          <span class="text-16px font-500 text-gray-800"><span class="text-red-500">*</span> 评审材料</span>
        </div>
        <div class="flex flex-col gap-8px">
          <div v-for="(slot, index) in slots" :key="slot.key" class="flex items-center gap-8px">
            <Upload
              class="min-w-0 flex-1"
              :show-upload-list="false"
              accept=".pdf,.doc,.docx"
              :disabled="isView || slot.uploading"
              :before-upload="(file) => beforeUploadSlot(index, file)"
            >
              <div
                class="flex h-40px w-full items-center justify-center rd-6px bg-[#F5F7FA] px-12px text-13px"
                :class="isView ? 'cursor-default' : 'cursor-pointer'"
              >
                <span v-if="slot.uploading" class="text-gray-400">上传中…</span>
                <a
                  v-else-if="slot.file?.url"
                  class="truncate text-[#1677ff]"
                  :href="slot.file.url"
                  target="_blank"
                  rel="noopener"
                  @click.stop
                >
                  {{ slot.file.name }}
                </a>
                <span v-else class="inline-flex items-center gap-6px text-gray-400">
                  <span class="i-ant-design:cloud-upload-outlined text-16px"></span>
                  {{ isView ? '暂无附件' : '点击上传' }}
                </span>
              </div>
            </Upload>
            <span v-if="!isView && index === slots.length - 1" class="cursor-pointer text-gray-400 hover:text-[#1677ff]" @click="addSlot">
              <span class="i-ant-design:plus-circle-outlined text-18px"></span>
            </span>
            <span
              v-if="!isView"
              class="cursor-pointer text-gray-400 hover:text-red-500"
              @click="removeSlot(index)"
            >
              <span class="i-ant-design:minus-circle-outlined text-18px"></span>
            </span>
          </div>
        </div>
        <div class="mt-8px text-12px text-gray-400">（支持 PDF、doc/docx格式）</div>
      </section>

      <ReviewPanel
        v-if="showReviewPanel"
        ref="reviewPanelRef"
        :role="reviewRole"
        :member-opinions="memberOpinions"
        :my-opinion="myOpinion"
        :summary="summaryOpinion"
        :disabled="reviewDisabled"
      />

      <div class="sticky bottom-0 z-20 flex justify-end gap-12px bg-white rd-8px px-16px py-12px shadow-sm">
        <a-button @click="emit('back')">{{ footerCancelText }}</a-button>
        <a-button v-if="!isView" :loading="saving" @click="handleSave('draft')">暂存</a-button>
        <Popconfirm
          v-if="!isView"
          title="提交后项目进入评审中，不可再编辑，是否确认提交？"
          ok-text="确认提交"
          cancel-text="取消"
          @confirm="handleSave('submit')"
        >
          <a-button type="primary" :loading="saving">提交</a-button>
        </Popconfirm>
        <Popconfirm
          v-if="canSubmitReview"
          :title="reviewConfirmTitle"
          ok-text="确认提交"
          cancel-text="取消"
          @confirm="handleReviewSubmit"
        >
          <a-button type="primary" :loading="saving">提交</a-button>
        </Popconfirm>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningReviewManagementForm">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Input, Popconfirm, Select, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { espDictAreas } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import { espFileUpload, type EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import {
    reviewProjectAreaFill,
    reviewProjectForm,
    reviewProjectOpinion,
    reviewProjectSave,
    type EspReviewExpertSnap,
    type EspReviewOpinion,
    type EspReviewOpinionItem,
    type EspReviewProject,
    type EspReviewRole,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/review-management';
  import ReviewPanel from './review-panel.vue';

  const props = defineProps<{ record?: Recordable }>();
  const emit = defineEmits<{ success: []; back: [] }>();
  const { showMessage } = useMessage();

  const isView = computed(() => !!props.record?.isView);
  const isNew = computed(() => !!props.record?.isNewRecord || !props.record?.id);
  const title = computed(() => (isView.value ? '查看评审项目' : isNew.value ? '新增评审项目' : '编辑评审项目'));

  const ready = ref(false);
  const saving = ref(false);
  const areaOptions = ref<{ label: string; value: string }[]>([]);
  const distOptions = ref<{ label: string; value: string }[]>([]);

  type ExpertRole = 'planner' | 'architect' | 'assessor';
  const form = reactive({
    id: '',
    projectName: '',
    aUid: undefined as string | undefined,
    dist: undefined as string | undefined,
    coordOrg: '',
    respDept: '',
    plannerId: '',
    plannerName: '',
    plannerTitle: '',
    plannerOrg: '',
    architectId: '',
    architectName: '',
    architectTitle: '',
    architectOrg: '',
    assessorId: '',
    assessorName: '',
    assessorTitle: '',
    assessorOrg: '',
    leaderId: undefined as string | undefined,
    status: 'draft' as EspReviewProject['status'],
  });

  const reviewPanelRef = ref<{
    buildPayload: () => { member?: EspReviewOpinionItem; summary?: EspReviewOpinionItem };
  } | null>(null);
  const reviewRole = ref<EspReviewRole>('viewer');
  const memberOpinions = ref<EspReviewOpinion[]>([]);
  const myOpinion = ref<EspReviewOpinion | null>(null);
  const summaryOpinion = ref<EspReviewOpinion | null>(null);

  const showReviewPanel = computed(
    () => isView.value && (form.status === 'reviewing' || form.status === 'completed'),
  );
  const reviewDisabled = computed(() => form.status === 'completed' || reviewRole.value === 'viewer');
  const canSubmitReview = computed(
    () => showReviewPanel.value && form.status === 'reviewing' && reviewRole.value !== 'viewer',
  );
  const footerCancelText = computed(() => (isView.value && !canSubmitReview.value ? '返回' : '取消'));
  const reviewConfirmTitle = computed(() =>
    reviewRole.value === 'leader'
      ? '提交综合评估将结束评审（通过/不通过均变为已完成）。若只填了项目评估则仅保存意见。是否确认提交？'
      : '是否确认提交项目评估？',
  );

  type MaterialSlot = { key: string; file?: EspSchemeFile; uploading?: boolean };
  const slots = ref<MaterialSlot[]>([{ key: 'slot-0' }]);

  const expertRows = computed(() => [
    { role: 'planner' as ExpertRole, name: form.plannerName, title: form.plannerTitle, org: form.plannerOrg },
    { role: 'architect' as ExpertRole, name: form.architectName, title: form.architectTitle, org: form.architectOrg },
    { role: 'assessor' as ExpertRole, name: form.assessorName, title: form.assessorTitle, org: form.assessorOrg },
  ]);

  const leaderOptions = computed(() => {
    const opts: { label: string; value: string }[] = [];
    const push = (id?: string, name?: string, role?: string) => {
      if (id && name) opts.push({ label: `${name}（${role}）`, value: id });
    };
    push(form.plannerId, form.plannerName, '责任规划师');
    push(form.architectId, form.architectName, '责任建筑师');
    push(form.assessorId, form.assessorName, '责任评估师');
    return opts;
  });

  function filterOption(input: string, option: Recordable) {
    return String(option?.label ?? '')
      .toLowerCase()
      .includes(String(input).toLowerCase());
  }

  function applyExpert(role: ExpertRole, snap: EspReviewExpertSnap | null | undefined) {
    const id = snap?.id || '';
    const name = snap?.name || '';
    const title = snap?.title || '';
    const org = snap?.org || '';
    if (role === 'planner') {
      form.plannerId = id;
      form.plannerName = name;
      form.plannerTitle = title;
      form.plannerOrg = org;
      return;
    }
    if (role === 'architect') {
      form.architectId = id;
      form.architectName = name;
      form.architectTitle = title;
      form.architectOrg = org;
      return;
    }
    form.assessorId = id;
    form.assessorName = name;
    form.assessorTitle = title;
    form.assessorOrg = org;
  }

  function clearExperts() {
    applyExpert('planner', null);
    applyExpert('architect', null);
    applyExpert('assessor', null);
    form.leaderId = undefined;
  }

  async function onAreaChange(aUid?: string) {
    if (!aUid) {
      clearExperts();
      return;
    }
    try {
      const fill = await reviewProjectAreaFill(aUid);
      form.dist = fill.dist || form.dist;
      if (fill.dist && !distOptions.value.some((d) => d.value === fill.dist)) {
        distOptions.value = [...distOptions.value, { label: fill.dist, value: fill.dist }];
      }
      applyExpert('planner', fill.planner);
      applyExpert('architect', fill.architect);
      applyExpert('assessor', fill.assessor);
      if (form.leaderId && !leaderOptions.value.some((o) => o.value === form.leaderId)) {
        form.leaderId = undefined;
      }
      if (!fill.hasDraw) {
        showMessage('该片区暂无抽取记录，请先在随机抽取中确认三师');
      }
    } catch (error) {
      clearExperts();
      showMessage(error instanceof Error ? error.message : '回填片区三师失败');
    }
  }

  function addSlot() {
    slots.value.push({ key: `slot-${Date.now()}` });
  }

  function removeSlot(index: number) {
    if (slots.value.length <= 1) {
      slots.value = [{ key: `slot-${Date.now()}` }];
      return;
    }
    slots.value.splice(index, 1);
  }

  function beforeUploadSlot(index: number, file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.doc') && !name.endsWith('.docx')) {
      showMessage('仅支持 PDF、doc/docx 格式');
      return false;
    }
    void uploadSlot(index, file);
    return false;
  }

  async function uploadSlot(index: number, file: File) {
    const current = slots.value[index];
    if (!current) return;
    current.uploading = true;
    try {
      current.file = await espFileUpload(file);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '上传失败');
    } finally {
      current.uploading = false;
    }
  }

  function applyForm(data: EspReviewProject) {
    form.id = data.id || '';
    form.projectName = data.projectName || '';
    form.aUid = data.aUid || undefined;
    form.dist = data.dist || undefined;
    form.coordOrg = data.coordOrg || '';
    form.respDept = data.respDept || '';
    form.plannerId = data.plannerId || '';
    form.plannerName = data.plannerName || '';
    form.plannerTitle = data.plannerTitle || '';
    form.plannerOrg = data.plannerOrg || '';
    form.architectId = data.architectId || '';
    form.architectName = data.architectName || '';
    form.architectTitle = data.architectTitle || '';
    form.architectOrg = data.architectOrg || '';
    form.assessorId = data.assessorId || '';
    form.assessorName = data.assessorName || '';
    form.assessorTitle = data.assessorTitle || '';
    form.assessorOrg = data.assessorOrg || '';
    form.leaderId = data.leaderId || undefined;
    form.status = data.status || 'draft';
    reviewRole.value = data.role || 'viewer';
    memberOpinions.value = data.memberOpinions ?? [];
    myOpinion.value = data.myOpinion ?? null;
    summaryOpinion.value = data.summary ?? null;
    const files = data.files ?? [];
    if (files.length) {
      slots.value = files.map((file, i) => ({ key: `slot-${i}`, file }));
      if (!isView.value) {
        slots.value.push({ key: `slot-new-${Date.now()}` });
      }
    } else {
      slots.value = [{ key: 'slot-0' }];
    }
  }

  function buildPayload(submitType: 'draft' | 'submit') {
    return {
      id: form.id || undefined,
      projectName: form.projectName.trim(),
      aUid: form.aUid,
      dist: form.dist,
      coordOrg: form.coordOrg.trim(),
      respDept: form.respDept.trim(),
      plannerId: form.plannerId,
      plannerName: form.plannerName,
      plannerTitle: form.plannerTitle,
      plannerOrg: form.plannerOrg,
      architectId: form.architectId,
      architectName: form.architectName,
      architectTitle: form.architectTitle,
      architectOrg: form.architectOrg,
      assessorId: form.assessorId,
      assessorName: form.assessorName,
      assessorTitle: form.assessorTitle,
      assessorOrg: form.assessorOrg,
      leaderId: form.leaderId,
      files: slots.value.filter((s) => s.file?.url).map((s) => s.file!) as EspSchemeFile[],
      submitType,
    };
  }

  async function handleSave(submitType: 'draft' | 'submit') {
    if (saving.value) return;
    saving.value = true;
    try {
      await reviewProjectSave(buildPayload(submitType));
      showMessage(submitType === 'submit' ? '提交成功' : '暂存成功');
      emit('success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      saving.value = false;
    }
  }

  async function handleReviewSubmit() {
    if (saving.value) return;
    const payload = reviewPanelRef.value?.buildPayload?.() ?? {};
    if (!payload.member && !payload.summary) {
      showMessage(reviewRole.value === 'leader' ? '请填写项目评估或综合评估' : '请填写项目评估');
      return;
    }
    saving.value = true;
    try {
      await reviewProjectOpinion({
        projectId: form.id,
        member: payload.member,
        summary: payload.summary,
      });
      let okMsg = '提交成功';
      if (payload.summary) {
        okMsg =
          payload.summary.result === 'pass'
            ? '综合评估已提交（通过），项目已完成'
            : '综合评估已提交（不通过），项目已完成';
      }
      showMessage(okMsg);
      emit('success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '提交失败');
    } finally {
      saving.value = false;
    }
  }

  onMounted(async () => {
    try {
      const areas = await espDictAreas();
      areaOptions.value = (areas ?? []).map((a) => ({
        label: a.areaName || a.key,
        value: a.areaCode || a.value,
      }));
      const dists = [...new Set((areas ?? []).map((a) => a.dist).filter(Boolean))] as string[];
      distOptions.value = dists.map((d) => ({ label: d, value: d }));
      const data = await reviewProjectForm(isNew.value ? '' : props.record?.id);
      applyForm(data);
      if (form.dist && !distOptions.value.some((d) => d.value === form.dist)) {
        distOptions.value = [...distOptions.value, { label: form.dist, value: form.dist }];
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载表单失败');
    } finally {
      ready.value = true;
    }
  });
</script>
<style scoped>
  :deep(.ant-upload),
  :deep(.ant-upload-select) {
    display: block;
    width: 100%;
  }
</style>
