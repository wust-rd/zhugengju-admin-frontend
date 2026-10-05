/**
 * ifco —— 实施成效评估（接口层：项目实施成效管理）
 *
 * 对接后端 /a/ifco/impl-eval/...（modules/ifco impleffect 域，表
 * IFCO_IMPL_EVALUATE / IFCO_IMPL_EVAL_COMMUNITY）。收录口径·并集=
 * 在实施库（library='implementing'）或已完工（current_status='已完工'）。
 * 值口径：evaluateStatus 英文码 pending/completed（本文件映射中文）；
 * 列表行键蛇形（p_uid/project_name/evaluate_status…）；详情 project 键蛇形、
 * evaluate/communityRows 键驼峰；文件为 JSON 数组 [{name,url,objectKey,size}]；
 * 多选字段（selectedGoals/qualityUpgrades/facilityTypes）逗号分隔中文串
 * （接口层与页面模型 string[] 互转）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { FIVE_REFORM_TYPE_OPTIONS, PROJECT_AFFILIATION_LABEL } from '@jeesite/ifco/api/ifco/project-library';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/impl-eval';

// ── 枚举（前端展示口径） ───────────────────────────────────────────

/** 评估状态：pending=待评估（可去评估）/ completed=已完成 */
export type EvaluateStatus = 'pending' | 'completed';

/** 评估状态 → 中文 */
export const EVALUATE_STATUS_LABELS: Record<EvaluateStatus, string> = {
  pending: '待评估',
  completed: '已完成',
};

/** 状态下拉选项（JeeSiteSelect 需要 label/value 对象） */
export const EVALUATE_STATUS_OPTIONS = (Object.keys(EVALUATE_STATUS_LABELS) as EvaluateStatus[]).map((value) => ({
  label: EVALUATE_STATUS_LABELS[value],
  value,
}));

/** 四好目标（好房子/好小区/好社区/好城区） */
export type FourGoodGoal = '好房子' | '好小区' | '好社区' | '好城区';

export const FOUR_GOOD_GOAL_OPTIONS: FourGoodGoal[] = ['好房子', '好小区', '好社区', '好城区'];

/** 房屋用途（好房子基本信息） */
export type HouseUse = '住宅' | '商业' | '办公' | '商住混合' | '公共服务配套';

export const HOUSE_USE_OPTIONS: HouseUse[] = ['住宅', '商业', '办公', '商住混合', '公共服务配套'];

/** 品质升级类型（好房子基本信息，四组复选） */
export type QualityUpgradeGroup = '安全耐久' | '功能完善' | '绿色智能' | '其他';

export const QUALITY_UPGRADE_OPTIONS: Record<QualityUpgradeGroup, string[]> = {
  安全耐久: ['结构安全改造', '燃气安全改造', '楼道安全改造', '维护安全改造'],
  功能完善: ['管道破损改造', '适老化改造', '加装电梯'],
  绿色智能: ['节能改造', '数字化改造'],
  其他: ['原拆原建', '其他'],
};

/** 是/否（组成部分/15分钟可达） */
export type YesNo = '是' | '否';

export const YES_NO_OPTIONS: YesNo[] = ['是', '否'];

/** 好社区 · 达标设施类型 */
export const FACILITY_TYPE_OPTIONS: string[] = ['养老', '医疗', '教育', '文体', '地下管网'];

/** 好社区 · 所属社区（演示选项） */
export const BELONG_COMMUNITY_OPTIONS: string[] = ['三阳社区', '一元社区', '联合村社区', '岳飞社区', '同福社区'];

/** 好城区 · 所属城区（演示选项） */
export const BELONG_CITY_DISTRICT_OPTIONS: string[] = ['一元片历史城区', '西马片活力城区', '中山大道片', '汉正街片'];

// ── 展示辅助（只读展示用） ─────────────────────────────────────────

