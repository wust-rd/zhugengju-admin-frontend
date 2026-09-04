/**
 * 市住更局 —— 满意度调查 数据模型(类型与假数据)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留页面所需的类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 满意度调查(年度记录)实体 */
export type SatisfactionSurvey = {
  id?: string;
  code?: string; // 序号(业务编码)
  year?: string; // 调查年份
  reportDate?: string; // 填报时间(yyyy-MM-dd)
  dataSource?: string; // 数据来源(第三方调查机构 / 在线问卷平台 / 社区入户调查)
  questionCount?: number; // 调查问题数量(项)
  validQuestionnaireCount?: number; // 有效调查问卷数(份)
  overallSatisfaction?: number; // 综合满意度(百分比数字,如 85.6 表示 85.6%)
  remarks?: string;
};

/** 演示用假数据(后端接入后删除,改用 api 拉取) */
export const MOCK_LIST: SatisfactionSurvey[] = [
  { id: '1', code: '1', year: '2026', reportDate: '2026-08-31', dataSource: '在线问卷平台', questionCount: 30, validQuestionnaireCount: 1520, overallSatisfaction: 85.6 },
  { id: '2', code: '2', year: '2025', reportDate: '2025-08-31', dataSource: '第三方调查机构', questionCount: 28, validQuestionnaireCount: 2130, overallSatisfaction: 92.3 },
  { id: '3', code: '3', year: '2024', reportDate: '2024-08-31', dataSource: '第三方调查机构', questionCount: 26, validQuestionnaireCount: 1895, overallSatisfaction: 88.1 },
  { id: '4', code: '4', year: '2023', reportDate: '2023-08-31', dataSource: '社区入户调查', questionCount: 25, validQuestionnaireCount: 1760, overallSatisfaction: 86.5 },
  { id: '5', code: '5', year: '2022', reportDate: '2022-08-31', dataSource: '社区入户调查', questionCount: 24, validQuestionnaireCount: 1580, overallSatisfaction: 84.2 },
];

/** 满意度调查问题(某年调查的下钻明细)实体 */
export type SurveyQuestion = {
  id?: string;
  code?: string; // 序号
  year?: string; // 所属调查年份
  questionName?: string; // 调查问题
  target?: string; // 面向对象(全体居民 / 社区居民 / 企业经营者)
  verySatisfied?: number; // 非常满意(%)
  satisfied?: number; // 满意(%)
  neutral?: number; // 一般(%)
  dissatisfied?: number; // 不满意(%)
  veryDissatisfied?: number; // 非常不满意(%)
  remarks?: string;
};

/** 问题演示假数据(五档占比合计 100;后端接入后删除,改用 api 按年份拉取) */
export const MOCK_QUESTIONS: SurveyQuestion[] = [
  { id: '1', code: '1', year: '2026', questionName: '您对本市住房保障工作是否满意？', target: '全体居民', verySatisfied: 32.5, satisfied: 45.2, neutral: 15.8, dissatisfied: 5.0, veryDissatisfied: 1.5 },
  { id: '2', code: '2', year: '2026', questionName: '您对所在社区的老旧小区改造效果是否满意？', target: '社区居民', verySatisfied: 28.6, satisfied: 42.1, neutral: 18.3, dissatisfied: 8.0, veryDissatisfied: 3.0 },
  { id: '3', code: '3', year: '2026', questionName: '您对本市城市体检工作总体是否满意？', target: '全体居民', verySatisfied: 35.1, satisfied: 44.6, neutral: 14.2, dissatisfied: 4.3, veryDissatisfied: 1.8 },
  { id: '4', code: '4', year: '2026', questionName: '您对居住小区物业服务是否满意？', target: '社区居民', verySatisfied: 25.3, satisfied: 40.8, neutral: 20.5, dissatisfied: 9.2, veryDissatisfied: 4.2 },
  { id: '5', code: '5', year: '2026', questionName: '您对本市公园绿地建设是否满意？', target: '全体居民', verySatisfied: 38.2, satisfied: 42.7, neutral: 13.5, dissatisfied: 4.0, veryDissatisfied: 1.6 },
  { id: '6', code: '6', year: '2026', questionName: '您对本市城市交通出行状况是否满意？', target: '全体居民', verySatisfied: 26.4, satisfied: 41.5, neutral: 19.8, dissatisfied: 8.7, veryDissatisfied: 3.6 },
  { id: '7', code: '7', year: '2026', questionName: '您对本市历史文化保护工作是否满意？', target: '全体居民', verySatisfied: 30.8, satisfied: 43.3, neutral: 17.6, dissatisfied: 5.9, veryDissatisfied: 2.4 },
  { id: '8', code: '8', year: '2026', questionName: '您对所在地区营商环境是否满意？', target: '企业经营者', verySatisfied: 33.6, satisfied: 45.0, neutral: 15.2, dissatisfied: 4.5, veryDissatisfied: 1.7 },
  { id: '9', code: '9', year: '2026', questionName: '您对社区养老服务是否满意？', target: '社区居民', verySatisfied: 24.8, satisfied: 39.6, neutral: 21.4, dissatisfied: 9.8, veryDissatisfied: 4.4 },
  { id: '10', code: '10', year: '2026', questionName: '您对城市更新中的公众参与程度是否满意？', target: '全体居民', verySatisfied: 22.7, satisfied: 38.9, neutral: 23.5, dissatisfied: 10.6, veryDissatisfied: 4.3 },
];
