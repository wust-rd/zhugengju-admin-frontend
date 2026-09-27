/**
 * 市住更局 —— 城市更新专家管理 · 角色工具
 *
 * 三类账号角色（线上角色管理已配置，编码以截图为准）：
 *   城市更新专家 esp_urban_expert / 城市更新实施主体 esp_urban_implement / 运维人员 YYRY
 *
 * 数据源（2026-09-27 修正）：登录/index 接口【不返回】user.roleList，角色与权限串
 * 从 /a/authInfo 取（roles + stringPermissions）；"是否专家视角"还须当前账号绑定了
 * 专家档案（/a/ure/expert/me），与后端 UreProjectService.pageList 的数据范围判定完全对齐：
 *   绑定专家档案且含专家角色 → expert（仅参与项目）；否则含实施主体角色 → implement（仅本人创建）；
 *   否则 → ops（全部）。
 * 可编辑项目（新增/编辑/提交/删除）按权限串 ure:project:edit 判断，与后端 @RequiresPermissions 对齐。
 * 结果进程内缓存（角色切换/重新登录后刷新页面即可）。
 */

import { authInfoApi } from '@jeesite/core/api/sys/login';
import { ureExpertMe } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';

/** 角色编码 */
export const URE_ROLE_CODE = {
  /** 城市更新专家（被抽中参与项目评估，个人档案保存时自动授予） */
  expert: 'esp_urban_expert',
  /** 城市更新实施主体（新增/提交评估项目） */
  implement: 'esp_urban_implement',
  /** 运维人员（维护专家档案，全量只读） */
  ops: 'YYRY',
} as const;

/** 页面内使用的角色身份 */
export type UreRole = 'expert' | 'implement' | 'ops' | 'none';

/** 当前登录者的 ure 身份（视角 + 可编辑标记） */
export type UreIdentity = {
  role: UreRole;
  /** 是否可新增/编辑/提交/删除评估项目（权限串 ure:project:edit 或超管） */
  canEditProject: boolean;
  /** 当前账号是否绑定了专家档案 */
  expertBound: boolean;
};

/** 框架超管角色码（与后端 User.SUPER_ADMIN_CODES 一致，超管拥有全部权限串） */
const ADMIN_ROLE_CODES = ['system', 'admin'];

let identityCache: Promise<UreIdentity> | null = null;

/** 加载当前登录者的 ure 身份（进程内缓存；失败降级为 none，不阻塞页面） */
export function ureIdentity(): Promise<UreIdentity> {
  if (!identityCache) {
    identityCache = (async () => {
      try {
        const [auth, me] = await Promise.all([authInfoApi(), ureExpertMe()]);
        const roles: string[] = auth?.roles ?? [];
        const perms: string[] = auth?.stringPermissions ?? [];
        const expertBound = !!me?.expert;
        let role: UreRole = 'none';
        if (expertBound && roles.includes(URE_ROLE_CODE.expert)) {
          role = 'expert';
        } else if (roles.includes(URE_ROLE_CODE.implement)) {
          role = 'implement';
        } else if (roles.includes(URE_ROLE_CODE.ops)) {
          role = 'ops';
        }
        const canEditProject =
          perms.includes('ure:project:edit') || roles.some((code) => ADMIN_ROLE_CODES.includes(code));
        return { role, canEditProject, expertBound };
      } catch (e) {
        return { role: 'none', canEditProject: false, expertBound: false };
      }
    })();
  }
  return identityCache;
}
