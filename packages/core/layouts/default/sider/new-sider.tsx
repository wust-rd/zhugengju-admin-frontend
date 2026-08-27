import { Icon } from '@jeesite/core/components/Icon';
import { useMenuSetting } from '@jeesite/core/hooks/setting/useMenuSetting';
import { useI18n } from '@jeesite/core/hooks/web/useI18n';
import { cn } from '@jeesite/core/libs';
import { getMenus } from '@jeesite/core/router/menus';
import type { Menu } from '@jeesite/core/router/types';
import { openWindow } from '@jeesite/core/utils';
import { isUrl } from '@jeesite/core/utils/is';
import { Light } from '@jeesite/display/components/light';
import { computed, defineComponent, onMounted, ref, unref, watch, type CSSProperties, type VNode } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * new-sider：视觉风格对齐 display 侧边栏（深色底 #0f172a + 发光图标芯片）
 *
 * - 深色底 + 发光图标（激活=蓝色渐变+绿色发光边框，未激活=绿色发光背景），取自 display/nav-item.tsx。
 * - 渲染后台菜单树（getMenus），激活态由路由驱动，收起/展开由 useMenuSetting.getCollapsed 控制。
 * - 一级为模块（如"系统管理"），展开态只展示当前激活模块的二级子项列表（不显示一级模块名）；
 *   收起态以模块芯片呈现（可切换模块），hover flyout 弹出其二级子项。
 *
 * 命名约定（统一）：
 * - leaf：当前渲染/处理的每一个菜单子项；
 * - active：命中激活链路（自身或子孙命中当前路由，分支/叶子都点亮）；
 * - activeLeaf：精确命中当前页的叶子（给背景 + 指示条）；
 * - kids：是否为分支（有可见子级）。
 */
