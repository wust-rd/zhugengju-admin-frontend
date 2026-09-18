/**
 * 片区详情路由的两个路径常量/工具（独立小模块：跳转方引用它，避免把详情页组件
 * 静态引进看板 chunk —— 详情页由路由懒加载，注册见
 * packages/core/router/routes/modules/early-stage-planning.ts）
 */
import { ESP_AREA_DETAIL_PATH } from '@jeesite/core/router/routes/modules/early-stage-planning';

/** 片区详情路径（拼接用，与路由注册同源） */
export const areaDetailPath = (auid: string) => `${ESP_AREA_DETAIL_PATH}/${encodeURIComponent(auid)}`;

/** 看板页路径（详情页返回兜底用；该页由后端菜单注册，与 nav-links 导航 to 一致） */
export const OVERVIEW_ROUTE_PATH = '/early-stage-planning/overview/index';
