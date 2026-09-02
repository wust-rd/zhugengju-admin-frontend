/**
 * 市住更局 —— 区级体检成果 数据模型(类型、常量与假数据)
 *
 * 与市级的区别(转置关系):市级「一年一行、目录为单列」,区级「五类成果清单展开为五列」,
 * 行 = 某年/某区/某片区的成果记录,列:体检年份/体检片区/行政区划/功能定位/五类清单/填报单位。
 *
 * 说明:
 *  - 当前后端尚未介入,本文件不包含接口请求,仅保留类型定义与假数据;
 *    后端就绪后在本文件补充接口即可(约定同 indicator-system.ts 头注释)。
 */

/** 五类体检成果清单(即表格的五列) */
export const DISTRICT_CATALOGS = [
  '问题整治清单',
  '发展机遇清单',
  '更新诉求清单',
  '基础资料库',
  '更新项目储备建议库',
] as const;

/** 区级体检成果 实体 */
export interface DistrictAchievement {
  id?: string;
  code?: string; // 序号(业务编码)
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(武汉街道名)
  adminDivision?: string; // 行政区划(武汉行政区名)
  functionPosition?: string[]; // 功能定位(可多选:TOD/COD/HOD/IOD/EOD,展示时拼接)
  problemListStatus?: string; // 问题整治清单提交状态(已提交 / 待提交)
  opportunityListStatus?: string; // 发展机遇清单提交状态(已提交 / 待提交)
  demandListStatus?: string; // 更新诉求清单提交状态(已提交 / 待提交)
  baseLibraryStatus?: string; // 基础资料库提交状态(已提交 / 待提交)
  reserveLibraryStatus?: string; // 更新项目储备建议库提交状态(已提交 / 待提交)
  reportUnit?: string; // 填报单位
  reportDate?: string; // 填报时间(yyyy-MM-dd)
  submitStatus?: string; // 提交状态(0 待提交 / 1 已提交)
  remarks?: string;
}

/** 演示用假数据(后端接入后删除,改用 api 拉取) */
export const MOCK_LIST: DistrictAchievement[] = [
  { id: '1', code: '1', year: '2026', surveyArea: '后湖街道', adminDivision: '江岸区', functionPosition: ['TOD', 'COD'], problemListStatus: '待提交', opportunityListStatus: '已提交', demandListStatus: '待提交', baseLibraryStatus: '已提交', reserveLibraryStatus: '待提交', reportUnit: '江岸区住更局', reportDate: '2026-12-10', submitStatus: '0' },
  { id: '2', code: '2', year: '2025', surveyArea: '水果湖街道', adminDivision: '武昌区', functionPosition: ['COD', 'HOD', 'IOD'], problemListStatus: '已提交', opportunityListStatus: '已提交', demandListStatus: '已提交', baseLibraryStatus: '已提交', reserveLibraryStatus: '已提交', reportUnit: '武昌区住更局', reportDate: '2025-12-10', submitStatus: '1' },
  { id: '3', code: '3', year: '2024', surveyArea: '大智街道', adminDivision: '江岸区', functionPosition: ['TOD', 'EOD'], problemListStatus: '已提交', opportunityListStatus: '已提交', demandListStatus: '待提交', baseLibraryStatus: '已提交', reserveLibraryStatus: '已提交', reportUnit: '江岸区住更局', reportDate: '2024-12-10', submitStatus: '1' },
  { id: '4', code: '4', year: '2023', surveyArea: '中南路街道', adminDivision: '武昌区', functionPosition: ['COD', 'IOD'], problemListStatus: '已提交', opportunityListStatus: '待提交', demandListStatus: '已提交', baseLibraryStatus: '已提交', reserveLibraryStatus: '已提交', reportUnit: '武昌区住更局', reportDate: '2023-12-10', submitStatus: '1' },
  { id: '5', code: '5', year: '2022', surveyArea: '二七街道', adminDivision: '江岸区', functionPosition: ['TOD', 'COD', 'HOD'], problemListStatus: '已提交', opportunityListStatus: '已提交', demandListStatus: '已提交', baseLibraryStatus: '已提交', reserveLibraryStatus: '已提交', reportUnit: '江岸区住更局', reportDate: '2022-12-10', submitStatus: '1' },
];
