/**
 * 市住更局 —— 指标项结果 数据模型(类型与假数据)
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留页面所需的类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 指标项结果 实体 */
export interface IndicatorResult {
  id?: string;
  code?: string; // 编码(对应指标体系编码,如 202601)
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(区级,武汉街道名)
  adminDivision?: string; // 行政区划(区级,武汉行政区名)
  functionPosition?: string[]; // 功能定位(区级,可多选:TOD/COD/HOD/IOD/EOD,展示时拼接)
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量(项)
  filledCount?: number; // 已填报结果的指标数量(项)
  unfilledCount?: number; // 未填报结果的指标数量(项)
  warningCount?: number; // 预警指标数量(项)
  remarks?: string;
}

/** 演示用假数据(后端接入后删除,改用 api 拉取) */
export const MOCK_LIST: IndicatorResult[] = [
  { id: '1', code: '202601', year: '2026', surveyArea: '后湖街道', adminDivision: '江岸区', functionPosition: ['TOD', 'COD'], indicatorName: '四好基础指标', indicatorCount: 124, filledCount: 100, unfilledCount: 24, warningCount: 8 },
  { id: '2', code: '202602', year: '2026', surveyArea: '水果湖街道', adminDivision: '武昌区', functionPosition: ['COD', 'HOD', 'IOD'], indicatorName: '五改专项指标', indicatorCount: 69, filledCount: 69, unfilledCount: 0, warningCount: 3 },
  { id: '3', code: '202603', year: '2026', surveyArea: '大智街道', adminDivision: '江岸区', functionPosition: ['TOD', 'EOD'], indicatorName: '城市更新实施评估体检指标', indicatorCount: 26, filledCount: 26, unfilledCount: 0, warningCount: 1 },
  { id: '4', code: '202501', year: '2025', surveyArea: '中南路街道', adminDivision: '武昌区', functionPosition: ['COD', 'HOD', 'IOD'], indicatorName: '城市体检指标体系', indicatorCount: 258, filledCount: 258, unfilledCount: 0, warningCount: 12 },
  { id: '5', code: '202401', year: '2024', surveyArea: '二七街道', adminDivision: '江岸区', functionPosition: ['TOD', 'COD'], indicatorName: '城市体检指标体系', indicatorCount: 212, filledCount: 212, unfilledCount: 0, warningCount: 9 },
  { id: '6', code: '202301', year: '2023', surveyArea: '劳动街道', adminDivision: '江岸区', functionPosition: ['TOD', 'EOD'], indicatorName: '城市体检指标体系', indicatorCount: 234, filledCount: 234, unfilledCount: 0, warningCount: 10 },
  { id: '7', code: '202201', year: '2022', surveyArea: '丹水池街道', adminDivision: '江岸区', functionPosition: ['TOD', 'COD'], indicatorName: '城市体检指标体系', indicatorCount: 158, filledCount: 150, unfilledCount: 8, warningCount: 6 },
];
