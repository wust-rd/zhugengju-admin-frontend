/**
 * ifco —— 在库项目管理（接口层）
 *
 * 对接后端 /a/ifco/lib/...（接口文档-项目库管理.md v5，modules/ifco）。
 * 值口径与后端一致：library/status 英文枚举；五改类别/片区批次/功能定位为中文值
 * （主表 wg_big/batch/func_type_name）；多选字段逗号分隔字符串；文件为 JSON 数组串
 * [{name,url,objectKey,size}]；审查结论 pass/reject。
 * 行政区/片区/主管部门/主体等字典后端暂未提供接口，仍为前端静态清单。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { match } from 'ts-pattern';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/lib';

// ── 库 ─────────────────────────────────────────────────────────────
/** 库：统计卡点选 = 表格筛选维度，经路由 ?library= 持久化 */
export type LibraryKey = 'planning' | 'reserve' | 'implementing' | 'exited';

/** 库 key → 中文名（生命周期步骤条/退出环节展示用） */
export const LIBRARY_LABELS: Record<LibraryKey, string> = {
  planning: '策划库',
  reserve: '储备库',
  implementing: '实施库',
  exited: '已退出',
};

/** 统计卡静态文案（数字经 stats 接口填充） */
export type LibraryCard = {
  key: LibraryKey;
  label: string;
  description: string;
};

export const LIBRARY_CARDS: LibraryCard[] = [
  { key: 'planning', label: '策划库', description: '区住更局统一录入，纳入统筹主体/实施主体' },
  { key: 'reserve', label: '储备库', description: '统筹主体/实施主体申报且审核通过' },
  { key: 'implementing', label: '实施库', description: '具备施工条件，统筹主体/实施主体申报且审核通过' },
  { key: 'exited', label: '已退出', description: '4块退出机制，检索只读' },
];

// ── 状态（后端英文枚举，随所在库决定） ────────────────────────────────
export type ProjectStatus = 'draft' | 'reviewing' | 'rejected' | 'passed' | 'stored' | 'exited';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: '待提交',
  reviewing: '审核中',
  rejected: '退回修改',
  passed: '审核通过',
  stored: '已入实施库',
  exited: '已退出',
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as ProjectStatus[]).map((value) => ({
  label: STATUS_LABEL[value],
  value,
}));

// ── 视角与操作矩阵 ─────────────────────────────────────────────────
/** 操作视角（操作列按钮随视角×状态变化；生产接机构角色，演示阶段列表页切换） */
export type ProjectRole = 'report-org' | 'industry-dept' | 'responsibility-dept';

export const ROLE_OPTIONS = [
  { label: '填报主体', value: 'report-org' },
  { label: '行业主管部门', value: 'industry-dept' },
  { label: '责任部门', value: 'responsibility-dept' },
] as const;

/** 操作列动作（审核=编辑态打开表单抽屉填审查结论；转入下个库带二次确认、转退出开转退出抽屉） */
export type ProjectAction = '查看' | '编辑' | '审核' | '转入下个库' | '转退出';

/** 退出类型（转退出抽屉下拉；与 ESP_PROJECT_EXTRA.exit_type 存值一致） */
export const EXIT_TYPE_OPTIONS = ['自愿退出', '项目无法继续实施', '违反法律法规'] as const;

/**
 * 各状态×各视角的可用操作（Record 按 ProjectStatus×ProjectRole 双层穷尽：
 * 新增状态/视角漏配时编译报错）。业务定稿口径（2026-09-21/22）；
 * 转退出暂不区分角色（2026-09-24），非已退出状态各视角均可操作。
 */
