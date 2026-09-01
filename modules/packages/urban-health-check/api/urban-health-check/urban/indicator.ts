/**
 * 市住更局 —— 指标(指标体系子项)数据模型(类型与常量)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含任何接口请求,仅保留页面所需的类型定义;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 指标 实体(指标体系的子孙元素,按一/二/三级维度归属) */
export interface Indicator {
  id?: string;
  code?: string; // 序号
  systemCode?: string; // 所属指标体系编码(如 202601)
  dim1?: string; // 一级维度(如 生态宜居)
  dim2?: string; // 二级维度(如 住房安全)
  dim3?: string; // 三级维度(可空:指标直接挂二级维度时留空)
  indicatorName?: string; // 指标名称
  unit?: string; // 单位(项 / % / 平方米 / 万元 …)
  indicatorSource?: string; // 指标来源((住建部)国家指标 / (省政府)省级指标 / (市政府)市级指标)
  dataSource?: string; // 数据来源((市XX局)部门报送 / 统计年鉴 / 城市体检信息平台)
  responsibleDept?: string; // 责任部门(无责任部门时填 /)
  remarks?: string;
}
