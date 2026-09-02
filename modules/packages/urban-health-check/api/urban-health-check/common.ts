/**
 * 市住更局 —— 城市体检 公共常量(市级/区级共用)
 *
 * 说明:
 *  - 区级体检搜索表单的附加筛选项(体检片区/行政区划/功能定位)在此统一定义;
 *  - 当前后端尚未介入,选项暂为静态假数据,后端接入后改为字典或接口拉取。
 */

/** 行政区划(武汉市行政区名) */
export const ADMIN_DIVISIONS = [
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
  '汉南区',
] as const;

/** 体检片区(武汉市街道名) */
export const SURVEY_AREAS = [
  '大智街道',
  '一元街道',
  '车站街道',
  '四唯街道',
  '永清街道',
  '西马街道',
  '球场街道',
  '劳动街道',
  '二七街道',
  '新村街道',
  '丹水池街道',
  '后湖街道',
  '塔子湖街道',
  '水果湖街道',
  '中南路街道',
] as const;

/** 功能定位 */
/** 功能定位(可多选,展示时拼接) */
export const FUNCTION_POSITIONS = ['TOD', 'COD', 'HOD', 'IOD', 'EOD'] as const;

/** 字符串常量数组 → Select options */
export function toOptions(arr: readonly string[]) {
  return arr.map((item) => ({ label: item, value: item }));
}