export const ACTIONS_BY_STATUS_ROLE: Record<ProjectStatus, Record<ProjectRole, ProjectAction[]>> = {
  draft: {
    'report-org': ['查看', '编辑', '转退出'],
    'industry-dept': ['查看', '转退出'],
    'responsibility-dept': ['查看', '编辑', '转退出'],
  },
  reviewing: {
    'report-org': ['查看', '转退出'],
    'industry-dept': ['查看', '审核', '转退出'],
    'responsibility-dept': ['查看', '审核', '转退出'],
  },
  rejected: {
    'report-org': ['查看', '编辑', '转退出'],
    'industry-dept': ['查看', '转退出'],
    'responsibility-dept': ['查看', '编辑', '转退出'],
  },
  passed: {
    'report-org': ['查看', '转入下个库', '转退出'],
    'industry-dept': ['查看', '转退出'],
    'responsibility-dept': ['查看', '转退出'],
  },
  stored: {
    'report-org': ['查看', '转退出'],
    'industry-dept': ['查看', '转退出'],
    'responsibility-dept': ['查看', '转退出'],
  },
  exited: {
    'report-org': ['查看'],
    'industry-dept': ['查看'],
    'responsibility-dept': ['查看'],
  },
};

/** 状态 → Tag 配色口径（列表状态列与表单标题 Tag 同源）：终态实心（passed=绿、stored=蓝、exited=灰），rejected=橙描边，其余待办描边蓝 */
export function statusTagProps(status: ProjectStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('passed', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('stored', () => ({ color: 'blue', variant: 'solid' }) as const)
    .with('exited', () => ({ color: 'default', variant: 'solid' }) as const)
    .with('rejected', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .with('draft', 'reviewing', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 状态英文值 → 中文（列表列/表单标题展示） */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status as ProjectStatus] ?? status;
}

// ── 静态字典（后端暂未提供字典接口） ────────────────────────────────
/**
 * 行政区选项（静态，与后端 js_sys_office 的 16 个区局机构一一对应；
 * 机构名去掉“局”字，如 江岸区局→江岸区；不含市直报送单位）。
 */
export const DISTRICTS = [
  '江岸区',
  '江汉区',
  '硚口区',
  '汉阳区',
  '武昌区',
  '青山区',
  '洪山区',
  '东西湖区',
  '蔡甸区',
  '江夏区',
  '黄陂区',
  '新洲区',
  '武汉东湖新技术开发区',
  '武汉经济技术开发区',
  '东湖生态旅游风景区',
  '长江新区',
] as const;

/** 项目归属：市级更新片区内项目与前期规划已入库更新片区关联（后端口径 market/district/scattered） */
export type ProjectAffiliation = 'market' | 'district' | 'scattered';

export const PROJECT_AFFILIATION_OPTIONS = [
  { label: '市级更新片区内', value: 'market' },
  { label: '区级更新片区内', value: 'district' },
  { label: '片区外零星项目', value: 'scattered' },
] as const;

export const PROJECT_AFFILIATION_LABEL: Record<string, string> = {
  market: '市级更新片区内',
  district: '区级更新片区内',
  scattered: '片区外零星项目',
};

/** 市级更新片区（前期规划已入库片区静态清单：选择片区后带出批次/功能定位，二者不可改） */
export type CityRenewalArea = {
  name: string;
  batch: string;
  orientationList: string[];
};

export const CITY_RENEWAL_AREA_LIST: CityRenewalArea[] = [
  { name: '新兴街片', batch: '第一批', orientationList: ['交通导向（TOD）', '文旅导向（COD）'] },
  { name: '一元片', batch: '第一批', orientationList: ['交通导向（TOD）', '公服导向（SOD）'] },
  { name: '二七沿江片', batch: '第一批', orientationList: ['交通导向（TOD）', '康养导向（HOD）'] },
  { name: '四马片', batch: '第二批', orientationList: ['文旅导向（COD）', '生态导向（EOD）'] },
  { name: '黑泥湖片', batch: '第二批', orientationList: ['产业导向（IOD）'] },
  { name: '龟北片', batch: '第二批', orientationList: ['文旅导向（COD）'] },
];

/** 区级更新片区（区级片区不在前期规划库，仅有名称） */
export const DISTRICT_RENEWAL_AREA_LIST = ['红钢城片', '街道口片', '吴家山片', '纸坊片', '前川片'];

/** 全部片区名称（市级 + 区级合集；搜索表单选项） */
export const RENEWAL_AREA_NAME_LIST = [
  ...CITY_RENEWAL_AREA_LIST.map((area) => area.name),
  ...DISTRICT_RENEWAL_AREA_LIST,
];

/** 片区功能定位（多选；中文值=后端主表 func_type_name 顿号分隔口径） */
export const FUNCTION_ORIENTATION_OPTIONS = [
  { label: '交通导向（TOD）', value: '交通导向（TOD）' },
  { label: '文旅导向（COD）', value: '文旅导向（COD）' },
  { label: '公服导向（SOD）', value: '公服导向（SOD）' },
  { label: '生态导向（EOD）', value: '生态导向（EOD）' },
  { label: '产业导向（IOD）', value: '产业导向（IOD）' },
  { label: '康养导向（HOD）', value: '康养导向（HOD）' },
] as const;

/** 片区批次（中文值=后端主表 batch 口径） */
export const RENEWAL_AREA_BATCH_OPTIONS = [
  { label: '第一批', value: '第一批' },
  { label: '第二批', value: '第二批' },
] as const;

/** 片区批次展示映射（旧英文值 → 中文；其他模块存量假数据兼容） */
export const RENEWAL_AREA_BATCH_LABEL: Record<string, string> = {
  first: '第一批',
  second: '第二批',
};

/** 五改类别（中文值=后端主表 wg_big 口径） */
export const FIVE_REFORM_TYPE_OPTIONS = [
  { label: '既有建筑改造', value: '既有建筑改造' },
  { label: '老旧小区改造', value: '老旧小区改造' },
  { label: '老旧街区改造', value: '老旧街区改造' },
  { label: '老旧厂区改造', value: '老旧厂区改造' },
  { label: '城中村改造', value: '城中村改造' },
] as const;

/** 五改细分类别（按五改类别级联） */
export const FIVE_REFORM_SUB_TYPE_MAP: Record<string, string[]> = {
  既有建筑改造: ['危旧房改造', '历史建筑保护'],
  老旧小区改造: ['老旧小区改造', '完整社区建设'],
  老旧街区改造: ['老旧街区改造', '道路沿线片区更新', '历史街区保护利用', '环大学片区更新', '重大项目片区更新'],
  老旧厂区改造: ['老旧工业园区和厂区'],
  城中村改造: ['城中村改造', '景中村改造'],
};

/** 五改类别展示映射（旧英文 key → 中文；其他模块存量假数据兼容，中文值经 ?? 兜底原样） */
export const FIVE_REFORM_TYPE_LABEL: Record<string, string> = {
  'existing-building': '既有建筑改造',
  'old-community': '老旧小区改造',
  'old-street': '老旧街区改造',
  'old-factory': '老旧厂区改造',
  'urban-village': '城中村改造',
};

/** 六带类型（多选，逗号分隔入库） */
export const SIX_BRING_TYPE_OPTIONS = ['带建设', '带保护', '带开发', '带整治', '带管理', '带改造'];

/** 资金来源（国统制[2026]19表3资金分类，分组多选；值为完整分类名，逗号分隔入库） */
export const FUND_SOURCE_OPTIONS = [
  {
    label: '中央预算资金',
    options: [
      '中央预算资金-中央预算内投资',
      '中央预算资金-其他中央财政资金',
      '中央预算资金-国债（增发国债）',
      '中央预算资金-超长期特别国债',
    ].map((name) => ({ label: name, value: name })),
  },
  {
    label: '其他资金',
    options: [
      '省级预算资金',
      '市级及以下预算资金—市级',
      '市级及以下预算资金—区级',
      '地方政府一般债券',
      '地方政府专项债券',
      '产权单位出资',
      '规模化实施运营主体出资',
      '金融机构信贷资金',
      '居民出资',
      '其他资金',
    ].map((name) => ({ label: name, value: name })),
  },
];

/** 行业主管部门（静态；联合审查机构页签用——市住更局/市财政局/市水务局/市发改委） */
export const INDUSTRY_SUPERVISION_DEPT_LIST = ['市住更局', '市财政局', '市水务局', '市发改委'];

/** 是否选项（是/否） */
export const YES_NO_OPTIONS = [
  { label: '是', value: '是' },
  { label: '否', value: '否' },
];

// ── 审查 ───────────────────────────────────────────────────────────
/** 联合审查结论（三选一；空串=未审查） */
export type ReviewResult = '符合' | '不符合' | '不涉及';

export const REVIEW_RESULT_OPTIONS: ReviewResult[] = ['符合', '不符合', '不涉及'];

/** 审查材料区块 key（步骤②五项；与后端 results JSON 键一致） */
export type ReviewSectionKey =
  'approvalOrFiling' | 'territorialSpacePlan' | 'projectImplementationPlan' | 'otherArgument' | 'geoData';

/** 联合审查的评价区块（有序；label 与「策划转储备」步骤的 FormGroup 分区标题一一对应） */
export const REVIEW_SECTIONS: { key: ReviewSectionKey; label: string }[] = [
  { key: 'approvalOrFiling', label: '立项审批或核准备案文件' },
  { key: 'territorialSpacePlan', label: '国土空间规划符合情况' },
  { key: 'projectImplementationPlan', label: '项目实施方案' },
  { key: 'otherArgument', label: '其他论证材料' },
  { key: 'geoData', label: '项目红线范围' },
];

/** 储备转实施审查区块 key（步骤③；与后端 results JSON 键一致） */
export type ImplSectionKey = 'implCondition' | 'implPlanAdjust' | 'implFund';

/** 储备转实施审查区块（有序；label 与步骤③ FormGroup 分区标题一一对应） */
export const IMPL_REVIEW_SECTIONS: { key: ImplSectionKey; label: string }[] = [
  { key: 'implCondition', label: '实施条件确认' },
  { key: 'implPlanAdjust', label: '规划调整情况' },
  { key: 'implFund', label: '资金落实情况' },
];

/** 单个机构对本项目的联合审查（五区块结论 + 意见 + 附件） */
export type ProjectReviewEntry = {
  results: Record<ReviewSectionKey, ReviewResult | ''>;
  opinion: string;
  fileList?: string[];
};

/** 各机构审查记录（key=机构名） */
export type ProjectReviewEntryMap = Record<string, ProjectReviewEntry>;

/** 责任部门审查结论（后端口径 pass=通过审查 / reject=退回修改；空串=暂存不推进） */
export type ResponsibilityConclusion = 'pass' | 'reject';

export const RESPONSIBILITY_CONCLUSION_OPTIONS = [
  { label: '通过审查', value: 'pass' },
  { label: '退回修改', value: 'reject' },
] as const;

export const RESPONSIBILITY_CONCLUSION_LABEL: Record<string, string> = {
  pass: '通过审查',
  reject: '退回修改',
};

/** 责任部门（市住更局）审查记录（五区块结论 + 审查结论 + 意见 + 附件） */
export type ResponsibilityReviewEntry = {
  results: Record<ReviewSectionKey, ReviewResult | ''>;
  conclusion: ResponsibilityConclusion | '';
  opinion: string;
  fileList?: string[];
};

/** 储备转实施审查条目（三区块结论 + 意见 + 附件） */
export type ImplReviewEntry = {
  results: Record<ImplSectionKey, ReviewResult | ''>;
  opinion: string;
  fileList?: string[];
};

export type ImplReviewEntryMap = Record<string, ImplReviewEntry>;

export type ImplResponsibilityReviewEntry = {
  results: Record<ImplSectionKey, ReviewResult | ''>;
  conclusion: ResponsibilityConclusion | '';
  opinion: string;
  fileList?: string[];
};

/** 全空的材料区块结论（fromEntries 只能给宽索引签名，键来源 REVIEW_SECTIONS 完备，断言安全） */
export function emptyReviewResults(): Record<ReviewSectionKey, ReviewResult | ''> {
  return Object.fromEntries(REVIEW_SECTIONS.map(({ key }) => [key, ''])) as Record<ReviewSectionKey, ReviewResult | ''>;
}

/** 全空的储备转实施区块结论 */
export function emptyImplReviewResults(): Record<ImplSectionKey, ReviewResult | ''> {
  return Object.fromEntries(IMPL_REVIEW_SECTIONS.map(({ key }) => [key, ''])) as Record<
    ImplSectionKey,
    ReviewResult | ''
  >;
}

// ── 文件与多选适配（后端 JSON 数组串 / 逗号分隔串 ↔ 前端数组） ──────────

/** 后端文件结构（与 esp plan_files 同构） */
export type LibFileItem = { name: string; url?: string; objectKey?: string; size?: number };

/** JSON 数组串 → 文件数组（空/坏串容错为空数组） */
export function parseFileList(json?: string | null): LibFileItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as LibFileItem[]) : [];
  } catch {
    return [];
  }
}

