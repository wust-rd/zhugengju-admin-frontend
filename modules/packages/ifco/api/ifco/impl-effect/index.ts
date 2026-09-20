/**
 * ifco —— 实施成效评估（内存假数据）
 *
 * 菜单两级：项目实施成效管理（评估表单抽屉）+ 六带效果评估（独立页面）。
 * 数据来自本模块内存行（EFFECT_ITEMS，刷新即恢复）；行政区/五改类别/项目归属
 * 枚举复用 project-library 口径。
 */
import {
  DISTRICTS,
  FIVE_REFORM_TYPE_OPTIONS,
  PROJECT_AFFILIATION_LABEL,
  RENEWAL_AREA_BATCH_LABEL,
} from '@jeesite/ifco/api/ifco/project-library';

/** 成效评估状态：待评估（可去评估）→ 已完成（提交评估后） */
export type EvaluateStatus = '待评估' | '已完成';

export const EVALUATE_STATUS_OPTIONS: EvaluateStatus[] = ['待评估', '已完成'];

/** 四好目标（好房子/好小区/好社区/好城区） */
export type FourGoodGoal = '好房子' | '好小区' | '好社区' | '好城区';

export const FOUR_GOOD_GOAL_OPTIONS: FourGoodGoal[] = ['好房子', '好小区', '好社区', '好城区'];

/** 房屋用途（好房子基本信息） */
export type HouseUse = '住宅' | '商业' | '办公' | '商住混合' | '公共服务配套';

export const HOUSE_USE_OPTIONS: HouseUse[] = ['住宅', '商业', '办公', '商住混合', '公共服务配套'];

/** 品质升级类型（好房子基本信息，三组复选） */
export type QualityUpgradeGroup = '安全耐久' | '功能完善' | '绿色智能';

export const QUALITY_UPGRADE_OPTIONS: Record<QualityUpgradeGroup, string[]> = {
  安全耐久: ['结构安全', '燃气安全', '楼道安全', '维护安全'],
  功能完善: ['管道破损改造', '适老化改造', '加装电梯'],
  绿色智能: ['节能改造', '数字化改造'],
};

/** 是否可以作为 REITs 培育项目（基本情况 · 资金填报） */
export type YesNo = '是' | '否';

export const YES_NO_OPTIONS: YesNo[] = ['是', '否'];

/** 改造前后对比照片（4 组，文件名演示） */
export type ComparePhotoGroup = { before: string[]; after: string[] };

/** 好小区/好社区/好城区明细行（三表同构） */
export type FourGoodUnitRow = {
  name: string;
  address: string;
  buildingCount: number;
  householdCount: number;
  buildingArea: number;
  propertyCompany: string;
  ownersCommittee: string;
  propertyFee: number;
  facilityCoverage: number;
  safetyIndex: number;
};

/** 项目实施成效管理行（列表 + 评估表单一体） */
export type EffectItem = {
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 主四好目标（列表「四好目标」列单值展示） */
  fourGoodGoal: FourGoodGoal;
  investEstimate: number;
  actualInvest: number;
  /** 竣工日期（列表列）/ 实际完工时间（表单只读横幅） */
  completionDate: string;
  responsibleOrg: string;
  operatingOrg: string;
  evaluateStatus: EvaluateStatus;
  // ── 评估表单 ──
  /** 评估日期（必填） */
  evaluateDate: string;
  /** 实施成效说明 */
  effectDescription: string;
  /** 改造前后对比照片（4 组，第 1 组必填） */
  comparePhotos: ComparePhotoGroup[];
  /** 绩效评估结果 */
  performanceResult: string;
  /** 选择的四好目标（多选；提交时必填） */
  selectedGoals: FourGoodGoal[];
  // 好房子
  goodHouseCount?: number;
  houseUse?: HouseUse;
  qualityUpgrades?: string[];
  // 好小区
  goodCommunityCount?: number;
  // 好社区
  isPartOfCommunity?: boolean;
  goodBlockCount?: number;
  // ── 基本情况 · 资金填报 ──
  /** 本年完成投资额（亿元，进度填报自动带入，只读） */
  yearInvest: number;
  /** 是否可以作为 REITs 培育项目 */
  reitsProject?: YesNo;
};

