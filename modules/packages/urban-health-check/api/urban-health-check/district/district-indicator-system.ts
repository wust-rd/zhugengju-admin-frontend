/**
 * 市住更局 —— 区级体检指标体系 接口层（后端 modules/check，/cityCheck/district/*，文档 #12~#25）
 *
 * 模型（字段与后端驼峰同名直用）：
 *  体系行（表1）：{id, sysNo, setYear, planYear, areaCode, areaName, district, funcOrientation,
 *    areaSizeKm2, residentPopulation, fillUnit, responsibleUser, contactPhone,
 *    fillProgress, fillStatus, submitStatus, auditStatus, enableStatus, indicatorCount}
 *    同年同片区唯一；已提交禁改（可撤回）；sysNo 后端自动（区首字母+年份+编号）。
 *  指标项行（表2）：{id, setId, firstDimension(体检维度), secondDimension, thirdDimension,
 *    checkItemName(体检项), itemNo, itemName, itemUnit, itemSource, responsibilityDept,
 *    isRequired(1必选禁改禁删), materialCount}
 *  标准库（std，2026 片区体检指标表 59 项种子）：{id(=stdId), itemNo, itemName, itemUnit,
 *    itemSource, isRequired, dimensionName, checkItemName, sortNo}
 *    基础运行评估 17 项必选（isRequired=1）；功能发展评估 42 项可选。
 *
 * 区级与市级差异：各片区自选指标项（applyStdIndicator 多选应用标准库项，
 * 增量模式按 itemNo 跳过已存在；reset=true 清空重建并级联清理结果/资料）；
 * 必选指标项在列表上直接展示且不可编辑/删除（后端强校验 400）。
 * 片区与前期规划模块关联：体检片区下拉取 esp 地图片区（A_UID 唯一号存 areaCode）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { CHECK_API, unwrap, pageGet } from '../common';

const { adminPath } = useGlobSetting();

/** 区级体检指标体系实体 */
export type DistrictSet = {
  id?: string;
  sysNo?: string; // 业务编码（区首字母+年份+编号，后端自动）
  setYear?: string; // 体检年份
  planYear?: string; // 规划年份
  areaCode?: string; // 片区代码（=前期规划片区唯一号 A_UID）
  areaName?: string; // 片区名称（必填；同年同片区唯一）
  district?: string; // 行政区（必填，武汉行政区）
  districtCode?: string;
  funcOrientation?: string; // 片区功能定位（逗号分隔）
  areaSizeKm2?: number; // 片区面积（平方公里）
  residentPopulation?: number; // 常住人口数
  fillUnit?: string; // 填报单位（必填）
  responsibleUser?: string; // 填报责任人
  contactPhone?: string; // 联系电话
  fillProgress?: number; // 填报进度(%)
  fillStatus?: number; // 0未填1填报中2已填
  submitStatus?: number; // 0待提交1已提交
  auditStatus?: number; // 0待审1中2通过3驳回
  enableStatus?: number; // 0停用1启用
  indicatorCount?: number; // 指标项数量
  updateDate?: string;
  remarks?: string;
};

/** 区级指标项实体 */
export type DistrictItem = {
  id?: string;
  setId?: string;
  setYear?: string;
  sysNo?: string;
  firstDimension?: string; // 体检维度（基础运行评估/功能发展评估）
  secondDimension?: string;
  thirdDimension?: string;
  checkItemName?: string; // 体检项（人口/用地/…/品质居住/…）
  itemNo?: number; // 业务序号（体系内唯一，随标准库）
  itemName?: string; // 指标项名称
  itemUnit?: string; // 指标单位
  itemSource?: string; // 指标来源
  dataSource?: string;
  responsibilityDept?: string; // 责任部门
  itemExplain?: string;
  isRequired?: number; // 1=必选（禁改禁删）
  materialCount?: number;
  sortNo?: number;
  remarks?: string;
};

/** 标准库推荐指标项（2026 片区体检指标表种子，59 项） */
export type StdIndicator = {
  id?: string; // stdId（applyStdIndicator 入参用）
  itemNo?: number;
  itemName?: string;
  itemUnit?: string;
  itemSource?: string;
  isRequired?: number;
  dimensionName?: string; // 体检维度
  checkItemName?: string; // 体检项
  sortNo?: number;
};

