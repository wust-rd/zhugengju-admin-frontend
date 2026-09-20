<!--
  片区申报审查页（scheme-review/form.vue）
  入口：审查列表（….scheme-review/list.vue）的「审查」/「查看」；
  身份：按**登录账号的授权角色**判定（填报单位 esp_pqchsbsc_fill_unit / 联合审查单位
  esp_pqchsbsc_joint_review / 主审单位 esp_pqchsbsc_main_review，见 ../shared/review-mock.ts）。

  页面结构（上面填报内容只读 + 中间审查记录 + 下面填写区）：
   1. 填报内容八个区块只读回显（待审查片区取 sections-reviewing 版基本信息与 9 位附件材料，
      其余六区块与填报页共用 components/）；
   2. 审查记录（../shared/review-records.vue）—— **可见范围按查看者身份**：
      - 主审单位（viewer=main）：全部可见（各轮联合审查单位意见 + 主审历次意见）；
      - 填报单位查看（viewer=fill，填报页「查看」入口显式传入）：全部可见、只读；
      - 联合审查单位（viewer=joint）：只看自己的联审记录 + 自己参与轮次之后的主审意见
        （自己没提交时，主审后来出的结论也能看到），不暴露其他单位进度；
   3. 「片区申报审核」填写区：
      - 主审单位：审核结果 通过 / 退回修改 + 审核意见 + 附件；顶部 导出 / 联合审查 / 提交；
        提交 → 通过（终态）或 退回修改；联合审查 → 弹窗多选单位，点确定即推送
        （轮次 +1、状态 → 联合审查中，弹窗里主审已填内容不作数）；
      - 联合审查单位：审核结果 通过 / 退回修改 / 不涉及 + 审核意见 + 附件；顶部 导出 / 提交；
        每轮每单位只能提交一次，提交后不可修改（列表只给「查看」）；
      - 查看模式（mode='view'）：不显示填写区，仅看填报内容 + 审查记录。
  非 a-button/a-input 的 antd 组件必须显式 import（Dropdown/RadioGroup/Radio/TextArea/Upload）。
