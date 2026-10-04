/**
 * 市住更局 —— 指标项结果 接口层（后端 modules/check）
 *
 * 端点（无 adminPath，匿名；defHttp 自动拼 /js）：
 *  - GET  /cityCheck/indicatorResult/statPage  {setYear,setName,pageNum,pageSize} 每体系一行统计
 *  - GET  /cityCheck/indicatorResult/page      {setId,itemName,warningStatus,evaluateResult,...}
 *  - GET  /cityCheck/indicatorResult/{id}      详情（含资料清单结果列表 + 三个附件路径）
 *  - POST /cityCheck/indicatorResult/save      单行保存（预警状态按评估结果自动计算）
 *  - POST /cityCheck/indicatorResult/submit | cancelSubmit  {id}（单行，提交后只读）
 *  - GET  /cityCheck/dimensionResult/page      {setId,...} 一级维度行
 *  - POST /cityCheck/dimensionResult/save      {id?,setId,firstDimensionName,layerObjectCount,
 *                                               layerTotalArea,shpFile}
 *  - POST /cityCheck/materialResult/saveList   {indicatorResultId,materialResultList}（整单替换）
 *  - POST /cityCheck/district/file/upload      multipart（file 域；返回 filePath/fileName）
 *  - GET  /cityCheck/district/file/download?filePath=  文件流
 *
 * 字段映射（后端文档名 ↔ 前端页面名）：
 *  - 统计行：sysNo↔code, setYear↔year, setName↔indicatorName（id 为体系主键，下钻用）
 *  - 结果行：itemNo↔code, itemName↔indicatorName, itemUnit↔unit, itemSource↔indicatorSource,
 *    responsibilityDept↔responsibleDept；数值/文字双轨（resultValue/resultValueText）合并展示
 *  - 维度行：firstDimensionName↔dimName, layerObjectCount↔layerCount, layerTotalArea↔layerArea；
 *    注意分页返回 layerShpFile、保存入参叫 shpFile（后端不对称，本层抹平）
 *  - 附件路径字段（layerShpFile/benchmarkFile/dataStatFile/shpFile）统一存
 *    JSON 字符串 {"name":原文件名,"url":相对路径}（上传接口落盘名为时间戳，原始名须随存）
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 附件对象（存库形态：JSON 字符串） */
export type AttFile = { name: string; url: string };

/** 指标项结果统计 实体（每体系一行，只读派生数据） */
export type IndicatorResult = {
  id?: string; // 体系主键（下钻 show 页 {id}）
  code?: string; // 编码(sys_no,如 202601)
  year?: string; // 体检年份
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量(项)
  filledCount?: number; // 已填报结果的指标数量(项)
  unfilledCount?: number; // 未填报结果的指标数量(项)
  warningCount?: number; // 预警指标数量(项)
};

/** 指标项结果行（服务端分页；维度/数据来源不在后端返回列，由视图联表2 补齐） */
export type IndicatorResultRow = {
  id: string; // 结果主键（保存/详情/提交均用它）
  indicatorItemId?: string; // 对应指标项主键（表2）
  code?: number; // 序号(item_no,与表2 同步)
  indicatorName?: string; // 指标项名称
  unit?: string; // 指标单位
  resultValue?: number | null; // 指标值(数字轨)
  resultValueText?: string | null; // 指标值(文字轨)
  standardValue?: number | null; // 标准值/目标值(数字轨)
  standardValueText?: string | null; // 标准值/目标值(文字轨)
  evaluateResult?: string | null; // 评估结果(不足/一般/较好/很好/无标准)
  warningStatus?: string | null; // 预警状态(红色预警/黄色预警/正常；保存时自动计算)
  fillStatus?: number; // 1=已填报（指标值非空）
  submitStatus?: number; // 1=已提交（只读）
  indicatorSource?: string; // 指标来源
  remarks?: string | null;
  // —— 视图联表2 补齐的展示字段 ——
  dim1?: string;
  dim2?: string;
  dim3?: string;
  dataSource?: string;
};

