/**
 * 市住更局 —— 总览页地图图层 接口层（后端 modules/check，/cityCheck/space）
 *
 * 两个 GeoJSON 直出接口（后端已做 WKB/WKT 解析 + Douglas-Peucker 简化 + 6 位小数降精度，
 * 服务端 5 分钟 TTL 缓存）：
 *  1. spaceBaseGeojson —— 一级维度绑定的基础图斑（CITY_CHECK_SPACE_OBJECT 按 object_type）：
 *     城区-district / 街区-street / 社区-community / 住房-building+village；
 *  2. indicatorSpatialGeojson —— 指标项的问题图斑（CITY_CHECK_INDICATOR_SPATIAL_DATA
 *     按 indicator_item_id，即表2 主键），点/线/面混合。
 *
 * 响应协议见 ../common.ts（unwrap 解包 {code,msg,data}，成功返回 data）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap } from '../common';

/** GeoJSON 几何（后端输出 Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon） */
export type SpaceGeometry = {
  type: string;
  coordinates: unknown;
};

/** 空间要素：属性 + 几何 */
export type SpaceFeature = {
  type: 'Feature';
  properties: {
    id?: string;
    /** 基础图层：district/street/community/building/village */
    objectType?: string;
    /** 基础图层：对象名（区划/街道/社区/楼栋/村名） */
    objectName?: string;
    /** 指标叠加：数据名称 */
    dataName?: string;
    /** 指标叠加：数据类型（如 房屋清册） */
    dataType?: string;
    address?: string | null;
    lon?: number | null;
    lat?: number | null;
  };
  geometry: SpaceGeometry;
};

/** GeoJSON FeatureCollection（后端 data 直出） */
export type SpaceFeatureCollection = {
  type: 'FeatureCollection';
  features: SpaceFeature[];
};

/** 一级维度 → 基础图层对象类型（后端白名单内组合） */
export const DIM_SPACE_TYPES: Record<string, string[]> = {
  城区: ['district'],
  街区: ['street'],
  社区: ['community'],
  住房: ['building', 'village'],
};

/** 基础图层 GeoJSON（按对象类型组合） */
export async function spaceBaseGeojson(objectTypes: string[]): Promise<SpaceFeatureCollection> {
  return unwrap<SpaceFeatureCollection>(
    await defHttp.get({ url: CHECK_API + '/space/baseGeojson', params: { objectTypes: objectTypes.join(',') } }),
  );
}

/** 指标问题图斑 GeoJSON（indicatorItemId 为表2 指标项主键） */
export async function indicatorSpatialGeojson(indicatorItemId: string): Promise<SpaceFeatureCollection> {
  return unwrap<SpaceFeatureCollection>(
    await defHttp.get({ url: CHECK_API + '/space/indicatorGeojson', params: { indicatorItemId } }),
  );
}