/** 文件数组 → JSON 数组串（空数组传 null，避免覆盖为 '[]' 噪声） */
export function serializeFileList(files?: string[] | LibFileItem[]): string | null {
  if (!files || !files.length) return null;
  return JSON.stringify(files.map((item) => (typeof item === 'string' ? { name: item } : item)));
}

/** 文件数组 → 名称清单（表单回填用） */
export function fileListNames(files?: string[] | LibFileItem[] | null): string[] {
  if (!files) return [];
  return files.map((item) => (typeof item === 'string' ? item : item.name));
}

/** 逗号/顿号分隔串 → 数组（空值容错） */
export function splitList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// ── 地理数据（shp/dwg 解析接口暂未提供，占位保留） ────────────────────
/** 模拟后端解析：上传 shp/dwg → 后端解析返回 GeoJSON（接口就绪后替换） */
export function parseGeoLocationFile(_file: File): Promise<string> {
  return Promise.reject(new Error('shp/dwg 解析接口暂未接入'));
}

// ── 行/详情模型（后端联查列名小写） ──────────────────────────────────

/** 列表行/详情公共部分（master+extra 联查列） */
export type ProjectRow = Recordable & {
  p_uid: string;
  library: LibraryKey;
  status: ProjectStatus;
  in_library_date?: string;
  lib_project_code?: string;
  exited_from?: LibraryKey;
  exit_date?: string;
  exit_reason?: string;
};

