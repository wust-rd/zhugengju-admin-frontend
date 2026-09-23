<!--
  ifco —— 项目基本信息表单（跨模块共用，源自在库项目管理表单步骤①「策划库入库」）

  使用规则：除项目库管理表单（编辑态）外，其他使用处一律只读（disabled 默认 true）。
  双模式：
  - 编辑态（disabled=false，仅项目库管理表单）：完整的策划库入库填报表单——
    项目基本信息（编号/入库时间系统生成只读）+ 投资与资金 + 主体信息（含
    指定填报主体「点我添加」建公司 Modal 全套）、行政区/片区/五改联动与
    条件必填；选项（行业主管部门机构、机构∪公司）组件自加载；宿主经
    defineExpose 的 setFieldsValue/getFieldsValue/validate/resetFields 驱动
    回填与提交组装（{code,name} 组装用 getOptionMaps）。
  - 只读态（disabled=true + pUid，年度工作台/倒排工期/月度进度/资金分类的
    「基本信息查看」）：组件按 pUid 自拉项目库 detail，把联查列+主体关联
    映射为展示值（枚举转中文、主体取名称串、复合值还原名称）整表禁用展示；
    showImplCondition=true 时追加【实施条件】组（本年度计划完成投资=主表
    year_invest / 计划开工时间=start_date / 计划完工时间=end_date）。
