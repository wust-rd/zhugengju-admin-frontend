/*
  策划方案填报 —— 地理数据解析（片区范围线 scopeLine / 项目矢量图斑 mapSpot）

  填报页两处地理数据共用 shared 的 GeoDataSection 组件：上传 shp/dwg →
  本解析入口返回 GeoJSON 字符串 → 地图渲染；编辑弹窗的绘制结果同样以
  GeoJSON 字符串保存。后端尚未介入，假数据阶段以本地 mock 模拟
  「上传 → 解析 → 返回 GeoJSON」；接口就绪后把 parseGeoFile 替换为真实的
  上传解析调用（defHttp），组件与表单无需改动。
*/

/** 地理数据示例（武汉两示例地块多边形；假数据阶段模拟后端解析结果） */
const SAMPLE_GEO_JSON = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '示例地块一' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.212, 30.512],
            [114.252, 30.508],
            [114.258, 30.538],
            [114.218, 30.542],
            [114.212, 30.512],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '示例地块二' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.266, 30.518],
            [114.29, 30.518],
            [114.29, 30.534],
            [114.266, 30.534],
            [114.266, 30.518],
          ],
        ],
      },
    },
  ],
});

/** 模拟后端解析：上传 shp/dwg → 后端解析返回 GeoJSON。假数据阶段延迟后返回示例 */
export function parseGeoFile(_file: File): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SAMPLE_GEO_JSON), 800);
  });
}
