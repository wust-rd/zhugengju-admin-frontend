<!--
  片区申报审查页（scheme-review/form.vue）
  入口：审查列表（….scheme-review/list.vue）的「审查」/「查看」；填报页 Tab②「查看」
  （viewer=fill）。已对接后端（modules/esp，2026-09-20 审查流转）：详情/提交/推送走
  /a/esp/schemeReview/*，records 按查看者角色过滤、按钮可用性 actions 后端统一计算。

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
        提交 → 通过（终态）或 退回修改；联合审查 → 弹窗多选单位（候选=后端联审单位字典），
        点确定即推送（轮次 +1、状态 → 联合审查中，站内消息由后端按部门推送，
        弹窗里主审已填内容不作数）；
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
        {{ ROLE_LABEL[viewerRole] }}：{{ detailViewer?.officeName || identity.name }}
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
      <!-- 联合审查：仅主审单位、审查模式（后端 actions.canJointPush）；弹窗点确定即推送 -->
      <a-button v-if="showReviewForm && actions.canJointPush" @click="jointOpen = true">
        <span class="inline-flex items-center gap-4px"><span class="i-ant-design:team-outlined"></span> 联合审查</span>
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
          :records="records"
          :rounds="rounds"
          :show-joint="!isFill"
          :show-main="true"
          :viewer-code="viewerCode"
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
  import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
  import { Dropdown, Popconfirm, Radio, RadioGroup, TextArea, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    schemeReviewForm,
    schemeReviewJointPush,
    schemeReviewJointSubmit,
    schemeReviewMainSubmit,
    type EspJointRound,
    type EspReviewActions,
    type EspReviewRecord,
    type EspReviewViewer,
    type ReviewConclusion,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';
  import FormSection from '../scheme-fill/components/form-section.vue';
  import AnchorNav from '../scheme-fill/components/anchor-nav.vue';
  import { fileColor, fileSizeText } from '../scheme-fill/components/file-display';
  import { exportFormDocx, exportFormPdf } from '../scheme-fill/components/form-export';
  import type { SectionFormExposed } from '../scheme-fill/components/use-section-form';
  import type { EspUploadFile } from '../scheme-fill/components/use-esp-file-list';
  import { toUploadFile, useEspFileList } from '../scheme-fill/components/use-esp-file-list';
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
  import {
    CONCLUSION_LABEL,
    ROLE_LABEL,
    currentIdentity,
    statusKeyOf,
    type ReviewerRole,
  } from '../shared/review-constants';

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

  /** 当前登录者身份（账号授权角色；联审角色挂在机构上，用户 roleList 里通常没有） */
  const identity = currentIdentity();

  /** 详情下发的查看者身份（后端按登录角色/部门计算——登录接口不含用户机构信息） */
  const detailViewer = ref<EspReviewViewer>();

  /**
   * 查看者角色：填报单位入口（填报页「查看」）显式传 fill 优先（view 视为无角色只读）；
   * 其余以详情下发的 viewer.role 为准（联审身份=部门在联审字典内，本地推导不出）；
   * 详情未就绪时回退本地角色推导。
   */
  const viewerRole = computed<ReviewerRole>(() => {
    if (props.viewer) return props.viewer === 'view' ? 'none' : props.viewer;
    return detailViewer.value?.role ?? identity.role;
  });
  const isMain = computed(() => viewerRole.value === 'main');
  const isFill = computed(() => viewerRole.value === 'fill');

  /** 查看模式（列表「查看」）：只读，不显示填写区 */
  const isViewMode = props.mode === 'view';

  /**
   * 记录可见范围：联审单位只看自己的（+ 其参与轮次关联的主审意见）。
   * 本部门编码取详情 viewer.officeCode（按编码匹配轮次/记录；此前按机构名称匹配，
   * 登录返回无 officeName 导致全部过滤——联审单位看不到自己与主审的意见，已修）。
   */
  const viewerCode = computed(() =>
    viewerRole.value === 'joint' ? (detailViewer.value?.officeCode ?? undefined) : undefined,
  );

  const title = computed(() => `${record.name || '片区'}申报审查`);

  /** 行/详情状态（列表行带 reviewStatus；详情就绪后以 scheme.reviewStatus 为准） */
  const reviewStatus = computed(() => statusKeyOf(formData.value ?? record));

  /**
   * 是否显示「片区申报审核」填写区：主审=canMainReview / 联审=canJointReview（后端 actions）。
   * 退回修改后主审不可审由后端 actions 保证（2026-09-20（三）修复，提交 240480d0：
   * canMainReview/canJointPush 已排除 returned），前端回归纯 actions 驱动。
   */
  const showReviewForm = computed(
    () => !isViewMode && (isMain.value ? actions.value.canMainReview : actions.value.canJointReview),
  );

  /** 说明条：非本人范围 / 已提交不可修改 / 无审查角色（口径同后端 actions 计算条件） */
  const notice = computed(() => {
    if (isViewMode || isFill.value) return '';
    if (isMain.value) {
      if (reviewStatus.value === 'passed') return '该片区已通过（终态），仅供查看。';
      if (reviewStatus.value === 'unsubmitted') return '该片区尚未提交申报，仅供查看。';
      if (reviewStatus.value === 'returned') return '该片区已退回填报单位修改，待其重新提交后方可再次审查。';
      return '';
    }
    if (viewerRole.value !== 'joint') return '当前账号没有审查角色（填报单位 / 联合审查单位 / 主审单位），仅供查看。';
    if (reviewStatus.value !== 'jointReviewing') return '该片区当前不在联合审查阶段，仅供查看。';
    if (!actions.value.canJointReview) return '该片区本轮未指派给贵单位或已提交过意见，仅供查看。';
    return '';
  });

  /** 审查记录是否有内容（决定是否渲染记录区块与锚点；records 后端已按查看者过滤） */
  const hasRecords = computed(() => records.value.length > 0);

  /**
   * 审查页详情（后端 schemeReview/form 一次取齐）：
   *  - scheme：填报全字段（含 reviewStatus），驱动只读区块回显与状态相关展示；
   *  - records：审查记录（后端已按查看者角色过滤：主审=全部 / 填报=仅主审 /
   *    联审=本部门记录+被指派轮推送之后的主审意见）；
   *  - rounds：各轮指派单位；actions：按钮可用性（canMainReview/canJointPush/
   *    canJointReview/canEdit，后端按角色+状态+指派+已提交计算）。
   */
  const formData = ref<Recordable>();
  const records = ref<EspReviewRecord[]>([]);
  const rounds = ref<EspJointRound[]>([]);
  const actions = ref<EspReviewActions>({
    canMainReview: false,
    canJointPush: false,
    canJointReview: false,
    canEdit: false,
  });

  onMounted(async () => {
    try {
      const detail = await schemeReviewForm(String(record.id));
      formData.value = detail.scheme as Recordable;
      records.value = detail.records ?? [];
      rounds.value = detail.rounds ?? [];
      actions.value = detail.actions;
      detailViewer.value = detail.viewer;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载片区审查数据失败');
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
  /** 主审最近一条意见（详情就绪后预填审核意见/附件，减少重复录入；结论不预填——每轮都是新判断） */
  const lastMain = computed(() => {
    const mains = records.value.filter((item) => item.role === 'main');
    return mains.length ? mains[mains.length - 1] : undefined;
  });

  const review = reactive<{ conclusion?: ReviewConclusion; opinion: string }>({
    conclusion: undefined,
    opinion: '',
  });

  /** 附件上传状态机（复用填报页的 MinIO 上传封装） */
  const { fileList, onChange, beforeUpload, remove, espFiles } = useEspFileList();

  // 详情就绪后带出上一轮主审的意见与附件
  watch(
    lastMain,
    (item) => {
      review.opinion = item?.opinion ?? '';
      fileList.value = (item?.files ?? []).map((f, i) => toUploadFile(f, `last-${i}`));
    },
    { immediate: true },
  );

  function removeFile(f: EspUploadFile) {
    remove(f);
  }

  /** 提交二次确认文案（主审结论会改片区状态；联审单位提交后不可改） */
  const submitConfirmTitle = computed(() =>
    isMain.value
      ? '确认提交审查结论？提交后片区状态按审核结果更新（通过则流程结束）'
      : '确认提交联合审查意见？提交后不可修改',
  );

  const saving = ref(false);

  /** 提交：主审 → 通过/退回修改（写状态）；联审单位 → 本轮意见（每轮一次，不可修改） */
  async function handleSubmit() {
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
      if (isMain.value) {
        if (review.conclusion === 'na') {
          showMessage('主审单位只能选择通过或退回修改');
          return;
        }
        await schemeReviewMainSubmit(String(record.id), {
          conclusion: review.conclusion,
          ...payload,
        });
        showMessage(review.conclusion === 'passed' ? '审查已提交：通过' : '审查已提交：退回修改');
      } else {
        try {
          await schemeReviewJointSubmit(String(record.id), { conclusion: review.conclusion, ...payload });
        } catch (error) {
          // 后端校验（最新轮指派本部门 / 本轮未提交）不通过时展示 msg
          showMessage(error instanceof Error ? error.message : '提交失败');
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
  const jointSaving = ref(false);

  /**
   * 弹窗「确定」即推送（业务确认：推送后主审弹窗里填的审核内容不作数）：
   * 后端插一轮（round=max+1）、状态 → 联合审查中，并给被选单位按部门发站内消息
   * （receive_type=2，发送失败后端仅记日志不阻断）；当前页弹框架通知提示。
   */
  async function handleJointConfirm(units: { code: string; name: string }[]) {
    jointSaving.value = true;
    try {
      const pushed = await schemeReviewJointPush(
        String(record.id),
        units.map((unit) => unit.code),
      );
      // antdv-next 的 notification 用 title/description（不是 antd React 的 message）
      notification.success({
        title: `联合审查已推送（第 ${pushed.round} 轮）`,
        description: `已推送：${units.map((unit) => unit.name).join('、')}（站内消息由系统发送）`,
        duration: 4,
      });
      emit('success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '联合审查推送失败');
    } finally {
      jointSaving.value = false;
    }
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

  /** 审查记录 → 导出行（[标签, 值]，供 PDF/Word 的字段表渲染；数据=详情接口的 records/rounds） */
  function recordRows(): [string, string][] {
    const rows: [string, string][] = [];
    for (const round of rounds.value) {
      const roundRecords = records.value.filter((item) => item.role === 'joint' && item.round === round.round);
      rows.push([
        `第 ${round.round} 次联合审查单位`,
        `${round.units.map((unit) => unit.name).join('、')}（已提交 ${roundRecords.length}/${round.units.length}）`,
      ]);
      for (const item of roundRecords) {
        rows.push([`${item.unitName}（${item.reviewTime}）`, recordSummary(item)]);
      }
    }
    for (const item of [...records.value].filter((item) => item.role === 'main').reverse()) {
      rows.push([`主审 ${item.unitName}（${item.reviewTime}）`, recordSummary(item)]);
    }
    return rows;
  }

  /** 单条记录的导出文案：结论；意见；附件 */
  function recordSummary(item: {
    conclusion: ReviewConclusion;
    opinion?: string | null;
    files?: { name: string }[];
  }): string {
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
            [
              '附件',
              espFiles()
                .map((f) => f.name)
                .join('、') || '（无）',
            ],
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
