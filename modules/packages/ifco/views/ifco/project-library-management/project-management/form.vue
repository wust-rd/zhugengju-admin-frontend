<!--
  ifco —— 在库项目管理（查看 / 新增 / 编辑 一体表单抽屉）

  组件格式对齐 urban-health-check/shared/indicator-system/form.vue：
   - BasicDrawer + useDrawerInner + BasicForm（FormSchema）；
   - 查看/编辑一体：查看=表单 disabled（setProps），不使用 Description；
   - BasicDrawer 加 force-render 消除首次打开的懒挂载；抽屉级 showFooter 由
     list.vue 在打开前经 setDrawerProps 设置（硬性规则，动画中翻转会首击不弹）。

  抽屉标题 = 查看/新增/编辑 · 项目名 + 当前项目状态 Tag（已退出=灰实心、
  已提交=蓝实心、待办=蓝描边）。已退出项目在步骤条上方以 bg-gray-100 灰条
  只读展示 退出环节/退出时间/退出原因（不占表单分区）。
  四步流转步骤条（@jeesite/ui 的 Stepper 兼页签：策划库入库→策划转储备→
  储备转实施→已实施入库；已退出整条置灰；打开抽屉固定落步骤①）：
  ① 策划库入库 = 基本信息表单；② 策划转储备 = 审查文件表单（六 FormGroup 分区：
  立项审批或核准备案文件/国土空间规划符合情况/项目实施方案/其他论证材料/
  项目红线范围/审查结果，插槽承载 Upload 与 ReviewBlock，核对清单=五材料分区）；③ 储备转实施 =
  实施条件确认/规划调整情况/资金落实情况（impl 前缀字段组）+ 审查结果（核对清单=实施三分区）；
  ④ 已实施入库 暂空白。
  步骤切换内容进入方向滑动（v-show 不销毁表单，切换不丢填写中间态）。

  字段契约（api/ifco/project-library，2026-09-09 字段表）：
   - 分区：项目基本信息（入库时间在项目编号下方、备注在主要建设内容后）/ 投资与资金 /
     主体信息；项目编号/入库时间为系统自动生成字段（只读 + 右侧小字提示，无独立「其他」节）；
   - 片区联动：项目归属=市级更新片区内 → 片区下拉取前期规划已入库片区，
     选中带出 片区批次/功能定位（带出后不可改）；区级 → 区级片区清单；
     片区外零星 → 不显示片区三件套；
   - 五改细分类别按五改类别级联；指定填报主体选项=已选实施主体；
   - 编辑权限（业务规则）：「不可修改」清单字段仅策划库可编辑，转储备库后锁定
     （identityLocked）；自动字段（项目编号/总体投资估算/入库时间/带出两字段）恒只读。

  当前后端尚未介入：保存仅做表单校验后关闭抽屉。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <span>{{ getTitle }}</span>
      <Tag v-if="record.status" v-bind="statusTagProps(record.status)" style="border-radius: 10px" class="ml-2">
        {{ record.status }}
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
        <span class="text-gray-500">退出时间：</span>
        <span class="ml-4px text-gray-800">{{ record.exitDate || '/' }}</span>
      </span>
      <span>
        <span class="text-gray-500">退出原因：</span>
        <span class="ml-4px text-gray-800">{{ record.exitReason || '/' }}</span>
      </span>
    </div>

    <!-- 四步流转步骤条（兼页签：点击切换内容区；已退出整条置灰） -->
    <Stepper v-model:active="activeStage" :steps="stepItems" :tone="isExited ? 'gray' : 'blue'" class="mb-16px" />

    <!-- 步骤内容（Stepper 兼页签，切换进入方向滑动）：
         ① 策划库入库=基本信息表单；② 策划转储备=审查文件表单；③④ 暂空白。
         v-show 不销毁表单（切换步骤不丢填写中间态） -->
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 0">
        <BasicForm @register="registerForm">
          <!-- 系统自动生成字段：只读输入框 + 右侧小字提示 -->
          <template #projectCode="{ model, field }">
            <div class="flex w-full items-center gap-8px">
              <Input :value="model[field]" disabled placeholder="入库后自动生成" class="flex-1" />
              <span class="shrink-0 text-12px text-gray-400">该字段为系统自动生成</span>
            </div>
          </template>
          <template #inLibraryDate="{ model, field }">
            <div class="flex w-full items-center gap-8px">
              <Input :value="model[field]" disabled placeholder="入库后自动生成" class="flex-1" />
              <span class="shrink-0 text-12px text-gray-400">该字段为系统自动生成</span>
            </div>
          </template>
        </BasicForm>
      </div>
    </Transition>
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 1">
        <BasicForm @register="handleReviewFormRegister">
          <!-- 立项审批或核准备案文件：提示行 + 图标按钮上传（多文件不限量，before-upload 拦截，假数据阶段） -->
          <template #projectApprovalOrFilingFileList>
            <div class="text-14px text-black mb-4">政府投资项目上传立项审批文件，企业投资项目请上传核准或备案文件</div>
            <Upload
              v-if="!isView"
              v-model:file-list="approvalOrFilingFileList"
              class="mt-8px"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
              v-if="!isView"
              v-model:file-list="territorialSpacePlanFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
              v-if="!isView"
              v-model:file-list="projectImplementationPlanFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
              v-if="!isView"
              v-model:file-list="otherArgumentFileList"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
          <!-- 地理数据：上传 shp/dwg 解析渲染 + geoman 地图编辑 -->
          <template #locationGeoJson>
            <GeoDataSection
              v-model:geo-json="locationGeoJson"
              v-model:file-name="locationFileName"
              :parse-file="parseGeoLocationFile"
              :geometry-types="['polygon']"
              :disabled="isView"
            />
          </template>
          <!-- 联合审查机构审查（第一次审查）：行业主管部门（切换）+ 责任部门（市住更局） -->
          <template #jointReview>
            <ReviewBlock
              v-model:entries="reviewMap"
              v-model:responsibility="responsibilityReview"
              :sections="REVIEW_SECTIONS"
              :org-list="reviewOrgList"
              :disabled="isView"
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
              v-if="!isView"
              v-model:file-list="implPlanAdjustmentFileList"
              class="mt-8px"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
              v-if="!isView"
              v-model:file-list="implFundProofFileList"
              class="mt-8px"
              multiple
              :before-upload="() => false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <!-- 查看态：只读文件清单 -->
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
          <!-- 审查结果（储备转实施）：行业主管部门（切换）+ 责任部门（市住更局），核对清单=本步骤三分区 -->
          <template #implJointReview>
            <ReviewBlock
              v-model:entries="implReviewMap"
              v-model:responsibility="implResponsibilityReview"
              :sections="IMPL_REVIEW_SECTIONS"
              :org-list="reviewOrgList"
              :disabled="isView"
            />
          </template>
        </BasicForm>
      </div>
    </Transition>
    <!-- 步骤④：已实施入库（暂空白页） -->
    <Transition :name="stageSlideName">
      <div v-show="activeStage === 3"></div>
    </Transition>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementForm">
  import { computed, ref, watch } from 'vue';
  import { Input, Tag, Upload } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { Button } from '@jeesite/core/components/Button';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import { match } from 'ts-pattern';
  import {
    CITY_RENEWAL_AREA_LIST,
    DISTRICTS,
    DISTRICT_RENEWAL_AREA_LIST,
    FIVE_REFORM_SUB_TYPE_MAP,
    FIVE_REFORM_TYPE_OPTIONS,
    FUND_SOURCE_OPTIONS,
    FUNCTION_ORIENTATION_OPTIONS,
    IMPLEMENT_ORG_LIST,
    INDUSTRY_SUPERVISION_DEPT_LIST,
    LIBRARY_LABELS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
    RENEWAL_AREA_BATCH_LABEL,
    RESPONSIBLE_DEPT_LIST,
    COORDINATE_ORG_LIST,
    IMPL_REVIEW_SECTIONS,
    REVIEW_SECTIONS,
    SIX_BRING_TYPE_OPTIONS,
    emptyImplReviewResults,
    emptyReviewResults,
    parseGeoLocationFile,
    statusTagProps,
    YES_NO_OPTIONS,
    type ImplResponsibilityReviewEntry,
    type ImplReviewEntryMap,
    type LibraryKey,
    type ProjectAffiliation,
    type ProjectLibraryItem,
    type ProjectReviewEntryMap,
    type ResponsibilityReviewEntry,
  } from '@jeesite/ifco/api/ifco/project-library';
  import { GeoDataSection } from '@jeesite/shared/components/geo-data-section';
  import ReviewBlock from './review-block';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<ProjectLibraryItem & { isNewRecord?: boolean }>({} as ProjectLibraryItem);

  /** 编辑权限：项目转到储备库及之后，「不可修改」清单字段锁定（策划库内可编辑） */
  const identityLocked = ref(false);

  /** 当前项目归属（条件必填/片区联动用；随表单选择实时更新） */
  const currentAffiliation = ref<ProjectAffiliation | ''>('');

  /** 当前已选实施主体（指定填报主体的选项来源与必填校验；随表单选择实时更新） */
  const currentImplementOrgList = ref<string[]>([]);

  // ── 审查文件页签：立项审批或核准备案文件（多文件不限量，仅记录文件名） ──
  type UploadFileItem = { uid: string; name: string };

  const approvalOrFilingFileList = ref<UploadFileItem[]>([]);

  // ── 审查文件页签：国土空间规划相关文件（多文件不限量，仅记录文件名） ──
  const territorialSpacePlanFileList = ref<UploadFileItem[]>([]);

  // ── 审查文件页签：项目实施方案文件（多文件不限量，仅记录文件名） ──
  const projectImplementationPlanFileList = ref<UploadFileItem[]>([]);

  // ── 审查文件页签：其他论证材料附件（多文件不限量，仅记录文件名） ──
  const otherArgumentFileList = ref<UploadFileItem[]>([]);

  // ── 审查文件页签：地理数据（GeoJSON + 源文件名） ──
  const locationGeoJson = ref('');
  const locationFileName = ref('');

  // ── 储备转实施（步骤③）：规划调整附件（多文件不限量，仅记录文件名） ──
  const implPlanAdjustmentFileList = ref<UploadFileItem[]>([]);

  // ── 储备转实施（步骤③）：资金落实附件（多文件不限量，仅记录文件名） ──
  const implFundProofFileList = ref<UploadFileItem[]>([]);

  // ── 审查文件页签：联合审查机构审查（第一次审查，机构→五区块结论+意见+附件） ──
  const reviewMap = ref<ProjectReviewEntryMap>({});

  // ── 审查文件页签：责任部门（市住更局）审查（第一次审查） ──
  const responsibilityReview = ref<ResponsibilityReviewEntry>({
    results: emptyReviewResults(),
    conclusion: '',
    opinion: '',
  });

  // ── 储备转实施（步骤③）：联合审查与责任部门审查 ──
  const implReviewMap = ref<ImplReviewEntryMap>({});

  const implResponsibilityReview = ref<ImplResponsibilityReviewEntry>({
    results: emptyImplReviewResults(),
    conclusion: '',
    opinion: '',
  });

  /** 联合审查机构（行业主管部门页签）：固定四家中去掉市住更局（后端接入后换接口） */
  const reviewOrgList = computed(() => INDUSTRY_SUPERVISION_DEPT_LIST.filter((org) => org !== '市住更局'));

  const getTitle = computed(() => {
    if (isView.value) return `查看 · ${record.value.projectName ?? ''}`;
    return record.value.isNewRecord ? '新增项目' : `编辑 · ${record.value.projectName ?? ''}`;
  });

  /** 已退出项目（退出信息灰条的显隐与步骤条置灰依据） */
  const isExited = computed(() => record.value.library === 'exited');

  /** 退出环节中文名（退出信息灰条展示用） */
  const exitedFromLabel = computed(() => (record.value.exitedFrom ? LIBRARY_LABELS[record.value.exitedFrom] : ''));

  // ── 四步流转步骤条（兼页签） ────────────────────────────────────────
  /** 四步流转标题（点击切换内容区：①基本信息 ②审查文件 ③④空白） */
  const STAGE_TITLES = ['策划库入库', '策划转储备', '储备转实施', '已实施入库'];

  /** 三段生命周期库（已退出项目按「退出环节」映射走过的步骤用） */
  const STAGE_ORDER: LibraryKey[] = ['planning', 'reserve', 'implementing'];

  /** 步骤页签指针：打开抽屉固定落在步骤①（策划库入库） */
  const activeStage = ref(0);

  /** 步骤内容进入方向：切到右侧步骤=自右滑入（stage-left），反向 stage-right */
  const stageSlideName = ref<'stage-left' | 'stage-right'>('stage-left');

  watch(activeStage, (next, prev) => {
    stageSlideName.value = next >= prev ? 'stage-left' : 'stage-right';
  });

  const stepItems = computed<StepItem[]>(() => {
    // 已退出：如实表达走过的步骤（退出前所处库之前的=灰勾、其余灰数字），整条无强调色
    if (isExited.value) {
      const exitIndex = STAGE_ORDER.indexOf(record.value.exitedFrom ?? 'implementing');
      return STAGE_TITLES.map((title, index) => ({
        title,
        status: index < exitIndex ? ('finish' as const) : ('wait' as const),
      }));
    }
    // 在库/新增：当前查看的步骤为强调色，之前的常规完成态，之后的灰色
    return STAGE_TITLES.map((title, index) => ({
      title,
      status:
        index === activeStage.value
          ? ('process' as const)
          : index < activeStage.value
            ? ('finish' as const)
            : ('wait' as const),
    }));
  });

  // ── 表单 ────────────────────────────────────────────────────────────
  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));

  function toOptions(list: readonly string[]) {
    return list.map((name) => ({ label: name, value: name }));
  }

  /** 片区名称三件套显隐：市级/区级片区内显示，片区外零星隐藏
   *  （exhaustive：项目归属新增种类漏处理时编译报错） */
  function showRenewalAreaFields(affiliation: ProjectAffiliation | ''): boolean {
    return match(affiliation)
      .with('city-area', 'district-area', () => true)
      .with('scattered', '', () => false)
      .exhaustive();
  }

  /** 片区名称下拉选项：市级=前期规划已入库片区，区级/零星=区级片区清单 */
  function renewalAreaNameOptions(affiliation: ProjectAffiliation | ''): string[] {
    return match(affiliation)
      .with('city-area', () => CITY_RENEWAL_AREA_LIST.map((area) => area.name))
      .with('district-area', 'scattered', '', () => DISTRICT_RENEWAL_AREA_LIST)
      .exhaustive();
  }

  /** 市级更新片区内必填（否则不必填）的分情况校验 */
  function requiredWhenCityArea(message: string) {
    return {
      validator: (_rule: unknown, value: unknown) => {
        const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
        if (currentAffiliation.value === 'city-area' && empty) return Promise.reject(message);
        return Promise.resolve();
      },
    };
  }

  /** 选市级片区后带出 片区批次/功能定位（带出后不可改）；切归属时清空片区三件套 */
  function handleRenewalAreaChange(value: unknown) {
    const area = CITY_RENEWAL_AREA_LIST.find((item) => item.name === value);
    setFieldsValue({
      renewalAreaBatch: area?.batch ?? '',
      functionOrientationList: area ? [...area.orientationList] : [],
    });
  }

  function handleAffiliationChange(value: unknown) {
    currentAffiliation.value = (value as ProjectAffiliation) ?? '';
    setFieldsValue({ renewalAreaName: '', renewalAreaBatch: '', functionOrientationList: [] });
  }

  /** 实施主体变化：同步选项来源，并把已不在清单内的指定填报主体清掉 */
  function handleImplementOrgListChange(value: unknown) {
    currentImplementOrgList.value = (value as string[]) ?? [];
    if (!currentImplementOrgList.value.length) {
      setFieldsValue({ reportOrg: '' });
    }
  }

  const inputFormSchemas: FormSchema[] = [
    // ── 项目基本信息 ──────────────────────────────────────────────────
    {
      label: '项目基本信息',
      field: 'basicInfoGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '项目编号',
      field: 'projectCode',
      component: 'Input',
      slot: 'projectCode',
    },
    {
      label: '入库时间',
      field: 'inLibraryDate',
      component: 'Input',
      slot: 'inLibraryDate',
    },
    {
      label: '项目名称',
      field: 'projectName',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入项目名称' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入项目名称' }],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '项目代码',
      field: 'projectApprovalCode',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '发改委审核备案后赋码' },
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '行政区',
      field: 'district',
      component: 'Select' as const,
      componentProps: { options: districtOptions, allowClear: true, placeholder: '请选择行政区' },
      rules: [{ required: true, message: '请选择行政区' }],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '项目归属',
      field: 'projectAffiliation',
      component: 'Select' as const,
      componentProps: {
        options: [...PROJECT_AFFILIATION_OPTIONS],
        allowClear: true,
        placeholder: '请选择项目归属',
        onChange: handleAffiliationChange,
      },
      rules: [{ required: true, message: '请选择项目归属' }],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '片区名称',
      field: 'renewalAreaName',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions(renewalAreaNameOptions(formModel.projectAffiliation ?? '')),
        allowClear: true,
        placeholder: '请选择片区',
        onChange: handleRenewalAreaChange,
      }),
      ifShow: ({ values }) => showRenewalAreaFields(values.projectAffiliation ?? ''),
      rules: [requiredWhenCityArea('市级更新片区内项目必选片区名称')],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '片区功能定位',
      field: 'functionOrientationList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: [...FUNCTION_ORIENTATION_OPTIONS],
        placeholder: '选择片区后自动带出',
      },
      ifShow: ({ values }) => values.projectAffiliation === 'city-area',
      dynamicDisabled: () => true,
    },
    {
      label: '片区批次',
      field: 'renewalAreaBatch',
      component: 'Select' as const,
      componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], placeholder: '选择片区后自动带出' },
      ifShow: ({ values }) => values.projectAffiliation === 'city-area',
      dynamicDisabled: () => true,
    },
    {
      label: '五改类别',
      field: 'fiveReformType',
      component: 'Select' as const,
      componentProps: { options: [...FIVE_REFORM_TYPE_OPTIONS], allowClear: true, placeholder: '请选择五改类别' },
      rules: [requiredWhenCityArea('市级更新片区内项目必选五改类别')],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '五改细分类别',
      field: 'fiveReformSubType',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions(FIVE_REFORM_SUB_TYPE_MAP[formModel.fiveReformType ?? ''] ?? []),
        allowClear: true,
        placeholder: '请选择五改细分类别',
      }),
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '六带类型',
      field: 'sixBringTypeList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: toOptions(SIX_BRING_TYPE_OPTIONS),
        allowClear: true,
        placeholder: '请选择六带类型',
      },
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '建设地点',
      field: 'constructionSite',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入建设地点' },
    },
    {
      label: '主要建设内容',
      field: 'mainConstructionContent',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3, placeholder: '请输入主要建设内容' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入主要建设内容' }],
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 2, placeholder: '请输入备注' },
      colProps: { md: 24, lg: 24 },
    },
    // ── 投资与资金 ────────────────────────────────────────────────────
    {
      label: '投资与资金',
      field: 'investFundGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '总体投资估算(亿元)',
      field: 'totalInvestEstimate',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '片区项目投资合计，自动计算' },
      dynamicDisabled: () => true,
    },
    {
      label: '项目投资估算(亿元)',
      field: 'investEstimate',
      component: 'InputNumber',
      componentProps: { precision: 4, min: 0, style: 'width: 100%', placeholder: '请输入项目投资估算' },
      rules: [{ required: true, message: '请输入项目投资估算' }],
    },
    {
      label: '资金来源',
      field: 'fundSourceList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: FUND_SOURCE_OPTIONS,
        allowClear: true,
        placeholder: '请选择资金来源',
      },
      rules: [{ required: true, message: '请选择资金来源' }],
    },
    {
      label: '资金情况备注说明',
      field: 'fundSituationRemark',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 2, placeholder: '请输入资金情况备注说明' },
      colProps: { md: 24, lg: 24 },
    },
    // ── 主体信息 ──────────────────────────────────────────────────────
    {
      label: '主体信息',
      field: 'orgGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '行业主管部门',
      field: 'industrySupervisionDeptList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: toOptions(INDUSTRY_SUPERVISION_DEPT_LIST),
        allowClear: true,
        placeholder: '请选择行业主管部门',
      },
      rules: [{ required: true, message: '请选择行业主管部门' }],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '责任部门',
      field: 'responsibleDept',
      component: 'Select' as const,
      componentProps: { options: toOptions(RESPONSIBLE_DEPT_LIST), allowClear: true, placeholder: '请选择责任部门' },
      rules: [{ required: true, message: '请选择责任部门' }],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '统筹主体',
      field: 'coordinateOrgList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: toOptions(COORDINATE_ORG_LIST),
        allowClear: true,
        placeholder: '请选择统筹主体',
      },
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '实施主体',
      field: 'implementOrgList',
      component: 'Select' as const,
      componentProps: {
        mode: 'multiple',
        options: toOptions(IMPLEMENT_ORG_LIST),
        allowClear: true,
        placeholder: '请选择实施主体',
        onChange: handleImplementOrgListChange,
      },
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '指定填报主体',
      field: 'reportOrg',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions((formModel.implementOrgList as string[]) ?? []),
        allowClear: true,
        placeholder: '从已选实施主体中指定',
      }),
      rules: [
        {
          validator: (_rule: unknown, value: unknown) =>
            currentImplementOrgList.value.length > 0 && !value
              ? Promise.reject('存在实施主体时必选指定填报主体')
              : Promise.resolve(),
        },
      ],
      dynamicDisabled: () => identityLocked.value,
    },
    {
      label: '填报人',
      field: 'reportPerson',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入填报人' },
    },
    {
      label: '联系方式',
      field: 'reportPhone',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '请输入联系方式' },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 150,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  /** 审查文件页签的独立表单（FormGroup 分区 + 插槽承载上传控件；后续审查字段在此扩展） */
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
      field: 'complyTerritorialSpacePlan',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '是否涉及规划调整',
      field: 'involvePlanAdjustment',
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
      field: 'involveCulturalRelicProtection',
      component: 'Select' as const,
      componentProps: { options: YES_NO_OPTIONS, allowClear: true, placeholder: '请选择' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '是否涉及环境影响评价',
      field: 'involveEnvironmentalImpactAssessment',
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

  const [registerReviewForm, { setFieldsValue: setReviewFieldsValue }] = useForm({
    labelWidth: 180,
    schemas: reviewFormSchemas,
    baseColProps: { md: 24, lg: 24 },
    showActionButtonGroup: false,
  });

  /** 审查表单是否已挂载（非激活页签懒挂载，首次切到页签才注册） */
  const reviewFormReady = ref(false);

  /** 回填审查表单的下拉值 */
  function applyReviewFormValues() {
    setReviewFieldsValue({
      complyTerritorialSpacePlan: record.value.complyTerritorialSpacePlan ?? '',
      involvePlanAdjustment: record.value.involvePlanAdjustment ?? '',
      involveCulturalRelicProtection: record.value.involveCulturalRelicProtection ?? '',
      involveEnvironmentalImpactAssessment: record.value.involveEnvironmentalImpactAssessment ?? '',
    });
  }

  /** 审查表单注册回调：注册即回填当前记录值 */
  function handleReviewFormRegister(instance: FormActionType, uuid: string) {
    registerReviewForm(instance, uuid);
    reviewFormReady.value = true;
    applyReviewFormValues();
  }

  // ── 储备转实施（步骤③）表单 ────────────────────────────────────────
  /** 储备转实施表单（FormGroup 分区：实施条件确认/规划调整情况/资金落实情况） */
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
      label: '本年度计划完成投资(亿元)',
      field: 'implYearPlanInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入本年度计划完成投资' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '计划开完工时间',
      field: 'implPlanDuration',
      component: 'RangePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      colProps: { md: 24, lg: 24 },
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

  const [registerImplForm, { setFieldsValue: setImplFieldsValue, setProps: setImplProps }] = useForm({
    labelWidth: 180,
    schemas: implFormSchemas,
    baseColProps: { md: 24, lg: 12 },
    showActionButtonGroup: false,
  });

  /** 储备转实施表单是否已挂载（v-show 面板常驻，注册时序与审查表单同款处理） */
  const implFormReady = ref(false);

  /** 回填储备转实施表单值 */
  function applyImplFormValues() {
    setImplFieldsValue({
      implConditionReady: record.value.implConditionReady ?? '',
      implYearPlanInvest: record.value.implYearPlanInvest,
      implPlanDuration: record.value.implPlanDuration ?? [],
      implInvolvePlanAdjustment: record.value.implInvolvePlanAdjustment ?? '',
      implPassedCommitteeReview: record.value.implPassedCommitteeReview ?? '',
      implFundChannelSettled: record.value.implFundChannelSettled ?? '',
    });
  }

  /** 储备转实施表单注册回调：注册即回填当前记录值 */
  function handleImplFormRegister(instance: FormActionType, uuid: string) {
    registerImplForm(instance, uuid);
    implFormReady.value = true;
    applyImplFormValues();
  }

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as ProjectLibraryItem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.projectCode == null;
    // 转储备库后身份字段锁定（策划库内可编辑；新增视为策划库可编辑）
    identityLocked.value = !record.value.isNewRecord && record.value.library !== 'planning';
    currentAffiliation.value = record.value.projectAffiliation ?? '';
    currentImplementOrgList.value = record.value.implementOrgList ?? [];
    approvalOrFilingFileList.value = (record.value.projectApprovalOrFilingFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    territorialSpacePlanFileList.value = (record.value.territorialSpacePlanFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    projectImplementationPlanFileList.value = (record.value.projectImplementationPlanFileList ?? []).map(
      (name, index) => ({
        uid: `${index}-${name}`,
        name,
      }),
    );
    otherArgumentFileList.value = (record.value.otherArgumentFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    locationGeoJson.value = record.value.locationGeoJson ?? '';
    locationFileName.value = record.value.locationFileName ?? '';
    implPlanAdjustmentFileList.value = (record.value.implPlanAdjustmentFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    implFundProofFileList.value = (record.value.implFundProofFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    reviewMap.value = { ...(record.value.jointReviewMap ?? {}) };
    responsibilityReview.value = {
      results: emptyReviewResults(),
      conclusion: '',
      opinion: '',
      ...(record.value.responsibilityReview ?? {}),
    };
    implReviewMap.value = { ...(record.value.implJointReviewMap ?? {}) };
    implResponsibilityReview.value = {
      results: emptyImplReviewResults(),
      conclusion: '',
      opinion: '',
      ...(record.value.implResponsibilityReview ?? {}),
    };
    // 审查表单/储备转实施表单在非激活步骤面板中：此处不可 await 其方法（未注册会抛错卡死 loading），
    // 已挂载则直接回填，未挂载等注册回调时回填
    if (reviewFormReady.value) applyReviewFormValues();
    if (implFormReady.value) applyImplFormValues();
    // 步骤页签固定落步骤①（策划库入库）；退出信息在步骤条上方灰条展示，不走表单
    activeStage.value = 0;
    await setFieldsValue({
      projectCode: record.value.projectCode ?? '',
      projectName: record.value.projectName ?? '',
      projectApprovalCode: record.value.projectApprovalCode ?? '',
      district: record.value.district ?? '',
      projectAffiliation: record.value.projectAffiliation ?? '',
      renewalAreaName: record.value.renewalAreaName ?? '',
      functionOrientationList: record.value.functionOrientationList ?? [],
      renewalAreaBatch: record.value.renewalAreaBatch ?? '',
      fiveReformType: record.value.fiveReformType ?? '',
      fiveReformSubType: record.value.fiveReformSubType ?? '',
      sixBringTypeList: record.value.sixBringTypeList ?? [],
      mainConstructionContent: record.value.mainConstructionContent ?? '',
      constructionSite: record.value.constructionSite ?? '',
      totalInvestEstimate: record.value.totalInvestEstimate,
      investEstimate: record.value.investEstimate,
      fundSourceList: record.value.fundSourceList ?? [],
      fundSituationRemark: record.value.fundSituationRemark ?? '',
      industrySupervisionDeptList: record.value.industrySupervisionDeptList ?? [],
      responsibleDept: record.value.responsibleDept ?? '',
      coordinateOrgList: record.value.coordinateOrgList ?? [],
      implementOrgList: record.value.implementOrgList ?? [],
      reportOrg: record.value.reportOrg ?? '',
      reportPerson: record.value.reportPerson ?? '',
      reportPhone: record.value.reportPhone ?? '',
      remarks: record.value.remarks ?? '',
      inLibraryDate: record.value.inLibraryDate ?? '',
    });
    // 查看模式只禁用表单（抽屉体内安全）；抽屉级 showFooter 已由 list.vue 打开前设置
    await setProps({ disabled: isView.value });
    setImplProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    // TODO: 后端接入后在此调用保存接口（暂存/提交）
    setTimeout(closeDrawer);
    emit('success', data);
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
