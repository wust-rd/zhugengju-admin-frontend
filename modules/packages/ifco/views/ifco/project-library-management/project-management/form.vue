<!--
  ifco —— 在库项目管理（查看 / 新增 / 编辑 / 审核 一体表单抽屉）

  打开模式（list 操作列传 mode）：view=只读；edit=编辑（新增态页脚 取消/暂存/提交，
  已有策划库项目页脚 取消/暂存/申请转库；提交与申请转库同链路=校验+二次确认后
  save+apply；新增态步骤②起锁定，暂存/提交落库后重开才开放），review=审核（页脚
  取消/保存审查，审查人员在步骤②③审查块填结论——责任部门「通过审查/退回修改」
  结论经 reviewSave 推进状态，按当前库决定结论落点：策划库=步骤②、储备库=步骤③）。

  数据走 /a/ifco/lib 接口：打开时 detail 回填（联查列名小写 + reviews +
  transferLogs）；暂存=save（三组：base/reviewFiles/impl，impl 组同步写主表
  三字段）；「填报人再次发起」记录=transferLogs 中 RESUBMIT 行。

  四步流转步骤条（@jeesite/ui 的 Stepper 兼页签）：① 策划库入库=基本信息表单；
  ② 策划转储备=审查文件表单（六分区）；③ 储备转实施=实施三分区+审查结果；
  ④ 已实施入库=流程状态页（「当前页面只表达流程状态，无实际内容」）。
  步骤点亮按项目所处库开放到「进行中」的步骤——策划库=①②，储备库=①②③，
  实施库=①②③④；已退出按退出环节映射；步骤条无完成勾（仅当前选中强调色）。

  编辑权限（三层）：操作入口=视角×状态矩阵（list）；步骤点亮=按库；表单字段=
  mode 非 edit 或已转出策划库时步骤①②整体只读（含上传/地理/审查块），仅
  步骤③申报字段在储备库可编辑；审查块在 review 模式放开；项目编号/入库时间/
  总体投资估算/带出两字段恒只读（identityLocked 字段级锁定策划库内生效）。

  值口径与后端一致：status/library 英文枚举（Tag 经 STATUS_LABEL 转中文）；
  五改/批次/功能定位中文值；多选逗号分隔；文件 JSON 数组串 [{name,url,objectKey,size}]。
  主体信息走接口字典：行业主管部门/责任部门选项=行业主管部门角色机构（industryDeptOptions）；
  指定填报主体=全部机构+全部公司合并（reportOrgOptions，找不到可现场建公司 companyCreate）；
  统筹主体/实施主体为纯字符串。行政区/片区仍为前端静态字典；文件真实上传与 shp/dwg 解析
  接口暂未接入（上传仅记录文件名，地理数据沿用已存 geo_json）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer">
    <template #title>
      <span>{{ getTitle }}</span>
      <Tag
        v-if="record.status"
        v-bind="statusTagProps(record.status as ProjectStatus)"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ statusLabel(record.status) }}
      </Tag>
    </template>

    <!-- 已退出项目：退出信息（步骤条上方灰底只读展示，不占表单分区） -->
    <div
      v-if="isExited"
      class="mb-4 flex flex-wrap items-center gap-x-32px gap-y-4px bg-gray-100 rd-2 px-16px py-10px text-14px"
    >
      <span>
        <span class="text-gray-500">退出环节：</span>
        <span class="ml-4px text-gray-800">{{ exitedFromLabel || '/' }}</span>
      </span>
      <span>
        <span class="text-gray-500">退出类型：</span>
        <span class="ml-4px text-gray-800">{{ record.exit_type || '/' }}</span>
      </span>
      <span>
        <span class="text-gray-500">退出时间：</span>
        <span class="ml-4px text-gray-800">{{ toDateStr(record.exit_date) || '/' }}</span>
      </span>
      <span>
        <span class="text-gray-500">退出原因：</span>
        <span class="ml-4px text-gray-800">{{ record.exit_reason || '/' }}</span>
      </span>
      <span>
        <span class="text-gray-500">退出附件：</span>
        <span class="ml-4px text-gray-800">{{ exitFileNames || '/' }}</span>
      </span>
    </div>

    <!-- 四步流转步骤条（兼页签：点击切换内容区；已退出整条置灰；无完成勾） -->
    <Stepper v-model:active="activeStage" :steps="stepItems" :tone="isExited ? 'gray' : 'blue'" class="mb-16px" />

    <!-- 步骤内容（Stepper 兼页签，切换进入方向滑动；v-show 不销毁表单防丢填写中间态） -->
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 0">
        <!-- 步骤① 整体走共用组件（可编辑态；表单定义/选项加载/建公司弹窗都在组件内） -->
        <ProjectBasicInfoForm
          ref="basicFormRef"
          :disabled="mode !== 'edit'"
          :identity-locked="identityLocked"
          :show-impl-condition="false"
        />
      </div>
    </Transition>
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 1">
        <BasicForm @register="handleReviewFormRegister">
          <!-- 立项审批或核准备案文件：提示行 + 图标按钮上传（多文件不限量，before-upload 拦截，待真实上传接口） -->
          <template #projectApprovalOrFilingFileList>
            <div class="text-14px text-black mb-4">政府投资项目上传立项审批文件，企业投资项目请上传核准或备案文件</div>
            <Upload
              v-if="!formDisabled"
              v-model:file-list="approvalOrFilingFileList"
              class="mt-8px"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <!-- 只读态：只读文件清单 -->
            <div v-else class="mt-8px flex flex-col gap-4px">
              <div
                v-for="file in approvalOrFilingFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!approvalOrFilingFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 国土空间规划符合情况：上传（多文件不限量，与立项审批同款交互） -->
          <template #territorialSpacePlanFileList>
            <Upload
              v-if="!formDisabled"
              v-model:file-list="territorialSpacePlanFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
            </Upload>
            <div v-else class="flex flex-col gap-4px">
              <div
                v-for="file in territorialSpacePlanFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!territorialSpacePlanFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 项目实施方案：上传（多文件不限量，与前两区同款交互） -->
          <template #projectImplementationPlanFileList>
            <Upload
              v-if="!formDisabled"
              v-model:file-list="projectImplementationPlanFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
            </Upload>
            <div v-else class="flex flex-col gap-4px">
              <div
                v-for="file in projectImplementationPlanFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!projectImplementationPlanFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 其他论证材料：文物保护/环评是否 + 上传附件（与立项审批同款交互） -->
          <template #otherArgumentFileList>
            <Upload
              v-if="!formDisabled"
              v-model:file-list="otherArgumentFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <div v-else class="mt-8px flex flex-col gap-4px">
              <div
                v-for="file in otherArgumentFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!otherArgumentFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 地理数据：沿用已存 geo_json 渲染编辑（shp/dwg 解析接口暂未接入） -->
          <template #locationGeoJson>
            <GeoDataSection
              v-model:geo-json="locationGeoJson"
              v-model:file-name="locationFileName"
              :parse-file="parseGeoLocationFile"
              :geometry-types="['polygon']"
              :disabled="formDisabled"
            />
          </template>
          <!-- 联合审查机构审查（第一次审查）：行业主管部门（切换）+ 责任部门（市住更局）；
               review 模式放开（审核落点），其余模式随 formDisabled -->
          <template #jointReview>
            <ReviewBlock
              v-model:entries="reviewMap"
              v-model:responsibility="responsibilityReview"
              :sections="REVIEW_SECTIONS"
              :org-list="reviewOrgList"
              :resubmit-logs="resubmitLogs"
              :disabled="mode === 'view' || (mode === 'edit' && formDisabled)"
            />
          </template>
        </BasicForm>
      </div>
    </Transition>
    <!-- 步骤③：储备转实施（实施条件确认/规划调整情况/资金落实情况） -->
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 2">
        <BasicForm @register="handleImplFormRegister">
          <!-- 规划调整附件：提示行 + 上传（与立项审批同款交互） -->
          <template #implPlanAdjustmentFileList>
            <div class="text-14px text-black mb-4">请上传经规委会审议的方案成果、评审结果、批复文件</div>
            <Upload
              v-if="implEditable"
              v-model:file-list="implPlanAdjustmentFileList"
              class="mt-8px"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <div v-else class="mt-8px flex flex-col gap-4px">
              <div
                v-for="file in implPlanAdjustmentFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!implPlanAdjustmentFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 资金落实附件：提示行 + 上传（与立项审批同款交互） -->
          <template #implFundProofFileList>
            <div class="text-14px text-black mb-4">
              请上传资金来源证明、金融机构贷款意向函或财政资金安排文件等证明材料
            </div>
            <Upload
              v-if="implEditable"
              v-model:file-list="implFundProofFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <div v-else class="mt-8px flex flex-col gap-4px">
              <div
                v-for="file in implFundProofFileList"
                :key="file.uid"
                class="flex items-center gap-6px text-14px text-gray-800"
              >
                <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                {{ file.name }}
              </div>
              <div v-if="!implFundProofFileList.length" class="text-14px text-gray-400">未上传文件</div>
            </div>
          </template>
          <!-- 审查结果（储备转实施）：review 模式放开（储备库轮次结论落点） -->
          <template #implJointReview>
            <ReviewBlock
              v-model:entries="implReviewMap"
              v-model:responsibility="implResponsibilityReview"
              :sections="IMPL_REVIEW_SECTIONS"
              :org-list="reviewOrgList"
              :resubmit-logs="resubmitLogs"
              :disabled="mode === 'view' || (mode === 'edit' && implDisabled)"
            />
          </template>
        </BasicForm>
      </div>
    </Transition>
    <!-- 步骤④：已实施入库（实施库项目可点亮；只表达流程状态，无实际内容） -->
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 3" class="flex min-h-200px items-center justify-center">
        <span class="text-14px text-gray-400">当前页面只表达流程状态，无实际内容</span>
      </div>
    </Transition>

    <!-- 页脚（footer 插槽自控）：view=关闭；edit=取消/暂存/申请转库；review=取消/保存审查 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ mode === 'view' ? '关闭' : '取消' }} </a-button>
      <template v-if="mode === 'edit'">
        <a-button class="mr-2" @click="handleSaveDraft"> 暂存 </a-button>
        <!-- 新增态=提交（保存并送审）；已有项目=申请转库；同一动作链路 -->
        <a-button type="primary" :loading="submitting" @click="handleApplyTransfer">
          {{ record.isNewRecord ? '提交' : '申请转库' }}
        </a-button>
      </template>
      <a-button v-else-if="mode === 'review'" type="primary" :loading="submitting" @click="handleSaveReview">
        保存审查
      </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementForm">
  import { computed, ref, watch } from 'vue';
  import { Modal, Tag, Upload } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { Button } from '@jeesite/core/components/Button';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import { match } from 'ts-pattern';
  import {
    INDUSTRY_SUPERVISION_DEPT_LIST,
    LIBRARY_LABELS,
    IMPL_REVIEW_SECTIONS,
    REVIEW_SECTIONS,
    applyLibTransfer,
    emptyImplReviewResults,
    emptyReviewResults,
    fetchLibDetail,
    fileListNames,
    parseFileList,
    parseGeoLocationFile,
    saveLibProject,
    saveLibReview,
    serializeFileList,
    splitList,
    statusLabel,
    statusTagProps,
    YES_NO_OPTIONS,
    type ImplResponsibilityReviewEntry,
    type ImplReviewEntryMap,
    type LibDetail,
    type LibraryKey,
    type ProjectReviewEntryMap,
    type ProjectStatus,
    type ResponsibilityConclusion,
    type ResponsibilityReviewEntry,
    type TransferLogItem,
  } from '@jeesite/ifco/api/ifco/project-library';
  import { GeoDataSection } from '@jeesite/shared/components/geo-data-section';
  import ProjectBasicInfoForm from '../../shared/project-basic-info-form.vue';
  import ReviewBlock from './review-block';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  /** 打开模式：view=只读；edit=编辑（暂存/申请转库）；review=审核（保存审查） */
  type FormMode = 'view' | 'edit' | 'review';

  const mode = ref<FormMode>('edit');

  /** 抽屉数据（列表行或新增标记；编辑中经 detail 接口补全） */
  const record = ref<Recordable>({});

  /** 详情整包（reviews/transferLogs/currentRound） */
  const detail = ref<LibDetail | null>(null);

  /** 编辑权限：项目转到储备库及之后，「不可修改」清单字段锁定（策划库内可编辑） */
  const identityLocked = ref(false);

  /** 步骤①②（基本信息/审查文件申报区）只读：非 edit 模式或已转出策划库（储备库起前两步骤只读） */
  const formDisabled = computed(() => mode.value !== 'edit' || identityLocked.value);

  /** 步骤③申报字段只读：仅 edit 模式放开（储备库填报储备转实施内容） */
  const implEditable = computed(() => mode.value === 'edit');
  const implDisabled = computed(() => mode.value !== 'edit');

  /** 步骤① 共用组件引用（回填/取值/校验/选项映射都经它） */
  const basicFormRef = ref<InstanceType<typeof ProjectBasicInfoForm>>();

  // ── 审查文件页签：四个文件清单（名称级，多文件不限量）+ 地理数据 ──
  type UploadFileItem = { uid: string; name: string };

  const approvalOrFilingFileList = ref<UploadFileItem[]>([]);
  const territorialSpacePlanFileList = ref<UploadFileItem[]>([]);
  const projectImplementationPlanFileList = ref<UploadFileItem[]>([]);
  const otherArgumentFileList = ref<UploadFileItem[]>([]);
  const locationGeoJson = ref('');
  const locationFileName = ref('');

  // ── 储备转实施（步骤③）：两附件清单 ──
  const implPlanAdjustmentFileList = ref<UploadFileItem[]>([]);
  const implFundProofFileList = ref<UploadFileItem[]>([]);

  // ── 审查记录（步骤②=第一次审查；步骤③=储备转实施） ──
  const reviewMap = ref<ProjectReviewEntryMap>({});
  const responsibilityReview = ref<ResponsibilityReviewEntry>({
    results: emptyReviewResults(),
    conclusion: '',
    opinion: '',
  });
  const implReviewMap = ref<ImplReviewEntryMap>({});
  const implResponsibilityReview = ref<ImplResponsibilityReviewEntry>({
    results: emptyImplReviewResults(),
    conclusion: '',
    opinion: '',
  });

  /** 联合审查机构（行业主管部门页签）：静态四家中去掉市住更局 */
  const reviewOrgList = computed(() => INDUSTRY_SUPERVISION_DEPT_LIST.filter((org) => org !== '市住更局'));

  /** 提交中（防重复点击） */
  const submitting = ref(false);

  const getTitle = computed(() => {
    if (mode.value === 'view') return `查看 · ${record.value.pj_name ?? ''}`;
    if (mode.value === 'review') return `审核 · ${record.value.pj_name ?? ''}`;
    return record.value.isNewRecord ? '新增项目' : `编辑 · ${record.value.pj_name ?? ''}`;
  });

  /** 已退出项目（退出信息灰条的显隐与步骤条置灰依据） */
  const isExited = computed(() => record.value.library === 'exited');

  /** 退出环节中文名（退出信息灰条展示用） */
  const exitedFromLabel = computed(() =>
    record.value.exited_from
      ? (LIBRARY_LABELS[record.value.exited_from as LibraryKey] ?? record.value.exited_from)
      : '',
  );

  /** 退出附件文件名（exit_files JSON 数组 → 顿号拼接；退出信息灰条展示用） */
  const exitFileNames = computed(() => {
    try {
      const files = record.value.exit_files ? (JSON.parse(record.value.exit_files) as string[]) : [];
      return files.filter(Boolean).join('、');
    } catch {
      return '';
    }
  });

  /** 「填报人再次发起」记录行（transferLogs 的 RESUBMIT 行；业务口径=表单被重新提交时记录一条） */
  const resubmitLogs = computed(() =>
    (detail.value?.transferLogs ?? [])
      .filter((log: TransferLogItem) => log.action === 'RESUBMIT')
      .map((log: TransferLogItem) => ({
        date: toDateStr(log.operateDate) ?? '',
        name: log.operateByName ?? '',
      })),
  );

  // ── 四步流转步骤条（兼页签） ────────────────────────────────────────
  /** 四步流转标题（点击切换内容区：①基本信息 ②审查文件 ③储备转实施 ④流程状态页） */
  const STAGE_TITLES = ['策划库入库', '策划转储备', '储备转实施', '已实施入库'];

  /** 三段生命周期库（已退出项目按「退出环节」映射走过的步骤用） */
  const STAGE_ORDER: LibraryKey[] = ['planning', 'reserve', 'implementing'];

  /**
   * 各库可点亮的步骤（步骤条页签控制）：按项目所处库开放到「进行中」的步骤——
   * 策划库=①②（填报主体填写策划库入库与策划转储备），储备库=①②③（①②只读、
   * ③储备转实施），实施库=①②③④（④已实施入库=流程状态页）；已退出按退出环节
   * 映射；新增视为策划库
   */
  const accessibleStages = computed<number[]>(() => {
    const library = (record.value.library === 'exited' ? record.value.exited_from : record.value.library) ?? 'planning';
    const last = STAGE_ORDER.indexOf(library as LibraryKey);
    const end = (last >= 0 ? last : 0) + 2;
    return Array.from({ length: end }, (_, index) => index);
  });

  /** 步骤页签指针：打开抽屉固定落在步骤①（策划库入库）；退出信息在步骤条上方灰条展示，不走表单 */
  const activeStage = ref(0);

  /** 步骤内容进入方向：切到右侧步骤=自右滑入（stage-left），反向 stage-right */
  const stageSlideName = ref<'stage-left' | 'stage-right'>('stage-left');

  watch(activeStage, (next, prev) => {
    stageSlideName.value = next >= prev ? 'stage-left' : 'stage-right';
  });

  const stepItems = computed<StepItem[]>(() => {
    // 新增态：项目尚未落库，仅步骤①（策划库入库）可进；暂存/提交成功后关抽屉，
    // 再从列表打开即为策划库项目，按 accessibleStages 开放①②
    const disabledOf = (index: number) =>
      record.value.isNewRecord ? index !== 0 : !accessibleStages.value.includes(index);
    // 已退出：整条无强调色（tone=gray），无完成勾，步骤按退出环节开放查看
    if (isExited.value) {
      return STAGE_TITLES.map((title, index) => ({
        title,
        status: 'wait' as const,
        disabled: disabledOf(index),
      }));
    }
    // 在库/新增：当前查看的步骤为强调色，其余正常显示（无完成勾）
    return STAGE_TITLES.map((title, index) => ({
      title,
      status: index === activeStage.value ? ('process' as const) : ('wait' as const),
      disabled: disabledOf(index),
    }));
  });

  // ── 表单工具 ──────────────────────────────────────────────────────────
  /** 时间戳字符串 → 日期段（YYYY-MM-DD） */
  function toDateStr(value?: string | null): string {
    return typeof value === 'string' ? value.slice(0, 10) : '';
  }

  /** 审查文件页签的独立表单（FormGroup 分区 + 插槽承载上传控件） */
  const reviewFormSchemas: FormSchema[] = [
    {
      label: '立项审批或核准备案文件',
      field: 'approvalFileGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '',
      field: 'projectApprovalOrFilingFileList',
      component: 'Input',
      slot: 'projectApprovalOrFilingFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '国土空间规划符合情况',
      field: 'territorialSpacePlanGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否符合国土空间规划',
      field: 'complyTsp',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '是否涉及规划调整',
      field: 'involvePlanAdj',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '',
      field: 'territorialSpacePlanFileList',
      component: 'Input',
      slot: 'territorialSpacePlanFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '项目实施方案',
      field: 'projectImplementationPlanGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '',
      field: 'projectImplementationPlanFileList',
      component: 'Input',
      slot: 'projectImplementationPlanFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '其他论证材料',
      field: 'otherArgumentGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否涉及文物保护',
      field: 'involveCultural',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '是否涉及环境影响评价',
      field: 'involveEia',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '',
      field: 'otherArgumentFileList',
      component: 'Input',
      slot: 'otherArgumentFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '项目红线范围',
      field: 'geoDataGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '',
      field: 'locationGeoJson',
      component: 'Input',
      slot: 'locationGeoJson',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '审查结果',
      field: 'jointReviewGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '',
      field: 'jointReview',
      component: 'Input',
      slot: 'jointReview',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [
    registerReviewForm,
    { setFieldsValue: setReviewFieldsValue, getFieldsValue: getReviewFieldsValue, setProps: setReviewProps },
  ] = useForm({
    labelWidth: 180,
    schemas: reviewFormSchemas,
    baseColProps: { md: 24, lg: 24 },
    showActionButtonGroup: false,
  });

  /** 审查表单是否已挂载（非激活页签懒挂载，首次切到页签才注册） */
  const reviewFormReady = ref(false);

  function handleReviewFormRegister(instance: FormActionType, uuid: string) {
    registerReviewForm(instance, uuid);
    reviewFormReady.value = true;
    applyReviewFormValues();
  }

  /** 储备转实施（步骤③）表单 */
  const implFormSchemas: FormSchema[] = [
    {
      label: '实施条件确认',
      field: 'implConditionGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否具备实施条件',
      field: 'implConditionReady',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '本年度计划完成投资（亿元）',
      field: 'implYearPlanInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入本年度计划完成投资' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '计划开工时间',
      field: 'implPlanStartDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '计划完工时间',
      field: 'implPlanEndDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '规划调整情况',
      field: 'implPlanAdjustGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否涉及规划调整',
      field: 'implInvolvePlanAdjustment',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '是否通过规委会审议',
      field: 'implPassedCommitteeReview',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '',
      field: 'implPlanAdjustmentFileList',
      component: 'Input',
      slot: 'implPlanAdjustmentFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '资金落实情况',
      field: 'implFundGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '是否已落实资金渠道',
      field: 'implFundChannelSettled',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '',
      field: 'implFundProofFileList',
      component: 'Input',
      slot: 'implFundProofFileList',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '审查结果',
      field: 'implJointReviewGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '',
      field: 'implJointReview',
      component: 'Input',
      slot: 'implJointReview',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [
    registerImplForm,
    { setFieldsValue: setImplFieldsValue, getFieldsValue: getImplFieldsValue, setProps: setImplProps },
  ] = useForm({
    labelWidth: 180,
    schemas: implFormSchemas,
    baseColProps: { md: 24, lg: 12 },
    showActionButtonGroup: false,
  });

  /** 储备转实施表单是否已挂载（v-show 面板常驻，注册时序与审查表单同款处理） */
  const implFormReady = ref(false);

  function handleImplFormRegister(instance: FormActionType, uuid: string) {
    registerImplForm(instance, uuid);
    implFormReady.value = true;
    applyImplFormValues();
  }

  // ── 详情回填 ───────────────────────────────────────────────────────
  /** 详情联查行 → 步骤②是否结论字段 */
  function applyReviewFormValues(row?: Recordable) {
    const source = row ?? record.value;
    setReviewFieldsValue({
      complyTsp: source.comply_tsp ?? '',
      involvePlanAdj: source.involve_plan_adj ?? '',
      involveCultural: source.involve_cultural ?? '',
      involveEia: source.involve_eia ?? '',
    });
  }

  /** 详情联查行 → 步骤③申报字段 */
  function applyImplFormValues(row?: Recordable) {
    const source = row ?? record.value;
    setImplFieldsValue({
      implConditionReady: source.impl_condition_ready ?? '',
      implYearPlanInvest: source.year_invest,
      implPlanStartDate: toDateStr(source.start_date) || undefined,
      implPlanEndDate: toDateStr(source.end_date) || undefined,
      implInvolvePlanAdjustment: source.impl_involve_plan_adj ?? '',
      implPassedCommitteeReview: source.impl_passed_committee ?? '',
      implFundChannelSettled: source.impl_fund_settled ?? '',
    });
  }

  /** 详情联查行 → 文件清单/地理数据 refs */
  function applyFileRefs(row: Recordable) {
    approvalOrFilingFileList.value = toUploadItems(fileListNames(parseFileList(row.approval_filing_files)));
    territorialSpacePlanFileList.value = toUploadItems(fileListNames(parseFileList(row.tsp_files)));
    projectImplementationPlanFileList.value = toUploadItems(fileListNames(parseFileList(row.impl_plan_files)));
    otherArgumentFileList.value = toUploadItems(fileListNames(parseFileList(row.other_arg_files)));
    implPlanAdjustmentFileList.value = toUploadItems(fileListNames(parseFileList(row.impl_plan_adj_files)));
    implFundProofFileList.value = toUploadItems(fileListNames(parseFileList(row.impl_fund_proof_files)));
    locationGeoJson.value = row.geo_json ?? '';
    locationFileName.value = row.geo_file_name ?? '';
  }

  function toUploadItems(names: string[]): UploadFileItem[] {
    return names.map((name, index) => ({ uid: `${index}-${name}`, name }));
  }

  /** 详情 reviews → 两套审查记录 refs（fromEntries 只能给宽索引签名，显式断言收敛） */
  function applyReviews(data: LibDetail) {
    const stage2 = data.reviews?.['2'];
    const stage3 = data.reviews?.['3'];
    reviewMap.value = Object.fromEntries(
      Object.entries(stage2?.joint ?? {}).map(([org, entry]) => [
        org,
        {
          results: { ...emptyReviewResults(), ...(entry.results as Recordable) },
          opinion: entry.opinion ?? '',
          fileList: fileListNames(entry.fileList),
        },
      ]),
    ) as ProjectReviewEntryMap;
    responsibilityReview.value = {
      results: { ...emptyReviewResults(), ...((stage2?.resp?.results as Recordable) ?? {}) },
      conclusion: (stage2?.resp?.conclusion as ResponsibilityConclusion | '') ?? '',
      opinion: stage2?.resp?.opinion ?? '',
      fileList: fileListNames(stage2?.resp?.fileList),
    };
    implReviewMap.value = Object.fromEntries(
      Object.entries(stage3?.joint ?? {}).map(([org, entry]) => [
        org,
        {
          results: { ...emptyImplReviewResults(), ...(entry.results as Recordable) },
          opinion: entry.opinion ?? '',
          fileList: fileListNames(entry.fileList),
        },
      ]),
    ) as ImplReviewEntryMap;
    implResponsibilityReview.value = {
      results: { ...emptyImplReviewResults(), ...((stage3?.resp?.results as Recordable) ?? {}) },
      conclusion: (stage3?.resp?.conclusion as ResponsibilityConclusion | '') ?? '',
      opinion: stage3?.resp?.opinion ?? '',
      fileList: fileListNames(stage3?.resp?.fileList),
    };
  }

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    basicFormRef.value?.resetFields();
    mode.value = (data?.mode as FormMode) ?? 'edit';
    record.value = data || {};
    record.value.isNewRecord = data?.isNewRecord ?? !data?.p_uid;
    detail.value = null;

    // 已有项目：详情接口回填（联查列 + subjects + reviews + transferLogs）
    if (!record.value.isNewRecord) {
      detail.value = await fetchLibDetail(record.value.p_uid);
      record.value = { ...record.value, ...detail.value };
    }
    const row = record.value;
    // 转储备库后身份字段锁定（策划库内可编辑；新增视为策划库可编辑）
    identityLocked.value = !record.value.isNewRecord && row.library !== 'planning';
    applyFileRefs(row);
    if (detail.value) applyReviews(detail.value);
    if (reviewFormReady.value) applyReviewFormValues(row);
    if (implFormReady.value) applyImplFormValues(row);
    // 步骤页签固定落步骤①；退出信息在步骤条上方灰条展示，不走表单
    activeStage.value = 0;
    const subjects = (row.subjects ?? {}) as {
      industryDepts?: { code: string; name: string }[];
      responsibleDept?: { code: string; name: string } | null;
      reportOrg?: { refType: string; code: string; name: string } | null;
    };
    await basicFormRef.value?.setFieldsValue({
      projectCode: row.lib_project_code ?? '',
      inLibraryDate: toDateStr(row.in_library_date),
      projectName: row.pj_name ?? '',
      projectApprovalCode: row.project_approval_code ?? '',
      district: row.dist ?? '',
      projectAffiliation: row.project_affiliation ?? '',
      renewalAreaName: row.area_name ?? '',
      functionOrientationList: splitList(row.func_type_name),
      renewalAreaBatch: row.batch ?? '',
      fiveReformType: row.wg_big ?? '',
      fiveReformSubType: row.wg_sub ?? '',
      sixBringTypeList: splitList(row.six_bring_type_list),
      mainConstructionContent: row.content ?? '',
      constructionSite: row.construction_site ?? '',
      totalInvestEstimate: undefined,
      investEstimate: row.inv_bil == null || row.inv_bil === '' ? undefined : Number(row.inv_bil),
      fundSourceList: splitList(row.fund_src),
      fundSituationRemark: row.fund_situation_remark ?? '',
      industrySupervisionDeptList: (subjects.industryDepts ?? []).map((item) => item.code),
      responsibleDept: subjects.responsibleDept?.code ?? '',
      coordinateOrg: row.coordinate_org_list ?? '',
      implementOrg: row.implement_org_list ?? '',
      reportOrg: subjects.reportOrg ? `${subjects.reportOrg.refType}:${subjects.reportOrg.code}` : '',
      reportPerson: row.report_person ?? '',
      reportPhone: row.report_phone ?? '',
      remarks: row.remarks ?? '',
    });
    // 步骤①只读随组件 props（disabled/identityLocked）；审查块独立控制
    setReviewProps({ disabled: formDisabled.value });
    setImplProps({ disabled: implDisabled.value });
    setDrawerProps({ loading: false });
  });

  // ── 组装提交 ───────────────────────────────────────────────────────
  /** 步骤①表单值 → save.base 组（主体字段：行业主管部门/责任部门→{code,name} 数组，
   *  指定填报主体→{refType,code,name}；统筹/实施主体为单值字符串） */
  function buildBase(values: Recordable): Recordable {
    const { industryDeptOptionMap, reportOrgOptionMap } = basicFormRef.value?.getOptionMaps() ?? {
      industryDeptOptionMap: new Map<string, string>(),
      reportOrgOptionMap: new Map<string, { refType: string; code: string; name: string }>(),
    };
    const industryDeptOf = (code: string) => ({
      code,
      name: industryDeptOptionMap.get(code) ?? code,
    });
    const reportOrgValue = values.reportOrg as string | undefined;
    const reportOrg = reportOrgValue ? reportOrgOptionMap.get(reportOrgValue) : undefined;
    return {
      projectName: values.projectName,
      projectApprovalCode: values.projectApprovalCode ?? '',
      district: values.district,
      projectAffiliation: values.projectAffiliation,
      renewalAreaName: values.renewalAreaName ?? '',
      areaUid: '',
      renewalAreaBatch: values.renewalAreaBatch ?? '',
      functionOrientations: (values.functionOrientationList ?? []).join('、'),
      fiveReformType: values.fiveReformType ?? '',
      fiveReformSubType: values.fiveReformSubType ?? '',
      sixBringTypes: (values.sixBringTypeList ?? []).join(','),
      constructionSite: values.constructionSite ?? '',
      mainConstructionContent: values.mainConstructionContent,
      investEstimate: values.investEstimate,
      fundSources: (values.fundSourceList ?? []).join(','),
      fundSituationRemark: values.fundSituationRemark ?? '',
      industryDepts: (values.industrySupervisionDeptList ?? []).map(industryDeptOf),
      responsibleDept: values.responsibleDept ? industryDeptOf(values.responsibleDept) : null,
      coordinateOrg: values.coordinateOrg ?? '',
      implementOrg: values.implementOrg ?? '',
      reportOrg: reportOrg ?? null,
      reportPerson: values.reportPerson ?? '',
      reportPhone: values.reportPhone ?? '',
      remarks: values.remarks ?? '',
    };
  }

  /** 文件清单 refs + 步骤②表单值 → save.reviewFiles 组 */
  function buildReviewFiles(): Recordable {
    const values = reviewFormReady.value ? getReviewFieldsValue() : {};
    return {
      approvalFilingFiles: serializeFileList(fileListNames(approvalOrFilingFileList.value)),
      complyTsp: values.complyTsp ?? '',
      involvePlanAdj: values.involvePlanAdj ?? '',
      tspFiles: serializeFileList(fileListNames(territorialSpacePlanFileList.value)),
      implPlanFiles: serializeFileList(fileListNames(projectImplementationPlanFileList.value)),
      involveCultural: values.involveCultural ?? '',
      involveEia: values.involveEia ?? '',
      otherArgFiles: serializeFileList(fileListNames(otherArgumentFileList.value)),
      geoJson: locationGeoJson.value || null,
      geoFileName: locationFileName.value || null,
    };
  }

  /** 步骤③表单值 + 附件 refs → save.impl 组（后端同步写主表三字段） */
  function buildImpl(): Recordable {
    const values = implFormReady.value ? getImplFieldsValue() : {};
    return {
      conditionReady: values.implConditionReady ?? '',
      yearPlanInvest: values.implYearPlanInvest,
      planStartDate: values.implPlanStartDate ?? '',
      planEndDate: values.implPlanEndDate ?? '',
      involvePlanAdj: values.implInvolvePlanAdjustment ?? '',
      passedCommitteeReview: values.implPassedCommitteeReview ?? '',
      planAdjustmentFiles: serializeFileList(fileListNames(implPlanAdjustmentFileList.value)),
      fundChannelSettled: values.implFundChannelSettled ?? '',
      fundProofFiles: serializeFileList(fileListNames(implFundProofFileList.value)),
    };
  }

  /** 校验基本信息表单；未通过时提示并返回 undefined */
  async function validateOrNotify(): Promise<Recordable | undefined> {
    try {
      return await basicFormRef.value?.validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return undefined;
    }
  }

  /** 组装保存请求：新建/策划库三组齐交；储备库（及以上）更新只提交 impl 组（后端按组校验可编辑库） */
  function buildSaveReq(values: Recordable) {
    const planningScope = record.value.isNewRecord || record.value.library === 'planning';
    return {
      pUid: record.value.isNewRecord ? null : record.value.p_uid,
      base: planningScope ? buildBase(values) : null,
      reviewFiles: planningScope ? buildReviewFiles() : null,
      impl: buildImpl(),
    };
  }

  /** 暂存：校验通过 → save 接口（新建/更新合一）→ 关抽屉刷新 */
  async function handleSaveDraft() {
    const values = await validateOrNotify();
    if (values === undefined) return;
    submitting.value = true;
    try {
      await saveLibProject(buildSaveReq(values));
      showMessage('暂存成功');
      closeDrawer();
      emit('success', {});
    } finally {
      submitting.value = false;
    }
  }

  /** 提交（新增态）/申请转库（已有项目）：先过表单校验，再二次确认；
   *  确认后 save + apply（轮次+1 → 审核中） */
  async function handleApplyTransfer() {
    const isNew = record.value.isNewRecord;
    const values = await validateOrNotify();
    if (values === undefined) return;
    Modal.confirm({
      title: isNew ? '提交' : '申请转库',
      content: isNew
        ? '提交后项目将进入「审核中」，由行业主管部门与责任部门审核，确认提交吗？'
        : '申请后项目将进入「审核中」，由行业主管部门与责任部门审核，确认申请吗？',
      okText: isNew ? '确认提交' : '确认申请',
      cancelText: '取消',
      onOk: async () => {
        submitting.value = true;
        try {
          const saved = await saveLibProject(buildSaveReq(values));
          await applyLibTransfer(saved.pUid);
          showMessage(isNew ? '已提交，项目进入审核中' : '已申请转库，项目进入审核中');
          closeDrawer();
          emit('success', {});
        } finally {
          submitting.value = false;
        }
      },
    });
  }

  /**
   * 保存审查（review 模式页脚）：两个 stage 各提交一次；责任部门结论（pass/reject）
   * 只随当前库对应的 stage 提交以推进状态——策划库轮次=步骤②、储备库轮次=步骤③，
   * 另一 stage 的 conclusion 置空（仅存审查记录，不推进）
   */
  async function handleSaveReview() {
    if (!record.value.p_uid) return;
    const conclusionStage = record.value.library === 'reserve' ? '3' : '2';
    submitting.value = true;
    try {
      const buildReq = (stage: string) => {
        const withConclusion = stage === conclusionStage;
        return stage === '2'
          ? {
              pUid: record.value.p_uid,
              stage,
              jointReviews: Object.entries(reviewMap.value).map(([orgName, entry]) => ({
                orgName,
                results: entry.results,
                opinion: entry.opinion ?? '',
                fileList: serializeFileList(entry.fileList),
              })),
              respReview: {
                results: responsibilityReview.value.results,
                conclusion: withConclusion ? (responsibilityReview.value.conclusion ?? '') : '',
                opinion: responsibilityReview.value.opinion ?? '',
                fileList: serializeFileList(responsibilityReview.value.fileList),
              },
            }
          : {
              pUid: record.value.p_uid,
              stage,
              jointReviews: Object.entries(implReviewMap.value).map(([orgName, entry]) => ({
                orgName,
                results: entry.results,
                opinion: entry.opinion ?? '',
                fileList: serializeFileList(entry.fileList),
              })),
              respReview: {
                results: implResponsibilityReview.value.results,
                conclusion: withConclusion ? (implResponsibilityReview.value.conclusion ?? '') : '',
                opinion: implResponsibilityReview.value.opinion ?? '',
                fileList: serializeFileList(implResponsibilityReview.value.fileList),
              },
            };
      };
      await saveLibReview(buildReq('2'));
      await saveLibReview(buildReq('3'));
      showMessage('审查已保存');
      closeDrawer();
      emit('success', {});
    } finally {
      submitting.value = false;
    }
  }
</script>
<style>
  /* 四步内容切换（Stepper 兼页签）：v-show 瞬时切走旧面板，新面板方向性滑入。
     只写 enter 类（无 leave 动画）——两块 BasicForm 常驻不销毁，避免滑动期间双表单并存跳动 */
  .stage-left-enter-active,
  .stage-right-enter-active {
    transition:
      transform 0.24s ease,
      opacity 0.24s ease;
  }

  .stage-left-enter-from {
    transform: translateX(24px);
    opacity: 0;
  }

  .stage-right-enter-from {
    transform: translateX(-24px);
    opacity: 0;
  }
</style>
