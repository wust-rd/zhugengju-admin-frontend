/**
 * 湖北省自然资源「一张图」tip-gateway 网关共享常量
 *
 * - 域名 hubei.onemap.mnr.cegn.cn 需特殊 DNS 才能解析（主 202.103.24.68 /
 *   备 59.255.209.4，由局方网络策略控制），浏览器不直连，统一走同源代理前缀
 *   /hbyzt：dev 由 vite 代理转发（web/.env.development.local 的 VITE_PROXY），
 *   生产由 nginx 反代 hubei.onemap.mnr.cegn.cn（服务器已配置）
 * - 所有请求须带 token 查询参数
 */
export const YZT_GATEWAY_BASE = '/hbyzt/tip-gateway/proxy';

export const YZT_TOKEN = 'tip-token-c07d0ecb6b78e8f7d776d0d88ed61b21';

/** cva_c 矢量注记服务的代理路径段（仅 WMTS 端点，天地图 EPSG:4490 网格） */
export const YZT_CVA_PROXY = '181923f734561b5948b071044bc68f30/cva_c';

/** vec_c 矢量底图服务的代理路径段（与 cva_c 同构；上游对当前 token 未授权 401） */
export const YZT_VEC_PROXY = '1044e59cc34ebea1a88e97f08bc39197/vec_c';
