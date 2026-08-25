import { cn, type ClassValue } from '@jeesite/core/libs';
import { animate, AnimatePresence, motion } from 'motion-v';
import { computed, defineComponent, ref, type PropType } from 'vue';
import { ConfigProvider } from 'antdv-next';
import { LayerTabs } from '@jeesite/display/components/layer-tabs';
import topBarImg from '@jeesite/assets/images/display/top-bar.webp';
import bottomBarImg from '@jeesite/assets/images/display/bottom-bar.webp';
import { PANEL_THEME } from './theme';
import { createInitialLayers, createInitialCategories } from './data';
import { LayerList } from './layer-list';
import { CategoryLeafRow, CategoryGroupRow, CategoryChildrenList } from './category-rows';
import { DataMenuTitle, DataMenuSearch } from './data-menu';
import type { LayerCategory, LayerChild } from './types';

/** 开关/开合动画时长（与 page-layout、glow-tabs 节奏一致） */
const ANIM_DURATION = 0.3;
/** 进出位移（px）：fadeLeftIn 从 -X 进入，fadeRightOut 向 +X 淡出 */
const ANIM_X = 24;
/** 数据菜单收起/展开的 height 动画时长与缓动 */
const MENU_ANIM = { duration: 0.28, ease: 'easeInOut' as const };

/**
 * LayerControls —— 图层管理器（左边缘胶囊按钮 + 完整浮层面板）
 *
 * - 点「图层管理器」→ 按钮 fadeRightOut + 面板 fadeLeftIn（AnimatePresence + motion.div）
 * - 面板：头部 LayerTabs（已打开图层/我的收藏 + × 关闭）、图层开关列表、
 *   数据菜单（Divider 标题 + 搜索 + 分类复选树，height 收起动画）
 * - 点右上角 × → 面板 fadeRightOut + 按钮 fadeLeftIn
 * - 数据菜单点击标题用 height 收起/展开（展开后 height 设 auto）
 *
 * 子组件拆分（同目录）：LayerList / CategoryRows / DataMenu，类型 data。
 */