export const NewSider = defineComponent({
  name: 'NewSider',
  setup(_, { attrs }) {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const { getCollapsed, toggleCollapsed } = useMenuSetting();

    const menus = ref<Menu[]>([]);

    // 收起态宽度（对齐 display 的 w-80px），展开态 224px
    const COLLAPSED_WIDTH = 80;
    const EXPANDED_WIDTH = 224;

    // 未激活态视觉（取自 display/nav-item.tsx）
    const inactiveStyle = {
      background:
        'radial-gradient(97.33% 97.33% at 27.78% 12.96%, rgba(6, 255, 230, 0.20) 0%, rgba(6, 255, 230, 0.00) 100%)',
      borderColor: 'rgba(255, 255, 255, 0.10)',
    };

    const getWidth = computed(() => (unref(getCollapsed) ? COLLAPSED_WIDTH : EXPANDED_WIDTH));

    // 当前激活菜单路径：优先 currentActiveMenu，其次当前路由
    const activeKey = computed(() => {
      const currentActive = route.meta?.currentActiveMenu as string;
      return currentActive || route.path;
    });

    const loadMenus = async () => {
      menus.value = await getMenus();
    };

    onMounted(loadMenus);

    /** 该菜单项是否可见（未被 hideMenu 隐藏） */
    const isVisible = (leaf: Menu) => !leaf.meta?.hideMenu && !leaf.hideMenu;

    /** 该菜单项是否有可见子菜单（= 分支） */
    const hasChildren = (leaf: Menu) =>
      !!leaf.children &&
      leaf.children.length > 0 &&
      // 同时排除 hideChildrenInMenu / hideMenu 的子级整体隐藏场景
      !leaf.meta?.hideChildrenInMenu &&
      leaf.children.some(isVisible);

    /** 可见子级列表 */
    const visibleChildren = (leaf: Menu) => (leaf.children || []).filter(isVisible);

    /** 子树中是否包含某激活路径 */
    const containsActive = (leaf: Menu, key: string): boolean => {
      if (leaf.path === key) return true;
      if (leaf.children?.length) {
        return leaf.children.some((child) => containsActive(child, key));
      }
      return false;
    };

    /** 该菜单项是否为激活态（自身或子树命中 => 命中激活链路） */
    const isActive = (leaf: Menu) => containsActive(leaf, activeKey.value);

    /** 点击导航：外部链接新开窗口，内部路由跳转 */
    function handleNavigate(leaf: Menu) {
      if (isUrl(leaf.path)) {
        openWindow(leaf.path);
        return;
      }
      router.push(leaf.path);
    }

    // ========== 展开态：内联层级列表（展开/折叠，手风琴：同一时刻只保留一个分支） ==========
    const openKeys = ref<string[]>([]);

    /** 收集某节点及其所有子孙路径（用于关闭分支） */
    function collectDescendantPaths(leaf: Menu): string[] {
      const paths = [leaf.path];
      visibleChildren(leaf).forEach((child) => paths.push(...collectDescendantPaths(child)));
      return paths;
    }

    /** 查某路径所在的同级列表与祖先链（相对于展开根） */
    function findContainer(
      items: Menu[],
      path: string,
      ancestors: string[] = [],
    ): { siblings: Menu[]; ancestors: string[] } | null {
      for (const leaf of items) {
        if (leaf.path === path) return { siblings: items, ancestors };
        if (leaf.children?.length) {
          const found = findContainer(visibleChildren(leaf), path, [...ancestors, leaf.path]);
          if (found) return found;
        }
      }
      return null;
    }

    function toggleOpen(leaf: Menu) {
      const isOpen = openKeys.value.includes(leaf.path);
      if (isOpen) {
        // 关闭该分支（自身 + 子孙）
        const descendants = collectDescendantPaths(leaf);
        openKeys.value = openKeys.value.filter((p) => !descendants.includes(p));
        return;
      }
      // 展开该分支：手风琴——只保留【祖先链 + 当前节点】，其余分支全部关闭
      const container = findContainer(getExpandedRoot(), leaf.path);
      const ancestors = container?.ancestors || [];
      openKeys.value = Array.from(new Set([...ancestors.filter((p) => p !== leaf.path), leaf.path]));
    }

    /** 从根到目标路径的所有祖先 path（用于自动展开当前菜单链） */
    function findAncestors(items: Menu[], key: string, trail: string[] = []): string[] | null {
      for (const leaf of items) {
        if (leaf.path === key) return trail;
        if (leaf.children?.length) {
          const found = findAncestors(visibleChildren(leaf), key, [...trail, leaf.path]);
          if (found) return found;
        }
      }
      return null;
    }

    // 路由或菜单加载变化时，自动展开当前激活菜单的祖先链
    watch(
      [() => activeKey.value, () => menus.value],
      () => {
        const ancestors = findAncestors(menus.value, activeKey.value);
        if (ancestors) openKeys.value = ancestors;
      },
      { immediate: true },
    );

    /** 顶层模块列表（一级） */
    const topModules = computed<Menu[]>(() => (menus.value || []).filter(isVisible));

    /** 当前激活的一级模块（二级菜单的宿主），找不到则取第一个模块 */
    const activeModule = computed<Menu | null>(() => {
      const top = topModules.value;
      if (!top.length) return null;
      return top.find((leaf) => containsActive(leaf, activeKey.value)) || top[0];
    });

    /** 展开态菜单根：取激活模块的二级子项；若模块本身是叶子页则显示它自己 */
    const getExpandedRoot = (): Menu[] => {
      const mod = activeModule.value;
      if (!mod) return [];
      const kids = visibleChildren(mod);
      return kids.length ? kids : [mod];
    };

    const renderIcon = (leaf: Menu, active: boolean, size = 20) => (
      <Icon icon={leaf.icon} size={size} color={active ? '#ffffff' : '#6b7280'} />
    );

    /** 收起态 flyout 里的单行菜单项（叶子不显示图标） */
    const renderFlyoutItem = (leaf: Menu): VNode => {
      const active = isActive(leaf); // 命中链路
      const kids = hasChildren(leaf); // 有子级=分支，否则=叶子
      return (
        <div
          class={cn(
            'relative flex items-center cursor-pointer px-10px rd-4px transition-colors',
            // 颜色在整行上控制，文本继承，避免嵌套 group 干扰
            active ? 'bg-cyan-800 text-white' : 'text-gray-400 hover:text-white',
          )}
          style={{ height: '40px' }}
          onClick={() => handleNavigate(leaf)}
        >
          {active && <Light color="#00EAFF" width={4} height={20} class="absolute left-0 top-1/2 -translate-y-1/2" />}
          {kids && <Icon icon={leaf.icon} size={16} />}
          <span class="ml-8px text-13px truncate">{t(leaf.name)}</span>
        </div>
      );
    };

    /** 收起态：子菜单 hover flyout（单层） */
    // 间隙用外层容器的 pl-8px 承载（透明但可 hover），保证芯片→间隙→面板 hover 连续不断档
    const renderFlyout = (leaf: Menu) => {
      const children = visibleChildren(leaf);
      return (
        <div class="hidden group-hover:block absolute left-full top-0 z-50 pl-8px cursor-default">
          <div
            class="min-w-160px max-w-260px py-8px px-4px rd-12px bg-[#0f172a]/95 backdrop-blur-md border border-solid"
            style={{ borderColor: 'rgba(6, 255, 230, 0.10)' }}
          >
            {children.map((child) => renderFlyoutItem(child))}
          </div>
        </div>
      );
    };

    /** 收起态：仅图标芯片（一级）——激活芯片只给背景色，不带指示条 */
    const renderChip = (leaf: Menu): VNode => {
      const activeLeaf = isActive(leaf); // 收起态：被激活的芯片
      const kids = hasChildren(leaf);
      return (
        <div class="group relative">
          <div
            class={cn(
              'size-48px rd-8px relative backdrop-blur-md flex items-center justify-center border border-solid cursor-pointer',
              activeLeaf ? 'bg-cyan-800' : '',
            )}
            style={activeLeaf ? { borderColor: 'rgba(6, 255, 230, 0.45)' } : inactiveStyle}
            onClick={() => handleNavigate(leaf)}
          >
            {renderIcon(leaf, activeLeaf)}
          </div>
          {kids && renderFlyout(leaf)}
        </div>
      );
    };

    /** 渲染一个菜单子项：leaf=当前渲染的每一个子项，activeLeaf=其中被激活的叶子 */
    const renderExpandedItem = (leaf: Menu, level: number): VNode => {
      const active = isActive(leaf); // 命中链路：自身或子孙命中当前路由（分支/叶子）
      const activeLeaf = leaf.path === activeKey.value; // 精确命中当前页：被激活的叶子
      const kids = hasChildren(leaf); // 有子级=分支，否则=叶子
      const open = openKeys.value.includes(leaf.path);
      return (
        <div>
          <div
            class={cn(
              // group：让整行 hover 时级联控制 icon/文字/箭头变白
              'relative flex items-center cursor-pointer transition-all rd-6px',
              activeLeaf
                ? 'bg-gradient-to-tl from-[rgba(2,137,255,0.21)] via-[rgba(0,191,255,0.7)] to-[rgba(0,215,255,0.7)]'
                : '',
              // 分支（有子级）加背景做区分标记
              kids ? 'bg-[#0f1e33]' : '',
            )}
            style={{ height: '44px', paddingLeft: `${level * 10}px` }}
            onClick={() => (kids ? toggleOpen(leaf) : handleNavigate(leaf))}
          >
            {activeLeaf && (
              <Light color="#00EAFF" width={4} height={20} class="absolute left-0 top-1/2 -translate-y-1/2" />
            )}

            {kids && (
              <div class={cn('ml-16px transition-all', active ? 'text-white' : 'text-gray-400 group-hover:text-white')}>
                <Icon icon={leaf.icon} size={16} />
              </div>
            )}

            <span
              class={cn(
                'ml-12px text-14px flex-1 truncate transition-all',
                active ? 'text-white' : 'text-gray-400 group-hover:text-white',
              )}
            >
              {t(leaf.name)}
            </span>
            {kids && (
              <span
                class={cn(
                  'size-16px mr-16px transition-all i-ri-arrow-left-s-line',
                  active ? 'text-white' : 'text-gray-500 group-hover:text-white',
                  open ? '-rotate-90' : '',
                )}
              />
            )}
          </div>
          {kids && open && (
            <div class="flex flex-col mt-16px ml-16px">
              {visibleChildren(leaf).map((child) => renderExpandedItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    /** 菜单列表：收起=模块芯片 + flyout；展开=当前模块的二级子项内联列表（不显示一级模块名） */
    const renderItems = () => {
      const list = topModules.value;
      if (!list.length) {
        return <div class="text-gray-600 text-12px pt-40px">暂无菜单</div>;
      }
      if (unref(getCollapsed)) {
        return <div class="flex flex-col space-y-20px">{list.map((leaf) => renderChip(leaf))}</div>;
      }
      const root = getExpandedRoot();
      return <div class="flex flex-col w-full space-y-8px">{root.map((leaf) => renderExpandedItem(leaf, 0))}</div>;
    };

    const renderTrigger = () => {
      return (
        <div
          class="mt-auto py-8px w-full flex items-center justify-center cursor-pointer border-t border-solid text-gray-400 hover:text-white hover:border-[rgba(6,255,230,0.30)]"
          style={{ borderColor: 'rgba(255, 255, 255, 0.10)' }}
          onClick={toggleCollapsed}
        >
          <div
            class={cn(
              'size-20px transition-transform i-ri-arrow-left-double-line',
              unref(getCollapsed) ? 'rotate-180' : '',
            )}
          />
        </div>
      );
    };

    const { class: attrsClass, ...restAttrs } = attrs;

    // 合并外部传入的 style（如 sticky 定位/高度），便于接入布局时控制底端吸附
    const mergedStyle = computed<CSSProperties>(() => {
      const external = (attrs.style || {}) as CSSProperties;
      return {
        width: `${getWidth.value}px`,
        transition: 'width 0.2s',
        ...external,
      };
    });

    return () => (
      <aside
        {...restAttrs}
        class={cn('relative z-510 flex h-full flex-col items-center shrink-0 bg-[#0f172a]', attrsClass)}
        style={mergedStyle.value}
      >
        <div
          class={cn(
            'flex-1 w-full min-h-0 flex flex-col items-center',
            // 展开态内容超高时允许纵向滚动（收起态不加 overflow，避免裁剪 hover flyout）
            unref(getCollapsed) ? 'pt-24px' : 'px-10px pt-16px overflow-y-auto',
          )}
        >
          {renderItems()}
        </div>
        {renderTrigger()}
      </aside>
    );
  },
});

export default NewSider;
