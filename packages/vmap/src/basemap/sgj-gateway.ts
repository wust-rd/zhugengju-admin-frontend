/**
 * 数公基底图（ServiceAdapter）网关共享常量
 *
 * - 服务为局方平台的 ArcGIS REST 缓存瓦片（Web Mercator / EPSG:3857、
 *   256px PNG、0~19 级），token 内置在路径中
 * - DCI 鉴权按 Referer 来源放行：localhost / 无来源 200，局域网 IP 页面
 *   来源 401 Not DCIAuthorized——浏览器不直连 10.34.4.103，统一走同源
 *   代理前缀 /sgj：dev 由 vite 代理转发（web/.env.development.local 的
 *   VITE_PROXY 声明，vite.config.ts 对该前缀补"去 Referer"），生产由
 *   nginx 反代（proxy_pass http://10.34.4.103:8010 并
 *   proxy_set_header Referer ""，服务器已配置）
 */
export const SGJ_SERVICE_BASE = '/sgj/ServiceAdapter/MAP';

/** 数公基路径 token */
export const SGJ_SERVICE_TOKEN = 'a06a981392ba400a8144171aa9fb8168';