-->
<template>
  <BasicForm @register="handleRegister">
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
    <!-- 指定填报主体：下拉（机构+公司双来源）+ 右侧「现场新建公司」入口（仅编辑态） -->
    <template #reportOrg="{ model, field }">
      <div class="flex w-full items-center gap-8px">
        <Select
          :value="model[field]"
          :options="reportOrgSelectOptions"
          :disabled="disabled"
          allow-clear
          show-search
          option-filter-prop="label"
          placeholder="选择机构或外部公司"
          class="flex-1"
          @change="(value: unknown) => (model[field] = value)"
        />
        <span
          v-if="!disabled"
          class="shrink-0 cursor-pointer text-14px text-#1677ff underline"
          @click="openCompanyModal"
        >
          找不到指定填报主体？点我添加
        </span>
      </div>
    </template>
  </BasicForm>

  <!-- 现场新建外部公司（指定填报主体下拉找不到时；建入公司表，编码=名称，同步开通登录账号） -->
  <Modal
    v-model:open="companyModalOpen"
    title="新增填报主体（外部公司）"
    centered
    :confirm-loading="companyCreating"
    ok-text="创建"
    cancel-text="取消"
    @ok="handleCompanyCreate"
  >
    <div class="py-16px">
      <div class="mb-8px text-14px text-gray-600">
        输入公司中文名称（建入公司表，编码=名称，最多 21 个字；创建后自动选中）
      </div>
      <Input v-model:value="companyName" :maxlength="21" placeholder="请输入公司名称" @press-enter="handleCompanyCreate" />
      <div v-if="companyError" class="mt-8px text-14px text-red-500">{{ companyError }}</div>
      <div class="mt-12px rd-4px bg-#f5f8ff px-12px py-10px text-13px leading-22px text-#1677ff">
        创建成功后，该公司可使用登录账号「公司名称」、初始密码 123456 登录系统进行填报（首次登录需修改密码）。
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup name="ViewsIfcoSharedProjectBasicInfoForm">
  import { computed, onMounted, ref, watch } from 'vue';
  import { Input, Modal, Select } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { match } from 'ts-pattern';
  import {
    CITY_RENEWAL_AREA_LIST,
    DISTRICTS,
    DISTRICT_RENEWAL_AREA_LIST,
    FIVE_REFORM_SUB_TYPE_MAP,
    FIVE_REFORM_TYPE_OPTIONS,
    FUND_SOURCE_OPTIONS,
    FUNCTION_ORIENTATION_OPTIONS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
    SIX_BRING_TYPE_OPTIONS,
    createReportOrgCompany,
    fetchIndustryDeptOptions,
    fetchLibDetail,
    fetchReportOrgOptions,
    splitList,
    type LibDetail,
    type ProjectAffiliation,
  } from '@jeesite/ifco/api/ifco/project-library';

  const props = withDefaults(
    defineProps<{
      /** 整表禁用（只读展示模式）。默认 true：除项目库管理表单外一律只读 */
      disabled?: boolean;
      /** 身份字段锁定（在库表单：转储备库起「不可修改」清单字段锁定，策划库内可编辑） */
      identityLocked?: boolean;
      /** 只读态追加【实施条件】组（本年度计划完成投资/计划开工/完工时间） */
      showImplCondition?: boolean;
      /** 只读态数据源：项目 p_uid（组件自拉项目库 detail 映射展示） */
      pUid?: string;
    }>(),
    { disabled: true, identityLocked: false, showImplCondition: true, pUid: '' },
  );

  const { showMessage } = useMessage();

  // ── 选项状态（编辑态自加载；只读态不依赖选项，直接填展示值） ──────────
  const industryDeptOptions = ref<{ code: string; name: string }[]>([]);
  const reportOrgOptions = ref<{ refType: 'office' | 'company'; code: string; name: string }[]>([]);

  const reportOrgSelectOptions = computed(() =>
    reportOrgOptions.value.map((item) => ({ label: item.name, value: `${item.refType}:${item.code}` })),
  );

  /** 提交组装 {code,name} 用的映射（宿主经 getOptionMaps 取用） */
  const industryDeptOptionMap = computed(() => new Map(industryDeptOptions.value.map((i) => [i.code, i.name])));
  const reportOrgOptionMap = computed(
    () => new Map(reportOrgOptions.value.map((i) => [`${i.refType}:${i.code}`, i])),
  );

  async function loadOptions() {
    const [industryDepts, reportOrgs] = await Promise.all([fetchIndustryDeptOptions(), fetchReportOrgOptions()]);
    industryDeptOptions.value = industryDepts ?? [];
    reportOrgOptions.value = reportOrgs ?? [];
  }

  // ── 现场新建外部公司（Modal，仅编辑态） ─────────────────────────────
  const companyModalOpen = ref(false);
  const companyName = ref('');
  const companyError = ref('');
  const companyCreating = ref(false);

  function openCompanyModal() {
    companyName.value = '';
    companyError.value = '';
    companyModalOpen.value = true;
  }

  async function handleCompanyCreate() {
    if (companyCreating.value) return;
    const name = companyName.value.trim();
    if (!name) {
      companyError.value = '请输入公司名称';
      return;
    }
    companyCreating.value = true;
    try {
      const created = await createReportOrgCompany(name);
      reportOrgOptions.value = [created, ...reportOrgOptions.value];
      formActions?.setFieldsValue({ reportOrg: `${created.refType}:${created.code}` });
      companyModalOpen.value = false;
      showMessage(`已创建公司「${created.name}」并选中`);
    } catch (e) {
      companyError.value = (e as Error)?.message ?? '创建失败';
    } finally {
      companyCreating.value = false;
    }
  }

  // ── 联动（编辑态：片区带出批次/功能定位、切归属清空三件套） ───────────
  const currentAffiliation = ref<ProjectAffiliation | ''>('');

  function showRenewalAreaFields(affiliation: ProjectAffiliation | ''): boolean {
    return match(affiliation)
      .with('market', 'district', () => true)
      .with('scattered', '', () => false)
      .exhaustive();
  }

  function renewalAreaNameOptions(affiliation: ProjectAffiliation | ''): string[] {
    return match(affiliation)
      .with('market', () => CITY_RENEWAL_AREA_LIST.map((area) => area.name))
      .with('district', 'scattered', '', () => DISTRICT_RENEWAL_AREA_LIST)
      .exhaustive();
  }

  /** 市级更新片区内必填（否则不必填）的分情况校验 */
  function requiredWhenCityArea(message: string) {
    return {
      validator: (_rule: unknown, value: unknown) => {
        const empty =
          value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
        if (currentAffiliation.value === 'market' && empty) return Promise.reject(message);
        return Promise.resolve();
      },
    };
  }

  function handleRenewalAreaChange(value: unknown) {
    const area = CITY_RENEWAL_AREA_LIST.find((item) => item.name === value);
    formActions?.setFieldsValue({
      renewalAreaBatch: area?.batch ?? '',
      functionOrientationList: area ? [...area.orientationList] : [],
    });
  }

  function handleAffiliationChange(value: unknown) {
    currentAffiliation.value = (value as ProjectAffiliation) ?? '';
    formActions?.setFieldsValue({ renewalAreaName: '', renewalAreaBatch: '', functionOrientationList: [] });
  }

  // ── 表单（三分区：项目基本信息 / 投资与资金 / 主体信息 + 只读态实施条件） ──
  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));

  function toOptions(list: readonly string[]) {
    return list.map((name) => ({ label: name, value: name }));
  }

  const inputFormSchemas: FormSchema[] = [
    // ── 项目基本信息 ──────────────────────────────────────────────────
    { label: '项目基本信息', field: 'basicInfoGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '项目编号', field: 'projectCode', component: 'Input', slot: 'projectCode' },
    { label: '入库时间', field: 'inLibraryDate', component: 'Input', slot: 'inLibraryDate' },
    {
      label: '项目名称',
      field: 'projectName',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入项目名称' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入项目名称' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '项目代码',
      field: 'projectApprovalCode',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '发改委审核备案后赋码' },
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '行政区',
      field: 'district',
      component: 'Select' as const,
      componentProps: { options: districtOptions, allowClear: true, placeholder: '请选择行政区' },
      rules: [{ required: true, message: '请选择行政区' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
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
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '片区名称',
      field: 'renewalAreaName',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions(renewalAreaNameOptions((formModel.projectAffiliation as ProjectAffiliation) ?? '')),
        allowClear: true,
        placeholder: '请选择片区',
        onChange: handleRenewalAreaChange,
      }),
      ifShow: ({ values }) => showRenewalAreaFields((values.projectAffiliation as ProjectAffiliation) ?? ''),
      rules: [requiredWhenCityArea('市级更新片区内项目必选片区名称')],
      dynamicDisabled: () => props.disabled || props.identityLocked,
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
      ifShow: ({ values }) => values.projectAffiliation === 'market',
      dynamicDisabled: () => true,
    },
    {
      label: '片区批次',
      field: 'renewalAreaBatch',
      component: 'Select' as const,
      componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], placeholder: '选择片区后自动带出' },
      ifShow: ({ values }) => values.projectAffiliation === 'market',
      dynamicDisabled: () => true,
    },
    {
      label: '五改类别',
      field: 'fiveReformType',
      component: 'Select' as const,
      componentProps: { options: [...FIVE_REFORM_TYPE_OPTIONS], allowClear: true, placeholder: '请选择五改类别' },
      rules: [requiredWhenCityArea('市级更新片区内项目必选五改类别')],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '五改细分类别',
      field: 'fiveReformSubType',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions(FIVE_REFORM_SUB_TYPE_MAP[(formModel.fiveReformType as string) ?? ''] ?? []),
        allowClear: true,
        placeholder: '请选择五改细分类别',
      }),
      dynamicDisabled: () => props.disabled || props.identityLocked,
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
      dynamicDisabled: () => props.disabled || props.identityLocked,
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
    { label: '投资与资金', field: 'investFundGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
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
    { label: '主体信息', field: 'orgGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '行业主管部门',
      field: 'industrySupervisionDeptList',
      component: 'Select' as const,
      componentProps: () => ({
        mode: 'multiple',
        options: industryDeptOptions.value.map((item) => ({ label: item.name, value: item.code })),
        allowClear: true,
        placeholder: '请选择行业主管部门（可多选）',
      }),
      rules: [{ required: true, message: '请选择行业主管部门' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '责任部门',
      field: 'responsibleDept',
      component: 'Select' as const,
      componentProps: () => ({
        options: industryDeptOptions.value.map((item) => ({ label: item.name, value: item.code })),
        allowClear: true,
        placeholder: '请选择责任部门',
      }),
      rules: [{ required: true, message: '请选择责任部门' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '统筹主体',
      field: 'coordinateOrg',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '请输入统筹主体' },
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '实施主体',
      field: 'implementOrg',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '请输入实施主体' },
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '指定填报主体',
      field: 'reportOrg',
      component: 'Select' as const,
      slot: 'reportOrg',
      colProps: { md: 24, lg: 24 },
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
    // ── 实施条件（只读态追加；在库表单场景 showImplCondition=false 不显示） ──
    ...(props.showImplCondition
      ? ([
          { label: '实施条件', field: 'implConditionGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
          {
            label: '本年度计划完成投资（亿元）',
            field: 'yearInvest',
            component: 'Input',
            dynamicDisabled: () => true,
          },
          { label: '计划开工时间', field: 'planStartDate', component: 'Input', dynamicDisabled: () => true },
          { label: '计划完工时间', field: 'planCompletionDate', component: 'Input', dynamicDisabled: () => true },
        ] as FormSchema[])
      : []),
  ];

  const [registerForm, formActions] = useForm({
    labelWidth: 150,
    schemas: inputFormSchemas,
    showActionButtonGroup: false,
    baseColProps: { md: 24, lg: 12 },
  });

  let formReady = false;

  function handleRegister(instance: FormActionType, uuid: string) {
    registerForm(instance, uuid);
    formReady = true;
    // immediate watch 早于表单注册会静默空转：注册后补下发禁用 + 补拉一次只读数据
    formActions?.setProps({ disabled: props.disabled });
    if (props.disabled && props.pUid) fillFromDetail();
  }

  // 整表禁用随 disabled prop（身份字段锁定由各字段 dynamicDisabled 单独叠加）
  watch(
    () => props.disabled,
    (value) => formActions?.setProps({ disabled: value }),
    { immediate: true },
  );

  onMounted(() => {
    if (!props.disabled) loadOptions();
  });

  // ── 只读态：按 pUid 自拉详情映射展示值 ──────────────────────────────
  function toDateStr(value?: string | null): string {
    return typeof value === 'string' ? value.slice(0, 10) : '';
  }

  async function fillFromDetail() {
    if (!props.pUid) return;
    try {
      const detail = (await fetchLibDetail(props.pUid)) as LibDetail & Recordable;
      const subjects = detail.subjects ?? {};
      formActions?.setFieldsValue({
        projectCode: detail.lib_project_code ?? '/',
        inLibraryDate: toDateStr(detail.in_library_date as string) || '/',
        projectName: detail.pj_name ?? '/',
        projectApprovalCode: detail.project_approval_code || '/',
        district: detail.dist || '/',
        projectAffiliation: detail.project_affiliation || '/',
        renewalAreaName: detail.area_name || '/',
        renewalAreaBatch: detail.batch || '/',
        functionOrientationList: splitList(detail.func_type_name as string),
        fiveReformType: detail.wg_big || '/',
        fiveReformSubType: detail.wg_sub || '/',
        sixBringTypeList: splitList(detail.six_bring_type_list as string),
        constructionSite: detail.construction_site || '/',
        mainConstructionContent: detail.content || '/',
        totalInvestEstimate: undefined,
        investEstimate:
          detail.inv_bil == null || detail.inv_bil === '' ? '/' : Number(detail.inv_bil as string),
        fundSourceList: splitList(detail.fund_src as string),
        fundSituationRemark: detail.fund_situation_remark || '/',
        industrySupervisionDeptList: (subjects.industryDepts ?? []).map((item) => item.name),
        responsibleDept: subjects.responsibleDept?.name || '/',
        coordinateOrg: detail.coordinate_org_list || '/',
        implementOrg: detail.implement_org_list || '/',
        reportOrg: subjects.reportOrg?.name || '/',
        reportPerson: detail.report_person || '/',
        reportPhone: detail.report_phone || '/',
        remarks: detail.remarks || '/',
        ...(props.showImplCondition
          ? {
              yearInvest:
                detail.year_invest == null || detail.year_invest === ''
                  ? '/'
                  : Number(detail.year_invest as string),
              planStartDate: toDateStr(detail.start_date as string) || '/',
              planCompletionDate: toDateStr(detail.end_date as string) || '/',
            }
          : {}),
      });
    } catch (e) {
      showMessage((e as Error)?.message || '项目基本信息加载失败');
    }
  }

  watch(
    () => props.pUid,
    () => {
      if (props.disabled && props.pUid && formReady) fillFromDetail();
    },
    { immediate: true },
  );

  // ── 宿主接口（编辑态由在库表单驱动回填/取值/校验） ──────────────────
  defineExpose({
    setFieldsValue: (values: Recordable) => formActions?.setFieldsValue(values),
    getFieldsValue: () => formActions?.getFieldsValue(),
    validate: () => formActions?.validate(),
    resetFields: () => formActions?.resetFields(),
    getOptionMaps: () => ({
      industryDeptOptionMap: industryDeptOptionMap.value,
      reportOrgOptionMap: reportOrgOptionMap.value,
    }),
  });
</script>
