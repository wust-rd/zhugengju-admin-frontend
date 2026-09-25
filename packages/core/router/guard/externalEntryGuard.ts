import type { Router } from 'vue-router';

const FULL_QUERY_KEY = '__full__';
const FULL_SESSION_KEY = 'FULL_CONTENT_SESSION';

/** 第三方来源链接参数名，外链形如 ?__full__&returnUrl=<encodeURIComponent(链接)> */
export const RETURN_URL_QUERY_KEY = 'returnUrl';
/** 第三方来源链接的会话存储键，外壳悬浮【返回】按钮据此显示（见 feature/index.vue） */
export const RETURN_URL_SESSION_KEY = 'RETURN_URL_SESSION';

// ?__full__=0 / ?__full__=false 视为显式关闭全屏会话
function isExplicitOff(value: unknown): boolean {
  return value === '0' || value === 'false';
}

function pickQueryString(value: unknown): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : ((value as string | null) ?? null);
}

/**
 * 外链进入会话守卫，处理两个一次性 URL 参数（sessionStorage 随浏览器页签生命周期）：
 * - ?__full__：写入会话标记，会话期内所有跳转自动续传该参数，header/sidebar/tabs 持续隐藏；
 *   ?__full__=0（或 false）显式退出：清除标记并从地址栏移除参数，恢复常规外壳。
 * - ?returnUrl=<第三方链接>：记录到会话存储并从地址栏移除（仅接受 http(s) 地址），
 *   外壳顶部中央据此显示悬浮【返回】按钮。
 */
export function createExternalEntryGuard(router: Router) {
  router.beforeEach((to) => {
    const rawFull = to.query[FULL_QUERY_KEY];
    const rawReturn = pickQueryString(to.query[RETURN_URL_QUERY_KEY]);
    const query = { ...to.query };
    let redirect = false;

    if (to.query[RETURN_URL_QUERY_KEY] !== undefined) {
      if (typeof rawReturn === 'string' && /^https?:\/\//i.test(rawReturn)) {
        sessionStorage.setItem(RETURN_URL_SESSION_KEY, rawReturn);
      }
      delete query[RETURN_URL_QUERY_KEY];
      redirect = true;
    }

    if (rawFull !== undefined) {
      if (isExplicitOff(rawFull)) {
        sessionStorage.removeItem(FULL_SESSION_KEY);
        delete query[FULL_QUERY_KEY];
        redirect = true;
      } else {
        sessionStorage.setItem(FULL_SESSION_KEY, '1');
      }
    } else if (sessionStorage.getItem(FULL_SESSION_KEY)) {
      query[FULL_QUERY_KEY] = '';
      redirect = true;
    }

    if (redirect) {
      return { path: to.path, query, hash: to.hash, replace: true };
    }
    return true;
  });
}