-->
<template>
  <div class="flex flex-col gap-16px" :style="{ '--section-scroll-mt': `${sectionScrollMt}px` }">
    <!-- 头部：返回 + 标题 + 当前角色 + 导出 / 联合审查 / 提交，滚动时吸顶 -->
    <div
      ref="barRef"
      class="sticky z-20 flex items-center gap-12px bg-white rd-8px px-16px py-12px shadow-sm"
      :style="{ top: `${stickyTop}px` }"
    >
      <a-button @click="emit('back')">
        <span class="inline-flex items-center gap-4px"><span class="i-fluent:arrow-left-12-filled"></span> 返回</span>
      </a-button>
      <span class="text-16px font-500">{{ title }}</span>
      <!-- 当前角色提示（由登录账号授权角色决定，只读展示） -->
      <span class="rd-4px bg-[#f2f5fa] px-8px py-2px text-12px text-gray-500">
        {{ ROLE_LABEL[identity.role] }}：{{ identity.name }}
      </span>
      <span class="flex-1"></span>
      <!-- 导出：与填报页同一套（PDF 打印版式 / Word 真文档），含审查记录 -->
      <Dropdown :trigger="['click']" :menu="{ items: exportMenuItems, onClick: onExportMenu }">
        <a-button :loading="exporting">
          <span class="inline-flex items-center gap-4px"
            ><span class="i-fluent:arrow-export-ltr-16-regular"></span> 导出</span
          >
        </a-button>
      </Dropdown>
      <!-- 联合审查：仅主审单位、审查模式；弹窗点确定即推送 -->
      <a-button v-if="showReviewForm && isMain" @click="jointOpen = true">
        <span class="inline-flex items-center gap-4px"
          ><span class="i-ant-design:team-outlined"></span> 联合审查</span
        >
      </a-button>
      <!-- 提交：二次确认（主审=结论会更新片区状态；联审单位=提交后不可修改） -->
      <Popconfirm
        v-if="showReviewForm"
        :title="submitConfirmTitle"
        ok-text="确认提交"
        cancel-text="取消"
        @confirm="handleSubmit"
      >
        <a-button type="primary" :loading="saving">提交</a-button>
      </Popconfirm>
    </div>

    <!-- 非本人/已提交等场景的说明条 -->
    <div v-if="notice" class="rd-6px bg-[#fff7e6] px-12px py-8px text-13px text-[#d46b08]">{{ notice }}</div>

    <!-- 填报内容（只读）+ 审查记录 + 填写区 -->
    <div v-if="formData" class="flex flex-col gap-16px xl:pr-160px">
      <FormSection v-for="sec in SECTIONS" :key="sec.id" :id="sec.id" :title="sec.title">
        <component :is="sec.component" :ref="(el) => setSectionRef(sec.id, el)" :data="formData" :disabled="true" />
      </FormSection>

      <!-- 审查记录（外壳同 FormSection，标题由记录组件内部提供）—— 单条时间线按时间正序：
           主审单位 = 联合审查意见 + 主审意见全部可见；
           联审单位 = 只看自己的联审记录 + 其参与轮次之后的主审意见；
           填报单位 = 只看主审单位的审查记录（show-joint=false） -->
      <div
        v-if="hasRecords"
        id="sec-records"
        class="scroll-mt-[var(--section-scroll-mt,12px)] bg-white rd-8px px-24px py-20px shadow-sm"
      >
        <ReviewRecords
          :row="record"
          :show-joint="!isFill"
          :show-main="true"
          :viewer-unit="viewerUnit"
        />
      </div>

      <!-- 片区申报审核：主审 / 联合审查单位填写（查看模式与非本人时隐藏） -->
      <FormSection v-if="showReviewForm" id="sec-review" title="片区申报审核">
        <div class="flex flex-col gap-16px">
          <!-- 审核结果（必填） -->
          <div class="flex items-start gap-12px">
            <span class="w-96px shrink-0 pt-4px text-right text-14px text-gray-700">
              <span class="mr-2px text-[#ff4d4f]">*</span>审核结果：
            </span>
            <RadioGroup v-model:value="review.conclusion">
              <Radio value="passed">通过</Radio>
              <Radio value="returned">退回修改</Radio>
              <!-- 联合审查单位专用：与本单位职责无关的可选「不涉及」 -->
              <Radio v-if="!isMain" value="na">不涉及</Radio>
            </RadioGroup>
          </div>

          <!-- 审核意见 -->
          <div class="flex items-start gap-12px">
            <span class="w-96px shrink-0 pt-4px text-right text-14px text-gray-700">审核意见：</span>
            <TextArea
              v-model:value="review.opinion"
              :rows="4"
              :maxlength="1000"
              show-count
              class="flex-1"
              placeholder="片区申报资料齐全，同意该片区纳入市级更新片区"
            />
          </div>

          <!-- 附件（真实上传 MinIO，文件对象数组） -->
          <div class="flex items-start gap-12px">
            <span class="w-96px shrink-0 pt-14px text-right text-14px text-gray-700">附件：</span>
            <div class="min-w-0 flex-1">
              <Upload
                :file-list="fileList"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                :show-upload-list="false"
                :before-upload="beforeUpload"
                class="review-upload"
                @change="onChange"
              >
                <div class="review-box">
                  <template v-if="fileList.length">
                    <div
                      v-for="f in fileList"
                      :key="f.uid ?? f.name"
                      class="flex w-full items-center gap-8px rd-6px bg-white px-10px py-6px"
                    >
                      <span
                        class="i-ant-design:file-text-outlined shrink-0 text-16px"
                        :style="{ color: fileColor(f.name) }"
                      ></span>
                      <span
                        v-if="f.status === 'uploading'"
                        class="i-ant-design:loading-outlined shrink-0 text-14px text-gray-400"
                      ></span>
                      <a
                        v-if="f.url"
                        class="min-w-0 flex-1 truncate text-13px text-gray-700 hover:text-[#3A8EF6]!"
                        :title="f.name"
                        :href="f.url"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ f.name }}
                      </a>
                      <span v-else class="min-w-0 flex-1 truncate text-13px text-gray-700">{{ f.name }}</span>
                      <span v-if="fileSizeText(f)" class="shrink-0 text-12px text-gray-400">{{ fileSizeText(f) }}</span>
                      <span
                        class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="删除"
                        @click.stop="removeFile(f)"
                      >
                        <span class="i-ant-design:close-outlined text-12px"></span>
                      </span>
                    </div>
                    <div class="flex items-center justify-center gap-4px pt-2px text-12px text-gray-400">
                      <span class="i-ant-design:plus-outlined"></span> 点击框内可继续添加
                    </div>
                  </template>
                  <!-- 空态：设计稿为居中「上传附件」 -->
                  <span v-else class="text-13px text-[#3A8EF6]">上传附件</span>
                </div>
              </Upload>
              <div class="pl-2px pt-4px text-12px text-gray-400">支持 pdf、doc、docx、xls/xlsx、jpg/png，可多选</div>
            </div>
          </div>
        </div>
      </FormSection>
    </div>

    <!-- 右侧悬浮导航（含 审查记录 / 片区申报审核 锚点） -->
    <AnchorNav :sections="navSections" />

    <!-- 联合审查：选择单位（多选）→ 确定即推送 -->
    <JointReviewModal v-model:open="jointOpen" @confirm="handleJointConfirm" />
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeReviewForm">
  import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import { Dropdown, Popconfirm, Radio, RadioGroup, TextArea, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import {
    schemeFillForm,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import FormSection from '../scheme-fill/components/form-section.vue';
  import AnchorNav from '../scheme-fill/components/anchor-nav.vue';
  import { fileColor, fileSizeText } from '../scheme-fill/components/file-display';
  import { exportFormDocx, exportFormPdf } from '../scheme-fill/components/form-export';
  import type { SectionFormExposed } from '../scheme-fill/components/use-section-form';
  import type { EspUploadFile } from '../scheme-fill/components/use-esp-file-list';
  import { useEspFileList } from '../scheme-fill/components/use-esp-file-list';
  // 待审查片区（isApprove=2）用 sections-reviewing 版；其余六区块与填报页共用 components/
  import SectionBasicInfo from '../scheme-fill/sections-reviewing/section-basic-info.vue';
  import SectionAttachment from '../scheme-fill/sections-reviewing/section-attachment.vue';
  import SectionHealthCheck from '../scheme-fill/components/section-health-check.vue';
  import SectionFunctionPlan from '../scheme-fill/components/section-function-plan.vue';
  import SectionCityDesign from '../scheme-fill/components/section-city-design.vue';
  import SectionPlanAdjust from '../scheme-fill/components/section-plan-adjust.vue';
  import SectionProjectInfo from '../scheme-fill/components/section-project-info.vue';
  import SectionFundingPlan from '../scheme-fill/components/section-funding-plan.vue';
  import ReviewRecords from '../shared/review-records.vue';
  import JointReviewModal from '../shared/joint-review-modal.vue';
  import { sendJointReviewNotice } from '../shared/review-notice';
  import {
    CONCLUSION_LABEL,
    ROLE_LABEL,
    currentIdentity,
    hasSubmittedCurrentRound,
    isAssignedToMe,
    jointRoundsOf,
    mainRecordsOf,
    pushJointReview,
    reviewRecordsOf,
    statusOf,
    submitJointReview,
    submitMainReview,
    type ReviewConclusion,
    type ReviewerIdentity,
  } from '../shared/review-mock';

  const props = defineProps<{
    record?: Recordable;
    mode?: 'review' | 'view';
    /** 查看者身份：main=主审（全部可见并可审查）/ joint=联审单位（只看与自己相关的）/
        fill=填报单位查看（只看主审记录、只读）/ view=无审查角色（只读、全部可见）；
        不传则按当前登录账号的角色推导 */
    viewer?: 'main' | 'joint' | 'fill' | 'view';
  }>();
  const emit = defineEmits(['success', 'back']);

  const { showMessage, notification } = useMessage();

  /** 列表行快照（id + name + mock：种子假数据无后端详情） */
  const record = { ...(props.record || {}) } as Recordable;

  /** 当前登录者身份（账号授权角色：填报单位 / 联合审查单位 / 主审单位） */
  const identity = currentIdentity();
  /**
   * 查看者：填报单位入口（填报页「查看」）显式传 fill；
   * 其余按登录角色推导 —— 主审可审查、联审单位按指派审查、无审查角色只能看。
   */
  const viewerRole = props.viewer ?? identity.role;
  const isMain = viewerRole === 'main';
  const isFill = viewerRole === 'fill';

  /** 查看模式（列表「查看」）：只读，不显示填写区 */
  const isViewMode = props.mode === 'view';

  /** 记录可见范围：联审单位只看自己的（+ 其参与轮次关联的主审意见） */
  const viewerUnit = computed(() => (viewerRole === 'joint' ? identity.name : undefined));

  const title = computed(() => `${record.name || '片区'}申报审查`);

  /** 联审单位可填写：状态为联合审查中 + 本轮被指派 + 本轮未提交 */
  const jointCanAct =
    viewerRole === 'joint' &&
    statusOf(record) === 'jointReviewing' &&
    isAssignedToMe(record) &&
    !hasSubmittedCurrentRound(record);

  /** 是否显示「片区申报审核」填写区（填报单位 / 无审查角色只看不填） */
  const showReviewForm = computed(() => !isViewMode && (isMain || jointCanAct));

  /** 说明条：非本人范围 / 已提交不可修改 / 无审查角色 */
  const notice = computed(() => {
    if (isViewMode || isMain || isFill) return '';
    if (viewerRole !== 'joint') return '当前账号没有审查角色（填报单位 / 联合审查单位 / 主审单位），仅供查看。';
    if (statusOf(record) !== 'jointReviewing') return '该片区当前不在联合审查阶段，仅供查看。';
    if (!isAssignedToMe(record)) return '该片区本轮未指派给贵单位，仅供查看。';
    if (hasSubmittedCurrentRound(record)) return '贵单位本轮意见已提交，提交后不可修改，仅供查看。';
    return '';
  });

  /** 审查记录是否有内容（决定是否渲染记录区块与锚点）：
      填报单位只看主审记录，故对其而言只有主审出过意见才算有内容 */
  const hasRecords = computed(() =>
    isFill
      ? mainRecordsOf(record).length > 0
      : jointRoundsOf(record).length > 0 || mainRecordsOf(record).length > 0,
  );

  /**
   * 填报内容（只读回显）：真实片区按 id 拉详情；种子假数据（record.mock）无后端片区，
   * 直接用行数据渲染骨架，不调接口。
   */
  const formData = ref<Recordable>();

  onMounted(async () => {
    if (record.mock) {
      formData.value = { ...record, isApprove: '2' };
      return;
    }
    try {
      formData.value = (await schemeFillForm(String(record.id))) as Recordable;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载片区填报数据失败');
      emit('back');
    }
  });

  /** 吸顶偏移 = 布局固定头（头部 + 多页签）的实际底沿（同填报页做法） */
  const stickyTop = ref(0);
  const barRef = ref<HTMLElement | null>(null);
  const sectionScrollMt = computed(() => stickyTop.value + (barRef.value?.offsetHeight ?? 0) + 16);

  function measureStickyTop() {
    stickyTop.value = document.querySelector('.jeesite-layout-multiple-header')?.getBoundingClientRect().bottom ?? 0;
  }

  onMounted(() => {
    measureStickyTop();
    window.addEventListener('resize', measureStickyTop);
  });
  onActivated(measureStickyTop);
  onBeforeUnmount(() => window.removeEventListener('resize', measureStickyTop));

  /** 只读区块（导出用：取各区块 exportRows 重排版） */
  const SECTIONS = [
    { id: 'sec-basic', title: '片区基本信息', component: SectionBasicInfo },
    { id: 'sec-health', title: '片区体检情况', component: SectionHealthCheck },
    { id: 'sec-func', title: '片区功能策划', component: SectionFunctionPlan },
    { id: 'sec-city-design', title: '片区城市设计', component: SectionCityDesign },
    { id: 'sec-plan-adjust', title: '片区规划调整', component: SectionPlanAdjust },
    { id: 'sec-project', title: '片区项目情况', component: SectionProjectInfo },
    { id: 'sec-fund', title: '片区资金方案', component: SectionFundingPlan },
    { id: 'sec-attach', title: '附件材料', component: SectionAttachment },
  ] as const;

  /** 锚点导航：只读区块 + 有记录时的「审查记录」+ 填写区「片区申报审核」 */
  const navSections = [
    ...SECTIONS.map(({ id, title: navTitle }) => ({ id, title: navTitle })),
    ...(hasRecords.value ? [{ id: 'sec-records', title: '审查记录' }] : []),
    ...(showReviewForm.value ? [{ id: 'sec-review', title: '片区申报审核' }] : []),
  ];

  const sectionRefs = new Map<string, SectionFormExposed | null>();

  function setSectionRef(id: string, el: unknown) {
    sectionRefs.set(id, (el as SectionFormExposed) ?? null);
  }

  // ---------------- 片区申报审核（填写区） ----------------

  /**
   * 审查意见表单：不预填审核结果 —— 每一轮都是一次新的判断（上一轮结论在「审查记录」里可查），
   * 只把上一轮主审的审核意见/附件带出来，减少重复录入。
   */
  const lastMain = isMain ? mainRecordsOf(record)[0] : undefined;
  const review = reactive<{ conclusion?: ReviewConclusion; opinion: string }>({
    conclusion: undefined,
    opinion: lastMain?.opinion ?? '',
  });

  /** 附件上传状态机（复用填报页的 MinIO 上传封装） */
  const { fileList, onChange, beforeUpload, remove, espFiles } = useEspFileList(lastMain?.files);

  function removeFile(f: EspUploadFile) {
    remove(f);
  }

  /** 提交二次确认文案（主审结论会改片区状态；联审单位提交后不可改） */
  const submitConfirmTitle = computed(() =>
    isMain
      ? '确认提交审查结论？提交后片区状态按审核结果更新（通过则流程结束）'
      : '确认提交联合审查意见？提交后不可修改',
  );

  const saving = ref(false);

  /** 提交：主审 → 通过/退回修改（写状态）；联审单位 → 本轮意见（每轮一次，不可修改） */
  function handleSubmit() {
    if (!review.conclusion) {
      showMessage('请选择审核结果');
      return;
    }
    if (fileList.value.some((f) => f.status === 'uploading')) {
      showMessage('附件上传中，请稍候再提交');
      return;
    }
    saving.value = true;
    try {
      const payload = { opinion: review.opinion, files: espFiles() };
      if (isMain) {
        if (review.conclusion === 'na') {
          showMessage('主审单位只能选择通过或退回修改');
          return;
        }
        submitMainReview(record, { conclusion: review.conclusion, ...payload }, identity);
        showMessage(review.conclusion === 'passed' ? '审查已提交：通过' : '审查已提交：退回修改');
      } else {
        const created = submitJointReview(record, { conclusion: review.conclusion, ...payload }, identity);
        if (!created) {
          showMessage('贵单位本轮意见已提交，不可重复提交');
          return;
        }
        showMessage(`联合审查意见已提交：${CONCLUSION_LABEL[review.conclusion].label}`);
      }
      emit('success');
    } finally {
      saving.value = false;
    }
  }

  // ---------------- 联合审查（主审发起） ----------------

  const jointOpen = ref(false);

  /**
   * 弹窗「确定」即推送（业务确认：推送后主审弹窗里填的审核内容不作数）：
   * 轮次 +1、片区状态 → 联合审查中、发**系统站内消息**给联合审查单位（见 ../shared/review-notice.ts），
   * 同时当前页弹框架通知提示。
   */
  async function handleJointConfirm(units: ReviewerIdentity[]) {
    const round = pushJointReview(record, units);
    const sent = await sendJointReviewNotice({
      rowName: String(record.name ?? ''),
      round: round.round,
      units,
      senderName: identity.name,
    });
    // antdv-next 的 notification 用 title/description（不是 antd React 的 message）
    notification.success({
      title: `联合审查已推送（第 ${round.round} 轮）`,
      description: sent
        ? `已发送系统通知给：${units.map((unit) => unit.name).join('、')}`
        : `已推送：${units.map((unit) => unit.name).join('、')}（系统通知发送失败，请检查 msg 接口权限）`,
      duration: 4,
    });
    emit('success');
  }

  // ---------------- 导出（与填报页同一套：打印版式 PDF / 真文档 Word） ----------------

  const exporting = ref(false);
  const exportMenuItems = [
    { key: 'pdf', label: '导出 PDF' },
    { key: 'docx', label: '导出 Word' },
  ];

  function onExportMenu({ key }: { key: string | number }) {
    void runExport(key === 'docx' ? 'docx' : 'pdf');
  }

  /** 审查记录 → 导出行（[标签, 值]，供 PDF/Word 的字段表渲染） */
  function recordRows(): [string, string][] {
    const rows: [string, string][] = [];
    const all = reviewRecordsOf(record);
    for (const round of jointRoundsOf(record)) {
      const roundRecords = all.filter((item) => item.role === 'joint' && item.round === round.round);
      rows.push([
        `第 ${round.round} 次联合审查单位`,
        `${round.units.map((unit) => unit.name).join('、')}（已提交 ${roundRecords.length}/${round.units.length}）`,
      ]);
      for (const item of roundRecords) {
        rows.push([`${item.unitName}（${item.time}）`, recordSummary(item)]);
      }
    }
    for (const item of mainRecordsOf(record)) {
      rows.push([`主审 ${item.unitName}（${item.time}）`, recordSummary(item)]);
    }
    return rows;
  }

  /** 单条记录的导出文案：结论；意见；附件 */
  function recordSummary(item: { conclusion: ReviewConclusion; opinion: string; files?: { name: string }[] }): string {
    const files = item.files?.length ? `；附件：${item.files.map((file) => file.name).join('、')}` : '';
    return `${CONCLUSION_LABEL[item.conclusion].label}；${item.opinion || '无意见'}${files}`;
  }

  async function runExport(format: 'pdf' | 'docx') {
    if (!formData.value || exporting.value) return;
    exporting.value = true;
    try {
      // SECTIONS 为 as const，导出时追加记录/审核区块需显式放宽为 string 结构
      const sections: { id: string; title: string; rows: [string, string][] }[] = SECTIONS.map((sec) => ({
        id: sec.id,
        title: sec.title,
        rows: sectionRefs.get(sec.id)?.exportRows() ?? [],
      }));
      if (hasRecords.value) {
        sections.push({ id: 'sec-records', title: '审查记录', rows: recordRows() });
      }
      if (showReviewForm.value && review.conclusion) {
        sections.push({
          id: 'sec-review',
          title: '片区申报审核',
          rows: [
            ['审核结果', CONCLUSION_LABEL[review.conclusion].label],
            ['审核意见', review.opinion || '（无）'],
            ['附件', espFiles().map((f) => f.name).join('、') || '（无）'],
          ],
        });
      }
      const headerTitle = `${record.name || '片区'}申报审查`;
      if (format === 'docx') {
        await exportFormDocx(sections, headerTitle, `${record.name || '片区'}-申报审查.docx`);
      } else {
        await exportFormPdf(sections, headerTitle, `${record.name || '片区'}-申报审查.pdf`);
      }
      showMessage('导出成功');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      exporting.value = false;
    }
  }
</script>
<style scoped>
  /* Upload 根与内层触发区默认 inline，antd 运行时样式会盖掉 Uno 类选择器，故用 scoped 强制通栏 */
  .review-upload {
    display: block;
    width: 100%;
  }

  .review-upload :deep(.ant-upload) {
    display: block;
    width: 100%;
  }

  /* 附件框：实线边框通栏（对齐设计稿「上传附件」框） */
  .review-box {
    display: flex;
    min-height: 56px;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    row-gap: 6px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 12px;
    transition: border-color 0.2s;
  }

  .review-box:hover {
    border-color: #3a8ef6;
  }

  .review-box > span:only-child {
    align-self: center;
  }
</style>