/** 好小区/好社区/好城区明细演示行（添加/编辑/导出均为占位） */
export const FOUR_GOOD_UNIT_ROWS: Record<'好小区' | '好社区' | '好城区', FourGoodUnitRow[]> = {
  好小区: [
    {
      name: '联合村小区',
      address: '江岸区联合村 18 号',
      buildingCount: 12,
      householdCount: 856,
      buildingArea: 7.2,
      propertyCompany: '武汉众治社区服务公司',
      ownersCommittee: '已成立',
      propertyFee: 1.2,
      facilityCoverage: 92,
      safetyIndex: 96,
    },
    {
      name: '同兴里小区',
      address: '江岸区同兴里 21 号',
      buildingCount: 8,
      householdCount: 512,
      buildingArea: 4.6,
      propertyCompany: '武汉众治社区服务公司',
      ownersCommittee: '已成立',
      propertyFee: 1.0,
      facilityCoverage: 88,
      safetyIndex: 94,
    },
  ],
  好社区: [
    {
      name: '三阳社区',
      address: '江岸区三阳路 13 号',
      buildingCount: 26,
      householdCount: 2180,
      buildingArea: 18.5,
      propertyCompany: '武汉城更社区运营公司',
      ownersCommittee: '已成立',
      propertyFee: 1.5,
      facilityCoverage: 95,
      safetyIndex: 97,
    },
    {
      name: '一元社区',
      address: '江岸区一元路 6 号',
      buildingCount: 19,
      householdCount: 1460,
      buildingArea: 12.3,
      propertyCompany: '武汉城更社区运营公司',
      ownersCommittee: '筹备中',
      propertyFee: 1.3,
      facilityCoverage: 90,
      safetyIndex: 93,
    },
  ],
  好城区: [
    {
      name: '一元片历史城区',
      address: '江岸区沿江大道片区',
      buildingCount: 64,
      householdCount: 8620,
      buildingArea: 56.8,
      propertyCompany: '—',
      ownersCommittee: '—',
      propertyFee: 0,
      facilityCoverage: 96,
      safetyIndex: 98,
    },
    {
      name: '西马片活力城区',
      address: '江岸区西马街道片区',
      buildingCount: 48,
      householdCount: 6340,
      buildingArea: 42.1,
      propertyCompany: '—',
      ownersCommittee: '—',
      propertyFee: 0,
      facilityCoverage: 94,
      safetyIndex: 95,
    },
  ],
};

/** 状态标签配色：待评估=蓝描边、已完成=绿实心 */
export function evaluateStatusTagProps(status: EvaluateStatus): {
  color: string;
  variant: 'solid' | 'outlined';
} {
  switch (status) {
    case '待评估':
      return { color: 'blue', variant: 'outlined' };
    case '已完成':
      return { color: 'green', variant: 'solid' };
  }
}

/** 列表操作：待评估=查看+去评估；已完成=查看 */
export type EffectAction = '查看' | '去评估';

export function actionsByEvaluateStatus(status: EvaluateStatus): EffectAction[] {
  switch (status) {
    case '待评估':
      return ['查看', '去评估'];
    case '已完成':
      return ['查看'];
  }
}

