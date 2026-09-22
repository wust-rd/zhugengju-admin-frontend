/**
 * 市住更局 —— 城市更新专家管理 · 共享数据 store（Pinia）
 *
 * 四个子模块（个人档案 / 在线抽取 / 项目评估 / 专家评价）共用同一套城市更新专家数据与项目数据：
 * 个人档案新增/修改/删除专家，在线抽取的候补池与后续模块即时同步；在线抽取确认选用后把专家标记
 * 为「已入选三师」；专家评价打分生成评价记录并驱动排名；项目评估展示项目及其分配专家与得分。
 * 风格对齐项目 Pinia store（Options API：state / getters / actions，见 core/store/modules）。
 * 当前后端尚未介入：数据为 mock，接口就绪后把 actions 内实现替换为 defHttp 调用。
 */

import { defineStore } from 'pinia';
import { dateUtil } from '@jeesite/core/utils/dateUtil';

/** 城市更新专家实体（个人档案/在线抽取/专家评价共用） */
export type UrbanExpert = {
  id: number;
  /** 记录编码（下钻路由 {id} 参数使用） */
  code: string;
  /** 专家姓名 */
  name: string;
  /** 性别（男/女） */
  gender: '男' | '女';
  /** 年龄 */
  age: number;
  /** 联系电话 */
  phone: string;
  /** 专业领域 */
  field: string;
  /** 职称 */
  title: string;
  /** 单位名称 */
  org: string;
  /** 单位性质 */
  orgType: string;
  /** 入库时间（YYYY-MM-DD） */
  joinDate: string;
  /** 是否已入选 */
  selected: boolean;
  /** 主要经历 */
  career: string;
  /** 过往评审经历 */
  reviewExperience: string;
};

/** 专家评价记录（专家评价打分生成） */
export type EvalRecord = {
  id: number;
  /** 专家 id（关联 UrbanExpert.id） */
  expertId: number;
  /** 活跃度星数（0.5 步进，半星；一颗星 2 分） */
  activityStars: number;
  /** 专业度星数 */
  coverageStars: number;
  /** 效率星数 */
  efficiencyStars: number;
  activityScore: number;
  coverageScore: number;
  efficiencyScore: number;
  /** 评价时间（YYYY-MM-DD） */
  time: string;
  /** 评价人 */
  evaluator: string;
  /** 评价说明 */
  comment: string;
};

/** 城市更新项目（项目评估展示） */
export type UrbanProject = {
  id: number;
  /** 记录编码（下钻路由 {id} 参数使用） */
  code: string;
  /** 项目名称 */
  name: string;
  /** 行政区（取自 URBAN_DISTRICTS 列表） */
  adminDistrict: string;
  /** 片区名称 */
  district: string;
  /** 统筹主体 */
  coordinator: string;
  /** 实施主体 */
  implementOrg: string;
  /** 评审/评估模式（线上/线下/线上+线下） */
  reviewMode: string;
  /** 责任部门 */
  dept: string;
  /** 资金来源 */
  fundSource: string;
  /** 项目投资估算（亿元） */
  investment: string;
  /** 主要项目内容（不超过 500 字） */
  content: string;
  /** 评估材料（文件名列表） */
  materials: string[];
  /** 参与专家姓名列表 */
  experts: string[];
  /** 组长（参与专家之一） */
  leader: string;
  /** 开始时间（YYYY-MM-DD） */
  startDate: string;
  /** 状态四态流转：待提交 → 评估中（等待专家评价项目）→ 待评价（对专家进行评价）→ 已完成 */
  status: string;
  /** 是否已完成对本项目专家的评价（待评价 → 已完成 的条件） */
  expertsEvaluated?: boolean;
  /** 评估结果（通过/不通过，评估页提交） */
  evalResult?: string;
  /** 评估意见 */
  evalOpinion?: string;
  /** 评估附件（文件名列表） */
  evalAttachments?: string[];
};