/** 五改大类编码 → 中文（主表 wg_big 为中文值，直通） */
export function fiveReformLabel(value: string): string {
  return FIVE_REFORM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** 项目归属编码 → 中文 */
export function projectAffiliationLabel(value: string): string {
  return PROJECT_AFFILIATION_LABEL[value] ?? value;
}

/** 状态标签配色：pending=蓝描边、completed=绿实心 */
export function evaluateStatusTagProps(status: EvaluateStatus): {
  color: string;
  variant: 'solid' | 'outlined';
} {
  switch (status) {
    case 'pending':
      return { color: 'blue', variant: 'outlined' };
    case 'completed':
      return { color: 'green', variant: 'solid' };
  }
}

/** 列表操作：pending=查看+去评估；completed=查看 */
export type EffectAction = '查看' | '去评估';

export function actionsByEvaluateStatus(status: EvaluateStatus): EffectAction[] {
  switch (status) {
    case 'pending':
      return ['查看', '去评估'];
    case 'completed':
      return ['查看'];
  }
}

// ── 数据模型（接口行/详情/保存） ───────────────────────────────────

/** 文件项（与库域 LibFileItem 同构；演示阶段仅 name） */
export type ImplEvalFileItem = { name: string; url?: string; objectKey?: string; size?: number };

/** 改造前后对比照片组（组序=数组序，组数不限可为空） */
export type ComparePhotoGroup = { before: ImplEvalFileItem[]; after: ImplEvalFileItem[] };

/** 好小区明细行（页面模型；保存时 name → communityName 转换） */
export type FourGoodUnitRow = {
  name: string;
  address: string;
  buildingCount?: number;
  householdCount?: number;
  buildingArea?: number;
  propertyCompany: string;
  ownersCommittee: string;
  propertyFee?: number;
  facilityCoverage?: number;
  safetyIndex?: number;
  /** 空间位置图层（GeoJSON 字符串） */
  geoLayerJson?: string;
  geoFileName?: string;
  /** 佐证附件（文件对象数组） */
  attachmentFiles?: ImplEvalFileItem[];
};

/** 列表行（键=后端列别名蛇形） */
export type EffectItem = {
  p_uid: string;
  project_code: string;
  project_name: string;
  renewal_area_name: string;
  five_reform_type: string;
  four_good_goal: string;
  invest_estimate: number | null;
  /** 实际投资暂无主数据来源（月度进度聚合后接入） */
  actual_invest: number | null;
  completion_date: string | null;
  responsible_org: string;
  operating_org: string | null;
  evaluate_status: EvaluateStatus;
};

/** 分页查询参数 */
export type ImplEvalPageReq = {
  projectName?: string;
  fiveReformType?: string;
  fourGoodGoal?: string;
  evaluateStatus?: EvaluateStatus;
  pageNum?: number;
  pageSize?: number;
};

/** 评估详情（project=只读横幅；evaluate 未评估给空默认） */
export type ImplEvalDetail = {
  project: {
    p_uid: string;
    project_code: string;
    project_name: string;
    district: string;
    renewal_area_name: string;
    five_reform_type: string;
    project_affiliation: string;
    responsible_org: string;
    invest_estimate: number | null;
    completion_date: string | null;
    library: string;
    current_status: string | null;
  };
  evaluate: {
    evaluateStatus: EvaluateStatus;
    evaluateDate: string | null;
    operatingOrg: string | null;
    effectDescription: string | null;
    performanceResult: string | null;
    performanceFiles: ImplEvalFileItem[];
    comparePhotoGroups: ComparePhotoGroup[];
    selectedGoals: string | null;
    goodHouseCount: number | null;
    houseUse: HouseUse | null;
    qualityUpgrades: string | null;
    houseEvidenceFiles: ImplEvalFileItem[];
    houseGeoJson: string | undefined;
    houseGeoFileName: string | undefined;
    goodCommunityCount: number | null;
    communityPart: YesNo | null;
    belongCommunity: string | null;
    facilityTypes: string | null;
    blockAddHouseCount: number | null;
    blockAddCommunityCount: number | null;
    facilityRadius: number | null;
    facilityPopulation: number | null;
    reachable15min: YesNo | null;
    cityPart: YesNo | null;
    belongCityDistrict: string | null;
    cityAddHouseCount: number | null;
    cityAddCommunityCount: number | null;
    cityAddBlockCount: number | null;
  };
  communityRows: {
    id: string;
    evaluateId: string;
    communityName: string;
    address: string;
    buildingCount: number | null;
    householdCount: number | null;
    buildingArea: number | null;
    propertyCompany: string;
    ownersCommittee: string;
    propertyFee: number | null;
    facilityCoverage: number | null;
    safetyIndex: number | null;
    geoLayerJson: string | null;
    geoFileName: string | null;
    attachmentFiles: ImplEvalFileItem[];
    sortNo: number;
  }[];
};

/** 保存请求（evaluateDate=yyyy-MM-DD；多选字段逗号串；明细行按评估整替） */
export type ImplEvalSaveReq = {
  pUid: string;
  submit: boolean;
  evaluateDate?: string;
  operatingOrg?: string;
  effectDescription?: string;
  performanceResult?: string;
  performanceFiles?: ImplEvalFileItem[];
  comparePhotoGroups?: ComparePhotoGroup[];
  selectedGoals?: string;
  goodHouseCount?: number;
  houseUse?: HouseUse;
  qualityUpgrades?: string;
  houseEvidenceFiles?: ImplEvalFileItem[];
  houseGeoJson?: string;
  houseGeoFileName?: string;
  goodCommunityCount?: number;
  communityPart?: YesNo;
  belongCommunity?: string;
  facilityTypes?: string;
  blockAddHouseCount?: number;
  blockAddCommunityCount?: number;
  facilityRadius?: number;
  facilityPopulation?: number;
  reachable15min?: YesNo;
  cityPart?: YesNo;
  belongCityDistrict?: string;
  cityAddHouseCount?: number;
  cityAddCommunityCount?: number;
  cityAddBlockCount?: number;
  communityRows?: {
    communityName: string;
    address?: string;
    buildingCount?: number;
    householdCount?: number;
    buildingArea?: number;
    propertyCompany?: string;
    ownersCommittee?: string;
    propertyFee?: number;
    facilityCoverage?: number;
    safetyIndex?: number;
    geoLayerJson?: string;
    geoFileName?: string;
    attachmentFiles?: ImplEvalFileItem[];
  }[];
  remarks?: string;
};

// ── 接口 ───────────────────────────────────────────────────────────

/** 分页查询（收录口径联查：实施库或已完工；无评估行=待评估） */
export function fetchImplEvalPage(params: ImplEvalPageReq) {
  return unwrap<{ total: number; pageNum: number; pageSize: number; list: EffectItem[] }>(
    defHttp.get({ url: BASE + '/page', params }),
  );
}

/** 评估详情（抽屉回显） */
export function fetchImplEvalDetail(pUid: string) {
  return unwrap<ImplEvalDetail>(defHttp.get({ url: BASE + '/detail', params: { pUid } }));
}

/** 保存评估（submit=true 提交转已完成；false 暂存保持待评估） */
export function saveImplEval(data: ImplEvalSaveReq) {
  return unwrap<{ pUid: string; evaluateStatus: EvaluateStatus }>(defHttp.postJson({ url: BASE + '/save', data }));
}

/** 模拟后端解析：上传 shp/dwg → 后端解析返回 GeoJSON（接口就绪后替换） */
export function parseGeoFile(_file: File): Promise<string> {
  return Promise.reject(new Error('shp/dwg 解析接口暂未接入'));
}
