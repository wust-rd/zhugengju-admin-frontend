/**
 * 市住更局 —— 报告生成 数据模型(类型、常量与假数据)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 报告专题(可多选) */
export const REPORT_TOPICS = ['住房安全', '生态宜居', '绿色低碳', '风貌品质', '管理有序'] as const;

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
  year?: string; // 体检年份
  reportName?: string; // 报告名称
  topics?: string[]; // 包含专题(可多选)
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
  { id: '1', code: '1', year: '2025', reportName: '2025年度城市体检总报告', topics: ['住房安全', '生态宜居'], createTime: '2025-12-20 10:23:45', status: REPORT_STATUS.DONE },
  { id: '2', code: '2', year: '2025', reportName: '2025年度城市体检住房安全专题报告', topics: ['住房安全'], createTime: '2025-12-21 14:08:12', status: REPORT_STATUS.DONE },
  { id: '3', code: '3', year: '2025', reportName: '2025年度城市体检综合分析报告', topics: ['生态宜居', '绿色低碳', '风貌品质'], createTime: '2026-01-06 09:15:30', status: REPORT_STATUS.GENERATING },
];
