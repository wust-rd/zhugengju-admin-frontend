/**
 * 市住更局 —— 报告生成 数据模型(类型、常量与假数据)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 报告类型 */
export const REPORT_TYPES = ['年度体检报告', '专项体检报告', '季度体检报告'] as const;

/** 章节设置(可多选,可输入自定义章节) */
export const REPORT_CHAPTERS = [
  '总体评价',
  '指标体系',
  '满意度分析',
  '指标分析',
  '问题清单',
  '资源清单',
  '治理建议',
  '建议项目库',
] as const;

/** 报告状态:0 生成中,1 已生成 */
export const REPORT_STATUS = {
  GENERATING: '0',
  DONE: '1',
} as const;

/** 预览用示例 PDF 地址(后端接入后改为报告文件地址) */
export const PREVIEW_PDF_URL = 'https://501351981.github.io/vue-office/examples/dist/static/test-files/test.pdf';

/** 报告生成记录 实体 */
export interface ReportRecord {
  id?: string;
  code?: string; // 序号(业务编码)
  reportType?: string; // 报告类型
  year?: string; // 体检年份
  target?: string; // 体检对象(武汉市或各行政区)
  surveyArea?: string; // 片区选择(体检片区/街道)
  reportName?: string; // 报告名称
  chapters?: string[]; // 章节设置(可多选)
  createTime?: string; // 生成时间(yyyy-MM-dd HH:mm:ss)
  status?: string; // 状态(0 生成中 / 1 已生成)
  remarks?: string;
}

/** 状态显示文字(Tag 配色与 indicator-system/list 一致:已生成=深蓝实心,生成中=蓝描边) */
export const REPORT_STATUS_TEXT: Record<string, string> = {
  [REPORT_STATUS.GENERATING]: '生成中',
  [REPORT_STATUS.DONE]: '已生成',
};

/** 演示用假数据(后端接入后删除,改用 api 拉取) */
export const MOCK_LIST: ReportRecord[] = [
  {
    id: '1',
    code: '1',
    reportType: '年度体检报告',
    year: '2025',
    target: '武汉市',
    surveyArea: '后湖街道',
    reportName: '2025年度武汉市城市体检总报告',
    chapters: ['总体评价', '指标体系', '满意度分析', '指标分析', '问题清单', '资源清单', '治理建议', '建议项目库'],
    createTime: '2025-12-20 10:23:45',
    status: REPORT_STATUS.DONE,
  },
  {
    id: '2',
    code: '2',
    reportType: '专项体检报告',
    year: '2025',
    target: '江岸区',
    surveyArea: '大智街道',
    reportName: '2025年度江岸区住房安全专项体检报告',
    chapters: ['总体评价', '指标分析', '问题清单'],
    createTime: '2025-12-21 14:08:12',
    status: REPORT_STATUS.DONE,
  },
  {
    id: '3',
    code: '3',
    reportType: '年度体检报告',
    year: '2026',
    target: '武昌区',
    surveyArea: '水果湖街道',
    reportName: '2026年度武昌区城市体检综合分析报告',
    chapters: ['总体评价', '指标体系', '指标分析', '治理建议'],
    createTime: '2026-01-06 09:15:30',
    status: REPORT_STATUS.GENERATING,
  },
];
