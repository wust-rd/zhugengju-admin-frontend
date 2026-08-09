---
name: maplibre-gl-enhance
description: 超图定制版 MapLibre GL（maplibre-gl-enhance.js）地图引擎的使用方法。触发条件：涉及地图初始化（new maplibregl.Map）、天地图底图瓦片（vec_c/cva_c、DataServer、EPSG:4490/4326 经纬度坐标系、CRS）、geojson 图层添加、web/index.html 全局 script 加载 enhance.js、packages/types/maplibre-gl-enhance.d.ts 类型声明、MGRS/proj4/customprj 等超图增强能力。
version: 1.0.0
---

# MapLibre GL Enhance（超图定制版）使用指南

本项目地图引擎为**超图定制版 maplibre-gl-enhance.js**（基于官方 maplibre-gl v4.3.0 fork，20250425 构建），
增强能力：**CRS 自定义坐标系**、geojson source 的 `customprj` 投影、`LngLat.toMGRS`、mapbox 兼容、proj4 内联。

与 npm 安装方式不同，本项目采用**全局 script 加载 + 全局 d.ts 类型声明**，页面代码直接 `maplibregl.xxx` 使用，**无需 import**。

---

## 一、加载机制（一次性配置，已完成，勿重复操作）

### 1. 引擎与样式：web/index.html 全局加载

`web/index.html` `<head>` 中已引入（文件在 `web/public/maplibregl/`，public 目录原样拷贝到站点根）：

```html
<!-- MapLibre GL enhance 引擎（含 CRS + proj4，挂 window.maplibregl） -->
<link rel="stylesheet" href="/maplibregl/maplibre-gl-enhance.css">
<script src="/maplibregl/maplibre-gl-enhance.js"></script>
```

- `maplibre-gl-enhance.js`：约 1.1MB **未压缩** UMD，`window.maplibregl` 全局对象
- `maplibre-gl-enhance.css`：引擎必需样式
- `iclient-maplibregl.min.css`：供超图 iclient 库使用，**当前未引**，勿动

### 2. 类型声明：packages/types + tsconfig types 数组

`packages/types/maplibre-gl-enhance.d.ts` 定义 `declare namespace maplibregl` 全局类型（借鉴官方 v4.3.0 d.ts 精炼公共 API + 超图增强 CRS/customprj/toMGRS）。

**生效机制**：根 `tsconfig.json` 的 `compilerOptions.types` 数组引用 `"@jeesite/types/maplibre-gl-enhance"`（与 `"@jeesite/types/global"` 并列），经 workspace 链接解析后全 monorepo（web/core/cms/dbm/display）全局生效。

**关键约束**：纯全局脚本声明（无 import/export）**不能**走 `index.d.ts` 的 `export *` 模块导出（会破坏全局性），必须靠 tsconfig `types` 数组加载。

---

## 二、初始化地图（标准模板）

### 1. 天地图底图 style + 瓦片 URL

**必须用 DataServer REST 接口 + `_c` 系列（CGCS2000 经纬度）**，配合 `crs: 'EPSG:4490'`：

```tsx
/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/**
 * 构建天地图瓦片 URL 数组（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * 配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'/'cva_c'
 */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': { type: 'raster', tiles: tiandituTileUrls('vec_c'), tileSize: 256, minzoom: 2, maxzoom: 18 },
    'tianditu-cva': { type: 'raster', tiles: tiandituTileUrls('cva_c'), tileSize: 256, minzoom: 2, maxzoom: 18 },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};
```

> 旧写法勿再用：WMTS 接口 `/{layer}_w/wmts?...TILEMATRIXSET=w`（3857）、`/{layer}_c/wmts?...TILEMATRIXSET=c`。
> DataServer REST 的 T 参数直接就是 `vec_c`/`cva_c`（经纬度）或 `vec_w`/`cva_w`（3857）。

### 2. 创建地图（vue watch 生命周期高内聚）

