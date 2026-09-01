/**
 * 市住更局 —— 指标(指标体系子项)数据模型(类型与常量)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含任何接口请求,仅保留页面所需的类型定义;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 评估结果 */
export const EVAL_RESULT = {
  POOR: '较差',
  FAIR: '一般',
  GOOD: '较好',
  GREAT: '很好',
  NO_STANDARD: '无标准',
} as const;

/** 预警状态 */
export const WARNING_STATUS = {
  RED: '红色预警',
  YELLOW: '黄色预警',
  NORMAL: '正常',
  NONE: '无',
} as const;

/** 指标 实体(指标体系的子孙元素,按一/二/三级维度归属) */
export interface Indicator {
  id?: string;
  code?: string; // 序号
  systemCode?: string; // 所属指标体系编码(如 202601)
  dim1?: string; // 一级维度(如 生态宜居)
  dim2?: string; // 二级维度(如 住房安全)
  dim3?: string; // 三级维度(可空:指标直接挂二级维度时留空)
  indicatorName?: string; // 指标项名称
  unit?: string; // 指标单位(项 / % / 平方米 / 万元 …)
  indicatorValue?: number; // 指标值(填报结果,数字)
  standardValue?: number; // 标准值/目标值(数字;无标准的指标为空)
  evalResult?: string; // 评估结果(较差 / 一般 / 较好 / 很好 / 无标准)
  warningStatus?: string; // 预警状态(红色预警 / 黄色预警 / 正常 / 无)
  indicatorSource?: string; // 指标来源((住建部)国家指标 / (省政府)省级指标 / (市政府)市级指标)
  dataSource?: string; // 数据来源((市XX局)部门报送 / 统计年鉴 / 城市体检信息平台)
  responsibleDept?: string; // 责任部门(无责任部门时填 /)
  remarks?: string;
}