/** 资料清单对应结果行（表7） */
export type MaterialResultRow = {
  id?: string;
  materialId?: string;
  materialName?: string;
  resultValue?: number | null;
  sortNo?: number;
};

/** 指标项结果详情（结果行 + 附件/解释/分析/资料清单结果） */
export type IndicatorResultDetail = IndicatorResultRow & {
  itemExplain?: string | null; // 指标解释(只读)
  resultAnalysis?: string | null; // 指标结果分析
  shpAtt?: AttFile; // 图层shp文件
  benchmarkAtt?: AttFile; // 城市横向对标数据表
  statAtt?: AttFile; // 数据统计表
  materialResultList?: MaterialResultRow[];
};

/** 一级维度行 */
export type DimensionRow = {
  id?: string;
  dimName?: string; // 一级维度名称
  layerCount?: number; // 图层对象数量
  layerArea?: number; // 图层覆盖面积(km²)
  shpAtt?: AttFile; // 上传的图层对象(shp/zip)
  sortNo?: number;
};

// ==================== 附件 JSON 互转 ====================

function jsonToAtt(v?: string | null): AttFile | undefined {
  if (!v) return undefined;
  try {
    const o = JSON.parse(v);
    if (o && typeof o.url === 'string') return { name: String(o.name ?? '附件'), url: o.url };
  } catch {
    /* 兼容裸路径旧数据 */
  }
  return v.startsWith('/upload/') ? { name: v.slice(v.lastIndexOf('/') + 1), url: v } : undefined;
}

function attToJson(f?: AttFile): string | undefined {
  return f?.url ? JSON.stringify({ name: f.name ?? '', url: f.url }) : undefined;
}

// ==================== 数值/文字双轨 ====================

/** 双轨存储 → 展示文字（数字轨优先级低于文字轨：文字非空展示文字） */
export function displayValue(number?: number | null, text?: string | null): string {
  if (text != null && text !== '') return text;
  if (number != null && number !== null) {
    // 1393.0 → 1393（达梦 NUMBER 经 JSON 序列化常带 .0）
    const s = String(number);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  }
  return '';
}

/** 表单输入（自由文本）→ 保存入参：纯数字走数字轨，其余走文字轨；空串=清空 */
function parseValueInput(input: string, key: 'result' | 'standard') {
  const v = (input ?? '').trim();
  const numKey = key === 'result' ? 'resultValue' : 'standardValue';
  const textKey = key === 'result' ? 'resultValueText' : 'standardValueText';
  const presentKey = key === 'result' ? 'resultValueTextPresent' : 'standardValueTextPresent';
  if (v === '') return { [presentKey]: true } as Recordable; // 文字轨置空 → 清空两轨
  if (/^-?\d+(\.\d+)?$/.test(v)) return { [numKey]: Number(v), [presentKey]: false } as Recordable;
  return { [textKey]: v, [presentKey]: true } as Recordable;
}

// ==================== 后端行 → 前端实体 ====================

type BackRow = Recordable & {
  itemNo?: number;
  itemName?: string;
  itemUnit?: string;
  itemSource?: string;
  responsibilityDept?: string;
  itemExplain?: string;
  resultAnalysis?: string;
  layerShpFile?: string;
  benchmarkFile?: string;
  dataStatFile?: string;
};

function toFrontRow(row: BackRow): Recordable {
  return {
    ...row,
    code: row.itemNo,
    indicatorName: row.itemName,
    unit: row.itemUnit,
    indicatorSource: row.itemSource,
    responsibleDept: row.responsibilityDept,
  };
}

function toFrontDetail(row: BackRow): IndicatorResultDetail {
  return {
    ...(toFrontRow(row) as IndicatorResultRow),
    itemExplain: row.itemExplain,
    resultAnalysis: row.resultAnalysis,
    shpAtt: jsonToAtt(row.layerShpFile),
    benchmarkAtt: jsonToAtt(row.benchmarkFile),
    statAtt: jsonToAtt(row.dataStatFile),
    materialResultList: (row as Recordable).materialResultList ?? [],
  };
}

