/**
 * 市住更局 —— 体检成果 数据模型(类型、常量与假数据)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留页面所需的类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 程度范围 */
export const ACHIEVEMENT_DEGREE = {
  GENERAL: '一般',
  SEVERE: '严重',
  EXTREME: '特别严重',
} as const;

/** 体检成果(目录)实体 */
export type Achievement = {
  id?: string;
  code?: string; // 序号(业务编码)
  year?: string; // 体检年份
  catalog?: string; // 体检成果目录(作为 show 页路由 {id})
  reportDate?: string; // 填报时间(yyyy-MM-dd)
  submitStatus?: string; // 提交状态(0 待提交 / 1 已提交,复用 indicator-system 的 SUBMIT_STATUS)
  remarks?: string;
};

/** 成果分析明细(某目录下的下钻记录)实体 */
export type AchievementAnalysis = {
  id?: string;
  code?: string; // 序号
  catalog?: string; // 所属体检成果目录
  dim1?: string; // 一级维度
  analysis?: string; // 分析描述
  degree?: string; // 程度范围(一般 / 严重 / 特别严重)
  remarks?: string;
};

/** 演示用假数据(后端接入后删除,改用 api 拉取) */
export const MOCK_LIST: Achievement[] = [
  { id: '1', code: '1', year: '2026', catalog: '问题整治清单', reportDate: '2026-12-10', submitStatus: '0' },
  { id: '2', code: '2', year: '2025', catalog: '发展机遇清单', reportDate: '2025-12-10', submitStatus: '1' },
  { id: '3', code: '3', year: '2024', catalog: '更新诉求清单', reportDate: '2024-12-10', submitStatus: '1' },
  { id: '4', code: '4', year: '2023', catalog: '基础资料库', reportDate: '2023-12-10', submitStatus: '1' },
  { id: '5', code: '5', year: '2022', catalog: '更新项目储备建议库', reportDate: '2022-12-10', submitStatus: '1' },
];

/** 分析明细演示假数据(后端接入后删除,改用 api 按目录拉取) */
export const MOCK_ANALYSES: AchievementAnalysis[] = [
  {
    id: '1',
    code: '1',
    catalog: '住房安全专项成果',
    dim1: '生态宜居',
    analysis: '部分老旧房屋结构安全评估覆盖率偏低,隐患排查整治仍有缺口,需加大排查频次与整治力度。',
    degree: ACHIEVEMENT_DEGREE.GENERAL,
  },
  {
    id: '2',
    code: '2',
    catalog: '住房安全专项成果',
    dim1: '健康舒适',
    analysis: '部分老旧小区管线老化严重,消防设施缺口较大,已影响居民基本居住安全,需限期整改。',
    degree: ACHIEVEMENT_DEGREE.SEVERE,
  },
  {
    id: '3',
    code: '3',
    catalog: '住房安全专项成果',
    dim1: '安全韧性',
    analysis: '燃气管网超期服役比例高,近三年泄漏事故呈上升趋势,存在重大安全隐患,须立即开展专项治理。',
    degree: ACHIEVEMENT_DEGREE.EXTREME,
  },
  {
    id: '4',
    code: '4',
    catalog: '住房安全专项成果',
    dim1: '管理有序',
    analysis: '房屋安全管理制度基本健全,责任落实总体到位,常态巡查机制运行良好。',
    degree: ACHIEVEMENT_DEGREE.GENERAL,
  },
];