/** 行数据（前 3 行照设计稿抄录，其余补齐 7 行：3 待评估 + 4 已完成） */
export const EFFECT_ITEMS: EffectItem[] = [
  {
    projectCode: '20263600',
    projectName: '三阳设计之都项目（一元片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    fourGoodGoal: '好社区',
    investEstimate: 1.8,
    actualInvest: 1.8,
    completionDate: '2026-10-31',
    responsibleOrg: '江岸区住更局',
    operatingOrg: '武汉城更建设投资公司',
    evaluateStatus: '待评估',
    evaluateDate: '',
    effectDescription: '',
    comparePhotos: [
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '',
    selectedGoals: [],
    yearInvest: 0.45,
  },
  {
    projectCode: '20263559',
    projectName: '胜利街（二曜路—三阳路）道路改造项目',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    fourGoodGoal: '好城区',
    investEstimate: 0.86,
    actualInvest: 0.82,
    completionDate: '2026-09-28',
    responsibleOrg: '江岸区住更局',
    operatingOrg: '江岸区市政设施维护中心',
    evaluateStatus: '待评估',
    evaluateDate: '',
    effectDescription: '',
    comparePhotos: [
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '',
    selectedGoals: [],
    yearInvest: 0.3,
  },
  {
    projectCode: '20263558',
    projectName: '西马片房地产新模式试点项目',
    district: '江岸区',
    renewalAreaName: '西马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    fourGoodGoal: '好房子',
    investEstimate: 2.03,
    actualInvest: 2.03,
    completionDate: '2026-09-19',
    responsibleOrg: '江岸区住更局',
    operatingOrg: '武汉城更房地产开发公司',
    evaluateStatus: '待评估',
    evaluateDate: '',
    effectDescription: '',
    comparePhotos: [
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '',
    selectedGoals: [],
    yearInvest: 0.72,
  },
  {
    projectCode: '20263412',
    projectName: '黑泥湖片完整社区建设项目',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    fourGoodGoal: '好小区',
    investEstimate: 1.35,
    actualInvest: 1.31,
    completionDate: '2026-06-30',
    responsibleOrg: '江岸区住更局',
    operatingOrg: '武汉众治社区服务公司',
    evaluateStatus: '已完成',
    evaluateDate: '2026-07-15',
    effectDescription: '12 个老旧小区完成改造，配套设施覆盖率提升至 92%，居民满意度调查达 94 分。',
    comparePhotos: [
      { before: ['改造前-联合村.jpg'], after: ['改造后-联合村.jpg'] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '绩效评估优秀：投资完成率 97%，惠及居民 3012 户。',
    selectedGoals: ['好房子', '好小区'],
    goodHouseCount: 3012,
    houseUse: '住宅',
    qualityUpgrades: ['结构安全', '燃气安全', '适老化改造', '加装电梯'],
    goodCommunityCount: 12,
    yearInvest: 0.62,
    reitsProject: '是',
  },
  {
    projectCode: '20263388',
    projectName: '红钢城片工业遗产保护利用项目',
    district: '青山区',
    renewalAreaName: '红钢城片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-factory',
    projectAffiliation: 'district-area',
    fourGoodGoal: '好城区',
    investEstimate: 3.6,
    actualInvest: 3.42,
    completionDate: '2026-05-20',
    responsibleOrg: '青山区住更局',
    operatingOrg: '武汉青山区城更公司',
    evaluateStatus: '已完成',
    evaluateDate: '2026-06-10',
    effectDescription: '3 处工业遗产建筑完成修缮活化，引入文创企业 18 家，片区活力显著提升。',
    comparePhotos: [
      { before: ['改造前-红钢城.jpg'], after: ['改造后-红钢城.jpg'] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '绩效评估良好：投资完成率 95%，新增就业岗位 560 个。',
    selectedGoals: ['好房子', '好城区'],
    goodHouseCount: 86,
    houseUse: '商住混合',
    qualityUpgrades: ['结构安全', '节能改造'],
    yearInvest: 1.1,
    reitsProject: '否',
  },
  {
    projectCode: '20263215',
    projectName: '街道口片环大学片区更新项目',
    district: '洪山区',
    renewalAreaName: '街道口片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    fourGoodGoal: '好社区',
    investEstimate: 2.4,
    actualInvest: 2.28,
    completionDate: '2026-04-28',
    responsibleOrg: '洪山区住更局',
    operatingOrg: '武汉洪山区城更公司',
    evaluateStatus: '已完成',
    evaluateDate: '2026-05-18',
    effectDescription: '环大学创新带初具规模，改造楼宇 9 栋，新增创业空间 4.2 万㎡。',
    comparePhotos: [
      { before: ['改造前-街道口.jpg'], after: ['改造后-街道口.jpg'] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '绩效评估优秀：投资完成率 95%，孵化初创企业 42 家。',
    selectedGoals: ['好社区', '好城区'],
    isPartOfCommunity: true,
    goodBlockCount: 3,
    yearInvest: 0.96,
    reitsProject: '是',
  },
  {
    projectCode: '20263107',
    projectName: '吴家山片老旧厂区改造项目',
    district: '东西湖区',
    renewalAreaName: '吴家山片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-factory',
    projectAffiliation: 'district-area',
    fourGoodGoal: '好小区',
    investEstimate: 1.9,
    actualInvest: 1.85,
    completionDate: '2026-03-25',
    responsibleOrg: '东西湖区住更局',
    operatingOrg: '武汉东西湖城更公司',
    evaluateStatus: '已完成',
    evaluateDate: '2026-04-12',
    effectDescription: '老旧厂区转型为智能制造产业园，入驻企业 26 家，产值贡献初显。',
    comparePhotos: [
      { before: ['改造前-吴家山.jpg'], after: ['改造后-吴家山.jpg'] },
      { before: [], after: [] },
      { before: [], after: [] },
      { before: [], after: [] },
    ],
    performanceResult: '绩效评估良好：投资完成率 97%，园区入驻率 85%。',
    selectedGoals: ['好房子', '好小区'],
    goodHouseCount: 460,
    houseUse: '办公',
    qualityUpgrades: ['结构安全', '数字化改造'],
    goodCommunityCount: 5,
    yearInvest: 0.58,
    reitsProject: '否',
  },
];

/** 查询条件（列表页 Tabs + 搜索表单合并过滤） */
export type EffectQuery = {
  projectName?: string;
  fiveReformType?: string;
  fourGoodGoal?: string;
  evaluateStatus?: EvaluateStatus | '';
};

/** 空值匹配（undefined/空串视为不限） */
function matchText(actual: string, query?: string) {
  return !query || actual.includes(query.trim());
}

export function filterEffects(params: EffectQuery): EffectItem[] {
  return EFFECT_ITEMS.filter(
    (item) =>
      (!params.evaluateStatus || item.evaluateStatus === params.evaluateStatus) &&
      matchText(item.projectName, params.projectName) &&
      (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
      (!params.fourGoodGoal || item.fourGoodGoal === params.fourGoodGoal),
  );
}

/** 枚举转中文（只读展示用） */
export function fiveReformLabel(value: string): string {
  return FIVE_REFORM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function renewalAreaBatchLabel(value: string): string {
  return RENEWAL_AREA_BATCH_LABEL[value] ?? value;
}

export function projectAffiliationLabel(value: string): string {
  return PROJECT_AFFILIATION_LABEL[value] ?? value;
}

/** 行政区选项（搜索表单） */
export const DISTRICT_OPTIONS = DISTRICTS.map((name) => ({ label: name, value: name }));