```tsx
import { defineComponent, ref, watch } from 'vue';

export default defineComponent({
  name: 'DisplayXxx',
  setup() {
    const mapContainer = ref<HTMLDivElement | null>(null);

    // 地图生命周期高内聚：容器挂载后初始化，组件卸载时自动清理
    watch(
      mapContainer,
      (el, _, onCleanup) => {
        if (!el) return;

        const map = new maplibregl.Map({
          container: el,
          style: tiandituStyle,
          // 天地图 _c 系列瓦片为 CGCS2000 经纬度坐标系，地图 CRS 同步切换为 EPSG:4490
          crs: 'EPSG:4490',
          center: [114.305, 30.593], // 武汉
          zoom: 11,
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
        map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), 'bottom-right');
        map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

        onCleanup(() => map.remove());
      },
      { immediate: true },
    );

    return () => (
      <div
        ref={(el) => {
          mapContainer.value = el as HTMLDivElement | null;
        }}
        class="h-full w-full"
      />
    );
  },
});
```

### 3. 坐标系（CRS）选择

| 场景 | 写法 | 说明 |
|------|------|------|
| 默认（Web Mercator） | 不写 `crs` | 天地图 `_w` 系列 / OSM 等 |
| CGCS2000 经纬度 | `crs: 'EPSG:4490'` 或 `new maplibregl.CRS('EPSG:4490')` | 天地图 `_c` 系列，国内测绘合规 |
| WGS84 经纬度 | `crs: 'EPSG:4326'` | 经纬度瓦片 |

类型已支持 `crs?: CRS | string`，字符串写法**无需** `@ts-expect-error`（其他项目因用 npm 官方类型才需要）。
数据层坐标本来就是经纬度（lng/lat），4490 下**无需** `customprj` 投影转换。

---

## 三、动态添加 geojson 图层（核心坑点）

**坑：style 对象内内联 geojson source 的 `data` 不渲染**（v4/v6 通用），必须 `map.once('load')` 后动态添加：

```tsx
// TSX 中 GeoJSON.FeatureCollection 全局命名空间不可用，用自定义轻量类型标注
type PolygonFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

map.once('load', () => {
  map.addSource('scheme-polygons', {
    type: 'geojson',
    data: SCHEME_POLYGONS_GEOJSON,
  });
  map.addLayer({
    id: 'scheme-polygons-fill',
    type: 'fill',
    source: 'scheme-polygons',
    paint: {
      'fill-color': '#FF00FF',
      'fill-opacity': 0.45,
      'fill-outline-color': '#D500D5',
    },
  });
});
```

如需 geojson 数据是投影坐标（非经纬度），在 source 上加超图增强字段：
```ts
{ type: 'geojson', data: ..., customprj: 'EPSG:xxxx' }
```

---

## 四、实测/调试技巧

- **调试**：`(window as any).map1 = map` 后用浏览器控制台操作
- **瓦片验证**：浏览器 UA 访问瓦片 URL，HTTP 200 + 256×256 PNG 即正常；curl 直接访问会被天地图按"浏览器端" token 403 拒绝（需 `-A "Mozilla/5.0 ..."` 模拟 UA）
- **token**：`web/.env` 的 `VITE_TIANDITU_TOKEN`
- **验证命令**：`cd packages/display && pnpm type:check`（vue-tsc）、`pnpm lint`

## 五、坐标系事实（4490 已实测）

- enhance.js 的 EPSG:4490 tile scheme 是**方形 `2^z × 2^z` grid**（y 方向覆盖 360°，90°N → -270°，-90° 以下空瓦片），**非**天地图 c 矩阵（`2^z × 2^(z-1)`）——这是 enhance 内部 CRS 处理保证的，页面代码无需适配，武汉区域实测瓦片对齐（z=11 行号 337 吻合）
- `CRS` 类：`new maplibregl.CRS('EPSG:4490')`，实例方法 `getOrigin()` / `getLngLatExtent()`；内置常量 EPSG4326/EPSG4490/EPSG3857

## 六、参考实现（完整示例）

| 文件 | 内容 |
|------|------|
| `packages/display/views/scheme/index.tsx` | 完整示例：4490 + 天地图 + geojson fill 图层 + 抽屉 UI |
| `packages/display/views/project/index.tsx` | 同上（单子域名 t0，无子域名轮询） |
| `packages/types/maplibre-gl-enhance.d.ts` | 全局类型声明 |
| `web/index.html` | script/css 引入 |
| 外部参考：`one-map-public/frontend/src/routes/_layout/planning-protocol-4490.tsx` | enhance.js 4490 加载（npm 类型需 @ts-expect-error） |