/** 片区名称列表（项目评估搜索/新增下拉取自这里） */
export const URBAN_DISTRICTS = ['江岸区', '汉阳区', '武昌区', '青山区', '洪山区', '硚口区'] as const;

/** 评审模式选项 */
export const REVIEW_MODES = ['线上', '线下', '线上+线下'] as const;

/** 专业领域选项 */
export const URBAN_FIELDS = [
  '城市规划',
  '建筑设计',
  '市政工程',
  '交通工程',
  '生态环境',
  '风景园林',
  '经济学',
  '法学',
] as const;

/** 职称选项 */
export const URBAN_TITLES = ['高级工程师', '正高级工程师'] as const;

/** 单位性质选项 */
export const URBAN_ORG_TYPES = ['民营企业', '国有企业', '党政机关', '事业单位', '其他'] as const;

/** 提交前校验评估项目必填项（除资金来源/项目投资估算外都必填；表单提交与列表提交共用），返回缺失项提示列表 */
export function validateProjectForSubmit(p: Partial<UrbanProject>): string[] {
  const missing: string[] = [];
  const checks: [unknown, string][] = [
    [p.name, '项目名称'],
    [p.adminDistrict, '行政区'],
    [p.district, '片区名称'],
    [p.coordinator, '统筹主体'],
    [p.implementOrg, '实施主体'],
    [p.reviewMode, '评估模式'],
    [p.dept, '责任部门'],
    [p.content, '主要项目内容'],
  ];
  for (const [val, label] of checks) {
    if (!val) missing.push(label);
  }
  if (!p.materials || p.materials.length === 0) missing.push('评估材料');
  if (!p.experts || p.experts.length < 3) missing.push('至少 3 名参与专家');
  if (!p.leader) missing.push('组长');
  return missing;
}

// ---- 假数据 ----

const FIELDS = [...URBAN_FIELDS];
const TITLES = [...URBAN_TITLES];
const ORG_TYPES = [...URBAN_ORG_TYPES];

const NAMES = [
  '李坤林',
  '唐冬云',
  '梅磊',
  '程素华',
  '杨拓',
  '沈立群',
  '韩雪',
  '曹阳',
  '邓超群',
  '冯丽',
  '龚正',
  '侯建',
  '姜敏',
  '金鑫',
  '孔维',
  '蓝海',
];

const ORGS = ['武汉市城市更新设计院', '中南建筑设计院', '华中科技大学建筑与城市规划学院', '武汉市政工程设计研究院'];

const GENDERS: UrbanExpert['gender'][] = ['男', '男', '女', '男', '女'];
const AGES = [35, 38, 41, 44, 47, 50];

const CAREERS = [
  '长期从事城市更新片区规划与老旧小区改造，主持多项市级重点更新项目，具备丰富评审经验。',
  '深耕城市建筑更新与既有建筑改造，主持完成多栋历史建筑修缮与功能活化项目。',
  '专注市政基础设施更新与综合管廊改造，熟悉城市体检与更新全流程造价管理。',
  '从事城市交通与公共空间更新研究，牵头轨道站点周边一体化更新方案设计。',
  '长期开展城市生态与海绵城市更新研究，主持多项滨水空间与绿地系统更新项目。',
];

const REVIEWS = [
  '多次担任市城市更新专家评审、重点更新片区方案评审专家。',
  '受聘市住更局专家库，参与年度城市更新项目评选与验收评审。',
  '长期参与省级规划成果评优及城市更新重大项目咨询论证。',
  '担任多所高校研究生论文评审与城市更新课题答辩专家。',
];

