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
    <!-- 片区槽位占位：未选归属/片区外零星时保住项目归属右侧半行的栅格位（悬空，无控件） -->
    <template #areaPlaceholder><div /></template>
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
      <div class="mb-8px text-14px text-gray-600"> 输入公司中文名称（创建后自动选中） </div>
      <Input
        v-model:value="companyName"
        :maxlength="21"
        placeholder="请输入公司名称"
        @press-enter="handleCompanyCreate"
      />
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
  import {
    useDistrictOptions,
    useFiveReformSubTypeMap,
    useFiveReformTypeOptions,
    useFundSourceOptions,
    useProjectAffiliationOptions,
    useSixBeltTypeOptions,
  } from './ifco-dicts';
  import {
    createReportOrgCompany,
    fetchAreaOptions,
    fetchDutyDeptOptions,
    fetchIndustryDeptOptions,
    fetchLibDetail,
    fetchReportOrgOptions,
    splitList,
    type LibAreaOption,
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
  const reportOrgOptions = ref<{ refType: 'office' | 'user'; code: string; name: string }[]>([]);
  // 责任部门候选：SZGJ∪QZGJ 机构（与行业主管部门来源分离）
  const dutyDeptOptions = ref<{ code: string; name: string }[]>([]);
  // 市级片区选项（ESP_MAP_AREA 实时拉取；批次/功能定位按原文带出，选片区后写 aUid 关联）
  const areaOptions = ref<LibAreaOption[]>([]);
  // 六类业务字典统一走 ifco-dicts 中心（字典管理加载+静态兜底；口径见 @jeesite/shared/dict）
  const fiveReformTypeOptions = useFiveReformTypeOptions();
  const fiveReformSubTypeMap = useFiveReformSubTypeMap();
  const districtOptions = useDistrictOptions();
  const sixBeltTypeOptions = useSixBeltTypeOptions();
  const fundSourceOptions = useFundSourceOptions();
  const projectAffiliationOptions = useProjectAffiliationOptions();

  const reportOrgSelectOptions = computed(() =>
    reportOrgOptions.value.map((item) => ({ label: item.name, value: `${item.refType}:${item.code}` })),
  );

  /** 提交组装 {code,name} 用的映射（宿主经 getOptionMaps 取用） */
  const industryDeptOptionMap = computed(() => new Map(industryDeptOptions.value.map((i) => [i.code, i.name])));
  const reportOrgOptionMap = computed(() => new Map(reportOrgOptions.value.map((i) => [`${i.refType}:${i.code}`, i])));

  async function loadOptions() {
    // allSettled 隔离失败：任一选项接口异常（如后端未部署新端点）不影响其余下拉
    const [industryDepts, dutyDepts, reportOrgs, areas] = await Promise.allSettled([
      fetchIndustryDeptOptions(),
      fetchDutyDeptOptions(),
      fetchReportOrgOptions(),
      fetchAreaOptions(),
    ]);
    if (industryDepts.status === 'fulfilled') industryDeptOptions.value = industryDepts.value ?? [];
    if (dutyDepts.status === 'fulfilled') dutyDeptOptions.value = dutyDepts.value ?? [];
    if (reportOrgs.status === 'fulfilled') reportOrgOptions.value = reportOrgs.value ?? [];
    if (areas.status === 'fulfilled') areaOptions.value = areas.value ?? [];
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
      showMessage(`已开通填报主体账号「${created.name}」并选中`);
    } catch (e) {
      companyError.value = (e as Error)?.message ?? '创建失败';
    } finally {
      companyCreating.value = false;
    }
  }

  // ── 联动（编辑态：片区带出批次/功能定位、切归属清空三件套） ───────────
  const currentAffiliation = ref<ProjectAffiliation | ''>('');

  /** 市级更新片区内必填（否则不必填）的分情况校验 */
  function requiredWhenCityArea(message: string) {
    return {
      validator: (_rule: unknown, value: unknown) => {
        const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
        if (currentAffiliation.value === 'market' && empty) return Promise.reject(message);
        return Promise.resolve();
      },
    };
  }

  /** 市级片区选中：批次/功能定位按片区表原文带出，并登记片区唯一号（提交组装用） */
  function handleAreaChange(value: unknown) {
    const area = areaOptions.value.find((item) => item.name === value);
    formActions?.setFieldsValue({
      batch: area?.batch ?? '',
      functionOrientationList: area ? splitList(area.funcTypeName) : [],
    });
  }

  /** 行政区切换：片区随区走清空三件套；责任部门默认联动选中同名区机构
   *  （行政区与区住更局机构同名，如 江岸区↔机构"江岸区"；市住更局不对应任何行政区、
   *  清空行政区或无同名机构时不改动责任部门，保留手工选择；回填走 setFieldsValue
   *  不触发 onChange，不会覆盖编辑态已有值） */
  function handleDistrictChange(value: unknown) {
    formActions?.setFieldsValue({
      areaName: '',
      areaNameText: '',
      batch: '',
      functionOrientationList: [],
    });
    const matched = dutyDeptOptions.value.find((item) => item.name === String(value ?? ''));
    if (matched) {
      formActions?.setFieldsValue({ responsibleDept: matched.code });
    }
  }

  function handleAffiliationChange(value: unknown) {
    currentAffiliation.value = (value as ProjectAffiliation) ?? '';
    formActions?.setFieldsValue({
      areaName: '',
      areaNameText: '',
      batch: '',
      functionOrientationList: [],
    });
  }

  // ── 表单（三分区：项目基本信息 / 投资与资金 / 主体信息 + 只读态实施条件） ──

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
      componentProps: () => ({
        options: districtOptions.value,
        allowClear: true,
        placeholder: '请选择行政区',
        onChange: handleDistrictChange,
      }),
      rules: [{ required: true, message: '请选择行政区' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '项目归属',
      field: 'projectAffiliation',
      component: 'Select' as const,
      componentProps: () => ({
        options: projectAffiliationOptions.value,
        allowClear: true,
        placeholder: '请选择项目归属',
        onChange: handleAffiliationChange,
      }),
      rules: [{ required: true, message: '请选择项目归属' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '片区名称',
      field: 'areaName',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        // 与行政区级联：已选行政区只列该区片区（dist 已由后端归一为字典定案名），未选列全量
        options: areaOptions.value
          .filter((item) => !formModel.district || item.dist === formModel.district)
          .map((item) => ({ label: item.name, value: item.name })),
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
        placeholder: formModel.district ? '请选择片区' : '请先选择行政区（未选时列出全部片区）',
        onChange: handleAreaChange,
      }),
      ifShow: ({ values }) => values.projectAffiliation === 'market',
      rules: [{ required: true, message: '请选择片区名称' }],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '片区名称',
      field: 'areaNameText',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入片区名称（纯文本）' },
      ifShow: ({ values }) => values.projectAffiliation === 'district',
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '　', // 全角空格=JeeSite 约定的无标签写法（FormItem 对 '　' 不追加冒号）
      field: 'areaPlaceholder',
      component: 'Input',
      slot: 'areaPlaceholder',
      // 与片区名称双形态互补：归属未选/片区外零星时占住右半行槽位，五改类别稳定行首
      ifShow: ({ values }) => values.projectAffiliation !== 'market' && values.projectAffiliation !== 'district',
    },
    {
      label: '片区功能定位',
      field: 'functionOrientationList',
      component: 'Select' as const,
      // 只读带出：值为片区表 func_type_name 拆分（无选项枚举，直接展示原文）
      componentProps: { mode: 'multiple', placeholder: '选择片区后自动带出' },
      ifShow: ({ values }) => values.projectAffiliation === 'market',
      dynamicDisabled: () => true,
    },
    {
      label: '片区批次',
      field: 'batch',
      component: 'Input',
      componentProps: { placeholder: '选择片区后自动带出' },
      ifShow: ({ values }) => values.projectAffiliation === 'market',
      dynamicDisabled: () => true,
    },
    {
      label: '五改类别',
      field: 'fiveReformType',
      component: 'Select' as const,
      componentProps: () => ({
        options: fiveReformTypeOptions.value,
        allowClear: true,
        placeholder: '请选择五改类别',
      }),
      rules: [requiredWhenCityArea('市级更新片区内项目必选五改类别')],
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '五改细分类别',
      field: 'fiveReformSubType',
      component: 'Select' as const,
      componentProps: ({ formModel }) => ({
        options: toOptions(fiveReformSubTypeMap.value[(formModel.fiveReformType as string) ?? ''] ?? []),
        allowClear: true,
        placeholder: '请选择五改细分类别',
      }),
      dynamicDisabled: () => props.disabled || props.identityLocked,
    },
    {
      label: '六带类型',
      field: 'sixBringTypeList',
      component: 'Select' as const,
      componentProps: () => ({
        mode: 'multiple',
        options: sixBeltTypeOptions.value,
        allowClear: true,
        placeholder: '请选择六带类型',
      }),
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
      label: '总体投资估算（亿元）',
      field: 'totalInvestEstimate',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '片区项目投资合计，自动计算' },
      dynamicDisabled: () => true,
    },
    {
      label: '项目投资估算（亿元）',
      field: 'investEstimate',
      component: 'InputNumber',
      componentProps: { precision: 4, min: 0, style: 'width: 100%', placeholder: '请输入项目投资估算' },
      rules: [{ required: true, message: '请输入项目投资估算' }],
    },
    {
      label: '资金来源',
      field: 'fundSourceList',
      component: 'Select' as const,
      componentProps: () => ({
        mode: 'multiple',
        options: fundSourceOptions.value,
        allowClear: true,
        placeholder: '请选择资金来源',
      }),
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
        options: dutyDeptOptions.value.map((item) => ({ label: item.name, value: item.code })),
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

  // 整表禁用随 disabled prop（身份字段锁定由各字段 dynamicDisabled 单独叠加）。
  // immediate 首跑早于表单注册会抛"form instance has not been obtained"：
  // 注册前跳过，由 handleRegister 补发初值；此后 prop 变化即时生效
  watch(
    () => props.disabled,
    (value) => {
      if (formReady) formActions?.setProps({ disabled: value });
    },
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
        areaName: detail.area_name || '/',
        areaNameText: detail.area_name || '/',
        batch: detail.batch || '/',
        functionOrientationList: splitList(detail.func_type_name as string),
        fiveReformType: detail.wg_big || '/',
        fiveReformSubType: detail.wg_sub || '/',
        sixBringTypeList: splitList(detail.six_bring_type_list as string),
        constructionSite: detail.construction_site || '/',
        mainConstructionContent: detail.content || '/',
        totalInvestEstimate: undefined,
        investEstimate: detail.inv_bil == null || detail.inv_bil === '' ? '/' : Number(detail.inv_bil as string),
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
                detail.year_invest == null || detail.year_invest === '' ? '/' : Number(detail.year_invest as string),
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
    areaUidOf: (name: string) => areaOptions.value.find((item) => item.name === name)?.aUid,
  });
</script>