/** 流转日志行 */
export type TransferLogItem = {
  action: string;
  fromLibrary?: string;
  toLibrary?: string;
  fromStatus?: string;
  toStatus?: string;
  roundNo?: number;
  desc?: string;
  operateByName?: string;
  operateDeptName?: string;
  operateDate?: string;
};

/** 详情返回（联查列 + subjects + reviews + transferLogs + currentRound） */
export type LibDetail = ProjectRow & {
  subjects?: {
    industryDepts?: { code: string; name: string }[];
    responsibleDept?: { code: string; name: string } | null;
    reportOrg?: { refType: string; code: string; name: string } | null;
  };
  reviews?: Record<
    string,
    {
      joint: Record<string, { results: Recordable; opinion: string; fileList?: string[] | LibFileItem[] }>;
      resp?: { results: Recordable; conclusion: string; opinion: string; fileList?: string[] | LibFileItem[] };
    }
  >;
  transferLogs?: TransferLogItem[];
  currentRound?: number;
};

// ── 接口函数 ───────────────────────────────────────────────────────

/** 四库统计卡：[{library, cnt, invSum}] */
export function fetchLibStats() {
  return unwrap<{ library: string; cnt: number; invSum: number }[]>(defHttp.get({ url: BASE + '/project/stats' }));
}