function createMockExperts(): UrbanExpert[] {
  return NAMES.map((name, i) => ({
    id: i + 1,
    code: `URBANEXP-${String(i + 1).padStart(4, '0')}`,
    name,
    gender: GENDERS[i % GENDERS.length],
    age: AGES[i % AGES.length] + (i % 3),
    phone: `1${[38, 39, 50, 51, 86, 88][i % 6]}${String(10000000 + i * 173291).slice(0, 8)}`,
    field: FIELDS[i % FIELDS.length],
    title: TITLES[i % 3 === 1 ? 1 : 0],
    org: ORGS[i % ORGS.length],
    orgType: ORG_TYPES[(i + 1) % ORG_TYPES.length],
    joinDate: dateUtil()
      .subtract(i * 6, 'day')
      .format('YYYY-MM-DD'),
    selected: false,
    career: CAREERS[i % CAREERS.length],
    reviewExperience: REVIEWS[i % REVIEWS.length],
  }));
}

function createMockProjects(): UrbanProject[] {
  const counts = 50;
  const pool = ['李坤林', '唐冬云', '梅磊', '程素华', '杨拓', '沈立群', '韩雪', '曹阳'];
  const rows: UrbanProject[] = [];
  for (let i = 0; i < counts; i++) {
    const district = URBAN_DISTRICTS[i % URBAN_DISTRICTS.length];
    const experts = [pool[i % pool.length], pool[(i + 2) % pool.length], pool[(i + 4) % pool.length]];
    const expertList = experts.filter((v, idx, arr) => arr.indexOf(v) === idx);
    rows.push({
      id: i + 1,
      code: `URBANPROJ-${String(i + 1).padStart(4, '0')}`,
      name: `${district}老旧小区改造项目`,
      adminDistrict: district,
      district: `${district}中心片`,
      implementOrg: '武汉城市更新投资集团',
      coordinator: '武汉城市更新发展有限公司',
      dept: `${district}住更局`,
      reviewMode: REVIEW_MODES[i % REVIEW_MODES.length],
      fundSource: i % 2 === 0 ? '中央及市级补助资金' : '专项债资金',
      investment: (5 + (i % 8)).toFixed(1),
      content: '实施老旧小区改造、片区基础设施更新、公共服务设施补短板等内容，改善人居环境。',
      materials: ['实施方案'],
      experts: expertList,
      leader: expertList[0] || '',
      startDate: dateUtil()
        .subtract(i * 4, 'day')
        .format('YYYY-MM-DD'),
      status: i % 2 === 0 ? '评估中' : '待提交',
    });
  }
  return rows;
}

/** 在线抽取记录（确认选用生成，存 store 以便切换页签不丢失） */
export type DrawRecord = {
  id: number;
  time: string;
  name: string;
  implementOrg: string;
  coordinator: string;
  fields: string[];
  fieldsText: string;
  count: number;
  experts: UrbanExpert[];
};

/** 城市更新专家库 state 形状 */
type UrbanPoolState = {
  experts: UrbanExpert[];
  evalRecords: EvalRecord[];
  projects: UrbanProject[];
  /** 在线抽取记录（确认选用生成，切换页签不丢失） */
  drawRecords: DrawRecord[];
  /** 是否处于「去抽取为新增项目挑选专家」的跨模块挑选模式 */
  pickMode: boolean;
  /** 在线抽取为新增项目挑好的专家（带回来回填参与专家） */
  pickedExperts: PickedExpert[];
  /** 挑选模式中最近一次确认选用的专家（返回时带回用） */
  pickLatest: PickedExpert[];
  /** 挑选结束后返回的路由（新增项目表单页） */
  pickReturn: string;
  /** 去抽取时带入在线抽取的项目信息（项目名称/统筹主体/实施主体） */
  pickInfo: { name: string; coordinator: string; implementOrg: string };
};

/** 被挑选的专家（新增项目·参与专家行数据） */
export type PickedExpert = {
  name: string;
  org: string;
  phone: string;
};

