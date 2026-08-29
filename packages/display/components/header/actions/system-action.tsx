import { computed, defineComponent, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getMenus } from '@jeesite/core/router/menus';
import type { Menu } from '@jeesite/core/router/types';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { ActionButton } from './action-button';

/**
 * SystemAction —— 系统管理入口（本质是路由 NavLink，做成 action-button 形状）
 *
 * - 点击：对标图1后台顶栏行为，进入系统管理菜单树的第一个路由；
 * - 点亮：与 NavLinks 相同的前缀匹配逻辑——当前路由落在系统管理子树内
 *   （含任意层级子路由），按钮保持 active 高亮，离开子树自动熄灭；
 * - 权限门卫：按原版 menu/index.vue 的动态菜单机制，现实中只有超级管理员
 *   才会从后端拿到带「系统管理」的菜单。因此以 getMenus() 能否解析出
 *   该子树作为超管判据——非超管/未登录时整个按钮不渲染。
 * 菜单数据经 getMenus() 从后端动态读取（同 menu/index.vue）。
 */
export const SystemAction = defineComponent({
  name: 'DisplaySystemAction',
  setup() {
    const go = useGo();
    const route = useRoute();
    const menus = ref<Menu[]>([]);
    /** 解析出的系统管理顶层菜单（含整棵子树） */
    const sysMenu = ref<Menu>();

    onMounted(async () => {
      try {
        menus.value = await getMenus();
        resolveSysMenu();
      } catch {
        menus.value = [];
      }
    });

    function resolveSysMenu() {
      sysMenu.value =
        menus.value.find((m) => String(m.meta?.title || '').includes('系统')) ||
        menus.value.find((m) => m.path.startsWith('/sys'));
    }

    /** 当前路由是否落在该菜单子树内（NavLinks 同款前缀匹配，逐层递归） */
    function isTreeActive(m: Menu): boolean {
      if (route.path === m.path || route.path.startsWith(m.path + '/')) return true;
      return (m.children || []).some(isTreeActive);
    }

    const isActive = computed(() => (sysMenu.value ? isTreeActive(sysMenu.value) : false));

    /** 门卫：能解析出系统管理子树 ⇔ 后端下发了超管菜单，才生成入口按钮 */
    const canShow = computed(() => !!sysMenu.value);

    /** 深度优先找菜单树中第一个可用路由（跳过带参数的占位路径） */
    function firstLeafPath(m: Menu): string | undefined {
      if (m.children?.length) {
        for (const child of m.children) {
          const p = firstLeafPath(child);
          if (p) return p;
        }
      }
      return m.path && !m.path.includes(':') ? m.path : undefined;
    }

    function enterSystem() {
      const target = sysMenu.value ? firstLeafPath(sysMenu.value) : undefined;
      if (target) go(target);
    }

    return () =>
      canShow.value ? (
        <ActionButton
          iconOnly
          icon="i-ri-settings-3-line"
          title="系统"
          active={isActive.value}
          onClick={enterSystem}
        />
      ) : null;
  },
});