/** 分页查询参数（字段名与后端 page 接口一致） */
export type LibPageQuery = {
  library?: string;
  status?: string;
  projectName?: string;
  district?: string;
  areaName?: string;
  batch?: string;
  wgBig?: string;
  year?: string;
  affiliation?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 分页查询：{total, pageNum, pageSize, list} */
export function fetchLibPage(params: LibPageQuery) {
  return unwrap<{ total: number; pageNum: number; pageSize: number; list: ProjectRow[] }>(
    defHttp.get({
      url: BASE + '/project/page',
      params,
    }),
  );
}

/** 项目详情 */
export function fetchLibDetail(pUid: string) {
  return unwrap<LibDetail>(defHttp.get({ url: BASE + '/project/detail', params: { pUid } }));
}

/** 保存（暂存；新建/更新合一）。三组对应表单三步；base/reviewFiles 传 null=不更新该组
 *  （储备库编辑步骤③时只提交 impl 组）；impl 组同步写主表三字段。
 *  base 主体字段口径：industryDepts=[{code,name}]（多选）/responsibleDept={code,name}/
 *  coordinateOrg、implementOrg=单值字符串/reportOrg={refType,code,name}（refType=office|company） */
export function saveLibProject(data: {
  pUid: string | null;
  base: Recordable | null;
  reviewFiles: Recordable | null;
  impl: Recordable;
}) {
  return unwrap<{ pUid: string; library: string; status: string; libProjectCode: string }>(
    defHttp.post({
      url: BASE + '/project/save',
      data,
    }),
  );
}

/** 申请转库（draft/rejected → reviewing；轮次+1） */
export function applyLibTransfer(pUid: string) {
  return unwrap<{ pUid: string; status: string; roundNo: number }>(
    defHttp.post({
      url: BASE + '/project/apply',
      data: { pUid },
    }),
  );
}

/** 保存审查（stage='2'|'3'；联合审查按机构整替；respReview.conclusion 推进状态） */
export function saveLibReview(data: {
  pUid: string;
  stage: string;
  jointReviews: { orgName: string; results: Recordable; opinion: string; fileList: string | null }[];
  respReview?: {
    results: Recordable;
    conclusion: string;
    opinion: string;
    fileList: string | null;
  };
}) {
  return unwrap<{ pUid: string; stage: string; status: string }>(
    defHttp.post({
      url: BASE + '/project/reviewSave',
      data,
    }),
  );
}

/** 转入下个库（passed 后；planning→reserve 重置 draft，reserve→implementing 置 stored） */
export function transferLibNext(pUid: string) {
  return unwrap<{ pUid: string; library: string; status: string }>(
    defHttp.post({
      url: BASE + '/project/transferNext',
      data: { pUid },
    }),
  );
}

/** 转退出（终态；提交即生效，抽屉收集 退出类型/附件/原因说明） */
export function transferLibExit(pUid: string, data: { exitType: string; exitReason: string; exitFiles?: string[] }) {
  return unwrap<{ pUid: string; library: string; exitDate: string }>(
    defHttp.post({
      url: BASE + '/project/transferExit',
      data: { pUid, ...data },
    }),
  );
}

// ── 主体字段选项与外部公司 ─────────────────────────────────────────

/** 行业主管部门候选机构（行业主管部门/责任部门两字段共用选项） */
export function fetchIndustryDeptOptions() {
  return unwrap<{ code: string; name: string }[]>(defHttp.get({ url: BASE + '/dict/industryDeptOptions' }));
}

/** 指定填报主体候选（全部机构+全部公司合并；refType 区分机构/公司编码空间） */
export function fetchReportOrgOptions() {
  return unwrap<{ refType: 'office' | 'company'; code: string; name: string }[]>(
    defHttp.get({
      url: BASE + '/dict/reportOrgOptions',
    }),
  );
}

/** 现场新建外部公司（公司编码=中文名；公司表/机构表重名或超 21 字返回 400） */
export function createReportOrgCompany(name: string) {
  return unwrap<{ refType: 'company'; code: string; name: string }>(
    defHttp.post({
      url: BASE + '/dict/companyCreate',
      data: { name },
    }),
  );
}