export const useUrbanExpertStore = defineStore('urbanExpertPool', {
  state: (): UrbanPoolState => ({
    experts: createMockExperts(),
    evalRecords: [],
    projects: createMockProjects(),
    drawRecords: [],
    pickMode: false,
    pickedExperts: [],
    pickLatest: [],
    pickReturn: '',
    pickInfo: { name: '', coordinator: '', implementOrg: '' },
  }),

  getters: {
    /** 个人档案顶部统计卡 */
    urbanStats: (state) => ({
      total: state.experts.length,
      senior: state.experts.filter((e) => e.title === '正高级工程师').length,
      selected: state.experts.filter((e) => e.selected).length,
    }),

    /** 按专家评价计算三维度平均分与次数（返回函数式 getter） */
    avgScoreOf: (state) => {
      return (expertId: number) => {
        const list = state.evalRecords.filter((r) => r.expertId === expertId);
        if (list.length === 0) return { activity: 0, coverage: 0, efficiency: 0, count: 0 };
        const avg = (pick: (r: EvalRecord) => number) =>
          Math.round((list.reduce((sum, r) => sum + pick(r), 0) / list.length) * 10) / 10;
        return {
          activity: avg((r) => r.activityScore),
          coverage: avg((r) => r.coverageScore),
          efficiency: avg((r) => r.efficiencyScore),
          count: list.length,
        };
      };
    },
  },

  actions: {
    /** 星数 → 得分（一颗星 2 分、半颗星 1 分，满分 5 星 = 10 分） */
    starsToScore(stars: number): number {
      return Math.round(stars * 2 * 10) / 10;
    },

    /** 新增专家（插到最前；code/入库时间由系统自动生成；TODO: 后端就绪后改为接口提交） */
    addExpert(data: Partial<UrbanExpert>) {
      const id = this.experts.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      const code = `URBANEXP-${String(id).padStart(4, '0')}`;
      this.experts = [
        { ...createDefaultExpert(), ...data, id, code, joinDate: dateUtil().format('YYYY-MM-DD') },
        ...this.experts,
      ];
    },

    /** 修改专家（原地合并；TODO: 后端就绪后改为接口提交） */
    updateExpert(id: number, data: Partial<UrbanExpert>) {
      this.experts = this.experts.map((e) => (e.id === id ? { ...e, ...data } : e));
    },

    /** 删除专家（同时清理其评价记录；TODO: 后端就绪后改为接口提交） */
    removeExpert(id: number) {
      this.experts = this.experts.filter((e) => e.id !== id);
      this.evalRecords = this.evalRecords.filter((r) => r.expertId !== id);
    },

    /** 将指定专家标记为「已入选」（在线抽取确认选用后调用） */
    markSelected(ids: number[]) {
      this.experts = this.experts.map((e) => (ids.includes(e.id) ? { ...e, selected: true } : e));
    },

    /** 新增评估项目（插到最前；code 自动生成；TODO: 后端就绪后改为接口提交） */
    addProject(data: Partial<UrbanProject>) {
      const id = this.projects.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      const code = `URBANPROJ-${String(id).padStart(4, '0')}`;
      this.projects = [{ ...data, id, code } as UrbanProject, ...this.projects];
    },

    /** 更新项目（原地合并；表单保存/状态流转共用） */
    updateProject(id: number, data: Partial<UrbanProject>) {
      this.projects = this.projects.map((p) => (p.id === id ? { ...p, ...data } : p));
    },

    /** 完成对项目专家的评价（待评价 → 已完成；TODO: 后端就绪后改为接口提交） */
    finishExpertEval(id: number) {
      this.updateProject(id, { expertsEvaluated: true, status: '已完成' });
    },

    /** 删除评估项目（TODO: 后端就绪后改为接口提交） */
    removeProject(id: number) {
      this.projects = this.projects.filter((p) => p.id !== id);
    },

    /** 进入「为新增项目挑选专家」的跨模块模式（去抽取前调用，returnRoute 为挑完返回地址，pickInfo 为带入抽取页的项目信息） */
    beginPick(returnRoute: string, pickInfo?: { name: string; coordinator: string; implementOrg: string }) {
      this.pickMode = true;
      this.pickedExperts = [];
      this.pickLatest = [];
      this.pickReturn = returnRoute;
      this.pickInfo = pickInfo ? { ...pickInfo } : { name: '', coordinator: '', implementOrg: '' };
    },

    /** 退出挑选模式 */
    endPick() {
      this.pickMode = false;
    },

    /** 在线抽取把挑好的专家写入（名称/单位/联系方式），供新增项目回填 */
    setPickedExperts(list: PickedExpert[]) {
      this.pickedExperts = list;
    },

    /** 记录挑选模式中最近一次确认选用的专家（每次确认选用覆盖；返回时带回用） */
    setPickLatest(list: PickedExpert[]) {
      this.pickLatest = list;
    },

    /** 新增抽取记录（插到最前；确认选用生成） */
    addDrawRecord(rec: DrawRecord) {
      this.drawRecords = [rec, ...this.drawRecords];
    },

    /** 按条件查询专家（name/org 模糊、field 精确、selected 精确 'yes'/'no'） */
    queryExperts(params: Recordable): UrbanExpert[] {
      const name = String(params.name ?? '').trim();
      const org = String(params.org ?? '').trim();
      const field = String(params.field ?? '').trim();
      const { selected } = params;
      return this.experts.filter((e) => {
        if (name && !e.name.includes(name)) return false;
        if (org && !e.org.includes(org)) return false;
        if (field && e.field !== field) return false;
        if (selected === 'yes' && !e.selected) return false;
        if (selected === 'no' && e.selected) return false;
        return true;
      });
    },

    /** 新增评价记录（三维度星数，得分自动换算；TODO: 后端就绪后改为接口提交） */
    addEvaluation(payload: {
      expertId: number;
      activityStars: number;
      coverageStars: number;
      efficiencyStars: number;
      evaluator?: string;
      time?: string;
      comment?: string;
    }) {
      const id = this.evalRecords.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      this.evalRecords = [
        {
          id,
          expertId: payload.expertId,
          activityStars: payload.activityStars,
          coverageStars: payload.coverageStars,
          efficiencyStars: payload.efficiencyStars,
          activityScore: this.starsToScore(payload.activityStars),
          coverageScore: this.starsToScore(payload.coverageStars),
          efficiencyScore: this.starsToScore(payload.efficiencyStars),
          time: payload.time ?? '',
          evaluator: payload.evaluator ?? '管理员',
          comment: payload.comment ?? '',
        },
        ...this.evalRecords,
      ];
    },

    /** 删除评价记录（TODO: 后端就绪后改为接口提交） */
    removeEvaluation(id: number) {
      this.evalRecords = this.evalRecords.filter((r) => r.id !== id);
    },

    /** 某专家的评价记录（按时间倒序，新在前） */
    recordsOf(expertId: number): EvalRecord[] {
      return this.evalRecords.filter((r) => r.expertId === expertId);
    },

    /** 随机抽取：按领域集合过滤 + 回避已入选 + 排除已展示者 + 排除与实施/统筹主体同单位的专家，洗牌取 count 名 */
    drawExperts(
      count: number,
      fields: string[],
      onlyUnselected: boolean,
      excludeIds: number[] = [],
      excludeOrgs: string[] = [],
    ): UrbanExpert[] {
      let pool = this.experts.filter((e) => fields.includes(e.field));
      if (onlyUnselected) pool = pool.filter((e) => !e.selected);
      if (excludeIds.length > 0) pool = pool.filter((e) => !excludeIds.includes(e.id));
      if (excludeOrgs.length > 0) pool = pool.filter((e) => !excludeOrgs.includes(e.org));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    },
  },
});

/** 新增专家的默认值（addExpert 合并用） */
function createDefaultExpert(): UrbanExpert {
  return {
    id: 0,
    code: '',
    name: '',
    gender: '男',
    age: 35,
    phone: '',
    field: FIELDS[0] as string,
    title: TITLES[0] as string,
    org: '',
    orgType: ORG_TYPES[0] as string,
    joinDate: '',
    selected: false,
    career: '',
    reviewExperience: '',
  };
}