type BackDim = Recordable & {
  firstDimensionName?: string;
  layerObjectCount?: number;
  layerTotalArea?: number;
  layerShpFile?: string;
};

function toFrontDim(row: BackDim): DimensionRow {
  return {
    id: row.id,
    dimName: row.firstDimensionName,
    layerCount: row.layerObjectCount,
    layerArea: row.layerTotalArea,
    shpAtt: jsonToAtt(row.layerShpFile),
    sortNo: row.sortNo,
  };
}

// ==================== 统计（模块首页） ====================

/** 分页查询填报统计（BasicTable api 直用；year/indicatorName → setYear/setName） */
export async function indicatorResultStatPage(params: Recordable) {
  const { year, indicatorName, ...rest } = params ?? {};
  const data = await pageGet<Recordable>(CHECK_API + '/indicatorResult/statPage', {
    ...rest,
    setYear: year,
    setName: indicatorName,
  });
  return {
    count: data.count,
    list: (data.list ?? []).map(
      (r): IndicatorResult => ({
        id: r.id,
        code: r.sysNo,
        year: r.setYear,
        indicatorName: r.setName,
        indicatorCount: r.indicatorCount,
        filledCount: r.filledCount,
        unfilledCount: r.unfilledCount,
        warningCount: r.warningCount,
      }),
    ),
  };
}

/** 按体系主键取单行统计（show 页头部进度卡；单 SQL 轻量版，statPage 全表聚合要 ~2.5s） */
export async function indicatorResultStatById(setId: string): Promise<IndicatorResult> {
  const row = unwrap<Recordable>(
    await defHttp.get({ url: CHECK_API + '/indicatorResult/statInfo', params: { setId } }),
  );
  return {
    id: row.id,
    code: row.sysNo,
    year: row.setYear,
    indicatorName: row.setName,
    indicatorCount: row.indicatorCount,
    filledCount: row.filledCount,
    unfilledCount: row.unfilledCount,
    warningCount: row.warningCount,
  };
}

// ==================== 指标项结果（show 页指标项 tab） ====================

/** 结果行分页（BasicTable api 直用；服务端分页，itemName/预警/评估筛选） */
export async function indicatorResultPageBySet(params: Recordable) {
  const { setId, ...rest } = params ?? {};
  const data = await pageGet<BackRow>(CHECK_API + '/indicatorResult/page', { setId, ...rest });
  return { count: data.count, list: (data.list ?? []).map(toFrontRow) };
}

/** 拉取体系下全部结果行（头部「提交指标结果」遍历提交用） */
export async function indicatorResultListBySet(setId: string): Promise<IndicatorResultRow[]> {
  const data = unwrap<{ total: number; list: BackRow[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorResult/page',
      params: { setId, pageNum: 1, pageSize: 1000 },
    }),
  );
  return (data.list ?? []).map(toFrontRow) as IndicatorResultRow[];
}

/** 结果详情（首次自动按表3 生成资料清单结果空值快照） */
export async function indicatorResultInfo(id: string): Promise<IndicatorResultDetail> {
  return toFrontDetail(
    unwrap<BackRow>(await defHttp.get({ url: CHECK_API + `/indicatorResult/${id}` })),
  );
}

/** 指标项结果保存入参（附件为前端对象，提交时转 JSON 字符串） */
export type IndicatorResultSaveData = {
  id: string;
  indicatorValueInput?: string; // 指标值（自由文本：数字走数字轨）
  standardValueInput?: string; // 标准值/目标值
  evaluateResult?: string;
  resultAnalysis?: string;
  shpAtt?: AttFile;
  benchmarkAtt?: AttFile;
  statAtt?: AttFile;
  remarks?: string;
};