export const LayerControls = defineComponent({
  name: 'LayerControls',
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: 'left-32px' },
  },
  setup(props) {
    /** 面板是否打开 */
    const open = ref(true);
    /** 头部页签：opened=已打开图层 / fav=我的收藏 */
    const activeTab = ref('opened');
    /** 数据菜单是否展开 */
    const menuExpanded = ref(true);
    /** 数据菜单内容容器 ref：height 收起/展开动画 */
    const menuBodyRef = ref<HTMLDivElement | null>(null);
    const searchText = ref('');

    /** 图层开关项（占位数据） */
    const layers = ref(createInitialLayers());
    /** 数据菜单分类（占位数据） */
    const categories = ref(createInitialCategories());
    /** leaf 单项勾选状态 */
    const leafChecked = ref<Record<string, boolean>>({});

    /** 按搜索词过滤分类（命中分组则展开其子项） */
    const filteredCategories = computed(() => {
      const kw = searchText.value.trim().toLowerCase();
      if (!kw) return categories.value;
      return categories.value
        .map((cat) => {
          if (cat.label.toLowerCase().includes(kw)) return cat;
          if (cat.children) {
            const matched = cat.children.filter((c) => c.label.toLowerCase().includes(kw));
            return matched.length ? { ...cat, expanded: true, children: matched } : null;
          }
          return null;
        })
        .filter((c): c is LayerCategory => c != null);
    });

    // ===== 交互 =====
    const openPanel = () => {
      open.value = true;
    };
    const closePanel = () => {
      open.value = false;
    };
    const toggleMenu = () => {
      const el = menuBodyRef.value;
      if (!el) {
        menuExpanded.value = !menuExpanded.value;
        return;
      }
      if (menuExpanded.value) {
        // 收起：内容高 → 0
        animate(el, { height: [`${el.scrollHeight}px`, '0px'] }, MENU_ANIM);
        menuExpanded.value = false;
      } else {
        // 展开：0 → 内容高，结束设 auto 以自适应内容变化
        animate(
          el,
          { height: ['0px', `${el.scrollHeight}px`] },
          {
            ...MENU_ANIM,
            onComplete: () => {
              if (el) el.style.height = 'auto';
            },
          },
        );
        menuExpanded.value = true;
      }
    };
    const toggleGroup = (cat: LayerCategory) => {
      cat.expanded = !cat.expanded;
    };
    const toggleLeaf = (key: string) => {
      leafChecked.value[key] = !leafChecked.value[key];
    };
    /** 分组 checkbox：全选/全不选；全选展开、全不选收起 */
    const toggleGroupCheck = (cat: LayerCategory) => {
      const children = cat.children ?? [];
      if (!children.length) return;
      const allChecked = children.every((c) => c.checked);
      children.forEach((c) => {
        c.checked = !allChecked;
      });
      cat.expanded = !allChecked;
    };
    /** 子项 toggle：直接改共享对象 */
    const toggleChild = (child: LayerChild) => {
      child.checked = !child.checked;
    };

    /** 关闭态：左边缘胶囊按钮 */
    const renderTrigger = () => (
      <motion.div
        key="trigger"
        class={cn('absolute top-24px p-4px rd-6px bg-white/10 backdrop-blur-lg z-50 flex', props.class)}
        initial={{ opacity: 0, x: -ANIM_X }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: ANIM_X }}
        transition={{ duration: ANIM_DURATION, ease: 'easeInOut' }}
        onClick={openPanel}
      >
        <div class="rd-8px flex items-center w-152px h-48px bg-gradient-to-tr from-[#0d1733] to-[#3261a2] cursor-pointer px-8px">
          <div
            class="size-32px rd-4 flex items-center justify-center"
            style="background: linear-gradient(180deg, rgba(0, 184, 212, 0.10) 0%, rgba(8, 153, 226, 0.10) 100%)"
          >
            <div class="i-ri-menu-fill size-16px text-white" />
          </div>
          <div class="text-white font-500 text-16px">图层管理器</div>
        </div>
      </motion.div>
    );

    /** 打开态：完整浮层面板 */
    const renderPanel = () => (
      <motion.div
        key="panel"
        class={cn(
          'absolute top-24px z-50 w-320px max-h-780px flex flex-col rd-4px of-hidden py-20px px-12px bg-linear-to-r from-[#0a385d] to-[#0a375e]',
          props.class,
        )}
        initial={{ opacity: 0, x: -ANIM_X }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: ANIM_X }}
        transition={{ duration: ANIM_DURATION, ease: 'easeInOut' }}
      >
        <img src={topBarImg} class="absolute top-0 pointer-events-none h-10px w-full" />
        <img src={bottomBarImg} class="absolute bottom-0 pointer-events-none h-10px w-full" />

        <ConfigProvider theme={PANEL_THEME}>
          {/* 头部：LayerTabs + 右上角关闭 */}
          <div class="flex items-center shrink-0">
            <LayerTabs
              items={[
                { key: 'opened', label: '已打开图层' },
                { key: 'fav', label: '我的收藏' },
              ]}
              activeKey={activeTab.value}
              onUpdate:activeKey={(key) => {
                activeTab.value = key as string;
              }}
            />
            <div class="i-ri-close-fill size-28px text-gray-400 cursor-pointer" onClick={closePanel} />
          </div>

          {/* 图层开关列表：按页签展示 */}
          <div class="mt-16px shrink-0">
            <LayerList items={activeTab.value === 'opened' ? layers.value : layers.value.filter((l) => l.starred)} />
          </div>

          {/* 数据菜单标题 */}
          <DataMenuTitle expanded={menuExpanded.value} onToggle={toggleMenu} />

          {/* 数据菜单内容：搜索 + 分类复选树（height 收起动画） */}
          <div ref={menuBodyRef} class="flex flex-col gap-1 overflow-hidden">
            <div class="mb-4px shrink-0">
              <DataMenuSearch
                value={searchText.value}
                onUpdate:value={(value) => {
                  searchText.value = value;
                }}
              />
            </div>

            <div class="overflow-y-auto scrollbar-gutter-stable pr-12px -mr-12px h-400px">
              <div class="flex flex-col gap-1">
                {filteredCategories.value.map((cat) => (
                  <div key={cat.key} class="flex flex-col">
                    {cat.type === 'leaf' ? (
                      <CategoryLeafRow cat={cat} checked={!!leafChecked.value[cat.key]} onToggle={toggleLeaf} />
                    ) : (
                      <CategoryGroupRow cat={cat} onExpand={toggleGroup} onCheck={toggleGroupCheck} />
                    )}
                    {cat.type === 'group' && cat.expanded && cat.children && (
                      <CategoryChildrenList cat={cat} onToggleChild={toggleChild} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ConfigProvider>
      </motion.div>
    );

    return () => (
      <AnimatePresence initial={false}>
        {!open.value && renderTrigger()}
        {open.value && renderPanel()}
      </AnimatePresence>
    );
  },
});