/** 前期规划片区行（GET /a/esp/map/areas，取唯一号/名称/行政区/功能定位/面积做联动带出） */
export type EspAreaOption = {
  uid: string; // A_UID 片区唯一号
  name: string; // 片区名称
  district: string; // 行政区（原文，可能为「武汉经开区」等长写法）
  funcType: string; // 功能定位中文名（多个逗号分隔）
  areaHa: number | string | null; // 图斑面积（公顷）
};

// ==================== 体系（表1） ====================

/** 分页查询体系（BasicTable api 直用；year/districtName → 后端 setYear/district） */
export async function districtSetPage(params: Recordable) {
  const { year, districtName, ...rest } = params ?? {};
  return pageGet<DistrictSet>(CHECK_API + '/district/set/page', {
    ...rest,
    setYear: year,
    district: districtName,
  });
}

/** 体系详情 */
export async function districtSetInfo(id: string): Promise<DistrictSet> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/district/set/info/${id}` }));
}

/** 保存体系（新增/修改合一；必填 setYear/areaName/district/fillUnit；同年同片区唯一） */
export async function districtSetSave(data: Partial<DistrictSet>): Promise<{ id: string; sysNo: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/set/save', data }));
}

/** 批量删除体系（级联删指标项/结果/资料；已提交或启用中禁止删除） */
export async function districtSetDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/set/delete', data: { ids } }));
}

/** 提交体系 */
export async function districtSetSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/set/submit', data: { id } }));
}

/** 撤回提交 */
export async function districtSetCancelSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/set/cancelSubmit', data: { id } }));
}

// ==================== 指标项（表2） ====================

/** 分页查询指标项（BasicTable api 直用；setId 必填，其余筛选后端内存过滤） */
export async function districtItemPage(params: Recordable) {
  const { itemId, dimension, checkItem, ...rest } = params ?? {};
  return pageGet<DistrictItem>(CHECK_API + '/district/item/page', {
    ...rest,
    itemName: itemId,
    firstDimension: dimension,
    checkItemName: checkItem,
  });
}

/** 拉取体系下全部指标项（编辑页本地筛选/已选判断用） */
export async function districtItemList(setId: string) {
  const page = await pageGet<DistrictItem>(CHECK_API + '/district/item/page', {
    setId,
    pageNo: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

/** 保存指标项（新增/修改合一；必选指标项后端禁止编辑 400） */
export async function districtItemSave(data: Partial<DistrictItem> & { setId: string }): Promise<{ id: string; itemNo?: number; warn?: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/item/save', data }));
}

/** 批量删除指标项（必选/已产生结果数据的后端拒绝；级联清资料） */
export async function districtItemDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/item/delete', data: { ids } }));
}

/**
 * 应用标准库指标项（多选生成体系指标项）
 * items 传 [{stdId}]（维度/体检项/单位/必选标记等后端自动从标准库带出）；
 * 增量模式按 itemNo 跳过已存在；reset=true 清空重建（级联清理结果/资料）。
 */
export async function districtItemApplyStd(
  setId: string,
  items: { stdId: string }[],
  reset = false,
): Promise<{ insertCount: number; skipCount: number; itemCount: number }> {
  return unwrap(
    await defHttp.postJson({
      url: CHECK_API + '/district/item/applyStdIndicator',
      data: { setId, reset, items },
    }),
  );
}

// ==================== 标准库（std） ====================

/** 分页查询标准库推荐指标项（59 项；支持 itemName/isRequired 筛选） */
export async function stdIndicatorPage(params: Recordable = {}) {
  return pageGet<StdIndicator>(CHECK_API + '/std/indicator/page', { ...params, pageSize: 100 });
}

/** 拉取标准库全部指标项（多选弹窗数据源） */
export async function stdIndicatorList(): Promise<StdIndicator[]> {
  const page = await pageGet<StdIndicator>(CHECK_API + '/std/indicator/page', {
    pageNum: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

// ==================== 前期规划片区（esp 地图，登录态接口） ====================

/** 前期规划片区列表（约 182 个；供体检片区下拉并与前期规划片区关联） */
export async function fetchEspAreas(): Promise<EspAreaOption[]> {
  const body = await defHttp.get({ url: adminPath + '/esp/map/areas', params: {} });
  const rows = unwrap<any[]>(body) ?? [];
  return rows
    .map((r: Recordable) => ({
      uid: String(r.A_UID ?? ''),
      name: String(r.AREA_NAME ?? '').trim(),
      district: String(r.DIST ?? '').trim(),
      funcType: String(r.FUNC_TYPE_NAME ?? '').trim(),
      areaHa: r.AREA_HA ?? null,
    }))
    .filter((r) => r.uid && r.name);
}