/** 保存指标项结果（预警状态由后端按评估结果自动计算并返回） */
export async function indicatorResultSave(
  data: IndicatorResultSaveData,
): Promise<{ warningStatus?: string }> {
  const payload: Recordable = {
    id: data.id,
    ...parseValueInput(data.indicatorValueInput ?? '', 'result'),
    ...parseValueInput(data.standardValueInput ?? '', 'standard'),
    evaluateResult: data.evaluateResult || undefined,
    resultAnalysis: data.resultAnalysis || undefined,
    layerShpFile: attToJson(data.shpAtt),
    benchmarkFile: attToJson(data.benchmarkAtt),
    dataStatFile: attToJson(data.statAtt),
    remarks: data.remarks || undefined,
  };
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/indicatorResult/save', data: payload }),
  );
}

/** 提交单行（后端校验指标值/评估结果必填；提交后只读） */
export async function indicatorResultSubmit(id: string) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/indicatorResult/submit', data: { id } }),
  );
}

/** 取消提交单行（恢复可编辑；幂等） */
export async function indicatorResultCancelSubmit(id: string) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/indicatorResult/cancelSubmit', data: { id } }),
  );
}

/** 资料清单对应结果整单保存（表7；materialName 快照，resultValue 数字） */
export async function materialResultSaveList(
  indicatorResultId: string,
  materialResultList: MaterialResultRow[],
) {
  return unwrap(
    await defHttp.postJson({
      url: CHECK_API + '/materialResult/saveList',
      data: {
        indicatorResultId,
        materialResultList: (materialResultList ?? []).map((m) => ({
          id: m.id,
          materialId: m.materialId,
          materialName: m.materialName,
          resultValue: m.resultValue ?? null,
          sortNo: m.sortNo,
        })),
      },
    }),
  );
}

// ==================== 一级维度（show 页一级维度 tab） ====================

/** 一级维度表（首次自动按体系指标项的一级维度同步生成维度行） */
export async function dimensionListBySet(setId: string): Promise<DimensionRow[]> {
  const data = unwrap<{ total: number; list: BackDim[] }>(
    await defHttp.get({
      url: CHECK_API + '/dimensionResult/page',
      params: { setId, pageNum: 1, pageSize: 200 },
    }),
  );
  return (data.list ?? []).map(toFrontDim);
}

/** 保存一级维度（仅编辑图层信息——维度行来自指标体系，不可增删） */
export async function dimensionSave(
  data: Partial<DimensionRow> & { setId: string; setYear?: string },
) {
  return unwrap(
    await defHttp.postJson({
      url: CHECK_API + '/dimensionResult/save',
      data: {
        id: data.id,
        setId: data.setId,
        setYear: data.setYear,
        firstDimensionName: data.dimName,
        layerObjectCount: data.layerCount ?? null,
        layerTotalArea: data.layerArea ?? null,
        shpFile: attToJson(data.shpAtt),
      },
    }),
  );
}

// ==================== 附件上传/下载 ====================

/**
 * 上传附件（复用区级体检文件接口；后端落盘名=时间戳_uuid.ext，原始文件名不保留，
 * 调用方需自行持有 name；白名单 zip/shp/xlsx/xls/png/jpg/jpeg/pdf/doc/docx）
 */
export async function checkFileUpload(file: File, bizType?: string): Promise<AttFile> {
  const res = await defHttp.uploadFile(
    { url: CHECK_API + '/district/file/upload' },
    { file, name: 'file', data: bizType ? { bizType } : undefined },
  );
  const uploaded = unwrap<Recordable>((res as Recordable)?.data ?? res);
  if (!uploaded?.filePath) throw new Error('上传失败：未返回文件路径');
  return { name: uploaded.fileName || file.name, url: uploaded.filePath };
}

/** 下载附件（同源文件流 → blob 落盘；失败回退新窗打开） */
export async function checkFileDownload(att: AttFile): Promise<void> {
  const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
  const url = `${base}/js${CHECK_API}/district/file/download?filePath=${encodeURIComponent(att.url)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    // 优先取响应头 filename*=utf-8''，否则用本地持有的原始名
    const dispo = res.headers.get('content-disposition') || '';
    const m = /filename\*=utf-8''([^;]+)/i.exec(dispo);
    const name = m ? decodeURIComponent(m[1]) : att.name;
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href));
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
