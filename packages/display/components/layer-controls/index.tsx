import { cn, type ClassValue } from '@jeesite/core/libs';
import { animate, AnimatePresence, motion } from 'motion-v';
import { computed, defineComponent, ref, type PropType } from 'vue';
import { ConfigProvider, Divider, Input, Switch } from 'antdv-next';
import { LayerTabs } from '@jeesite/display/components/layer-tabs';
import { CircleX, Search } from 'lucide-vue-next';
import topBarImg from '@jeesite/assets/images/display/top-bar.webp';
import bottomBarImg from '@jeesite/assets/images/display/bottom-bar.webp';

/** 开关/开合动画时长的常量（与 page-layout、glow-tabs 保持一致节奏） */
const ANIM_DURATION = 0.3;
/** 进出位移（px）：fadeLeftIn 从 -X 进入，fadeRightOut 向 +X 淡出 */
const ANIM_X = 24;

/** 数据菜单收起/展开的 height 动画时长与缓动 */
const MENU_ANIM = { duration: 0.28, ease: 'easeInOut' as const };

/** 面板局部主题：Switch 主色用青蓝（ConfigProvider 作用域内生效，不改全局） */
const PANEL_THEME: any = {
  components: {
    Switch: {
      colorPrimary: '#00b8d4',
      // hover / active 不加深：与主色一致，避免悬停增色
      colorPrimaryHover: '#00b8d4',
      colorPrimaryActive: '#00b8d4',
      // 关闭（未选中）轨道背景改浅灰；hover 用同色，悬停不变色
      colorTextQuaternary: 'rgba(255, 255, 255, 0.3)',
      colorTextTertiary: 'rgba(255, 255, 255, 0.3)',
      trackMinWidthSM: 30,
      trackHeightSM: 16,
      handleSizeSM: 12,
      trackPadding: 2,
    },
    Divider: {
      // 深色面板上的分割线颜色（默认 colorSplit 近黑不可见）
      colorSplit: 'rgba(255, 255, 255, 0.12)',
    },
  },
};

/**
 * LayerControls —— 图层管理器（左边缘胶囊按钮 + 完整浮层面板）
 *
 * 大屏地图页左上角的「图层管理器」交互：
 * - 关闭态：左边缘显示胶囊按钮「图层管理器」
 * - 点击按钮 → 按钮 fadeRightOut（向右淡出），面板 fadeLeftIn（从左侧滑入）
 * - 面板包含：头部页签（已打开图层 / 我的收藏，右上角 × 关闭按钮）、
 *   图层开关列表、数据菜单（搜索 + 分类复选树）
 * - 点击右上角 × → 面板 fadeRightOut（向右淡出），按钮 fadeLeftIn（从左侧滑回）
 *
 * 动画实现：AnimatePresence + motion.div（挂载/卸载动画），
 * 进出方向天然不对称 —— 进入从左侧（x: -X → 0）淡入，退出向右侧（x: 0 → X）淡出，
 * 正好满足「按钮 fadeRightOut / 面板 fadeLeftIn；面板 fadeRightOut / 按钮 fadeLeftIn」。
 * AnimatePresence initial={false}：页面首次加载不播放进场动画，仅开关时播。
 *
 * props：
 * - class: 透传定位/尺寸 UnoCSS 类（默认 left-32px）
 *
 * 用法：
 * ```tsx
 * <LayerControls class="left-32px" />
 * ```
 */
export const LayerControls = defineComponent({
  name: 'LayerControls',
  props: {
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: 'left-32px' },
  },
  setup(props) {
    /** 面板是否打开（控制按钮/面板的挂载与进出动画） */
    const open = ref(true);
    /** 头部页签：opened=已打开图层 / fav=我的收藏图层（绑定 LayerTabs 的 activeKey） */
    const activeTab = ref('opened');
    /** 数据菜单区域是否展开 */
    const menuExpanded = ref(true);
    /** 数据菜单内容容器 ref：height 收起/展开动画使用 */
    const menuBodyRef = ref<HTMLDivElement | null>(null);
    const searchText = ref('');

    /** 「已打开图层 / 我的收藏」开关项（占位数据） */
    const layers = ref<LayerSwitchItem[]>([
      { key: 'jjz', label: '既有建筑改造', on: true, starred: true },
      { key: 'czc', label: '城中村改造', on: false, starred: false },
      { key: 'ljj', label: '老旧街区改造', on: true, starred: true },
      { key: 'ljx', label: '老旧小区改造', on: true, starred: false },
      { key: '老旧厂区改造', label: '老旧厂区改造', on: true, starred: false },
    ]);

    /** 数据菜单分类（占位数据）；group 可展开子项，leaf 为单项 */
    const categories = ref<LayerCategory[]>([
      { key: 'wx', label: '卫星影像', type: 'leaf' },
      { key: 'xzh', label: '行政区划', type: 'leaf' },
      { key: 'gxd', label: '更新单元', type: 'leaf' },
      { key: 'kj', label: '国土空间规划', type: 'group', expanded: false },
      {
        key: 'wg',
        label: '五改类型',
        type: 'group',
        expanded: true,
        count: 2,
        children: [
          { label: '既有建筑改造', checked: true },
          { label: '老旧小区改造', checked: true },
          { label: '老旧厂区改造', checked: false, highlight: true },
          { label: '老旧街区改造', checked: true },
          { label: '城中村改造', checked: false },
        ],
      },
      { key: 'bm', label: '城市白膜', type: 'leaf' },
      { key: 'jm', label: '城市精模', type: 'leaf' },
    ]);

    /** leaf 单项的勾选状态（占位交互） */
    const leafChecked = ref<Record<string, boolean>>({});

    /** 数据菜单分类：按搜索词过滤（命中分组则展开其子项） */
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
    const toggleStar = (item: LayerSwitchItem) => {
      item.starred = !item.starred;
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
        // 展开：0 → 内容高，结束设为 auto 以便内容变化时自适应高度
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

    // ===== 子元素渲染 =====
    /** 开关（antdv-next Switch） */
    const renderSwitch = (item: LayerSwitchItem) => (
      <Switch
        size="small"
        checked={item.on}
        onChange={(checked) => {
          item.on = checked;
        }}
      />
    );

    /** 复选（选中态：青色底 + 白勾） */
    const renderCheckbox = (checked: boolean) => (
      <span
        class={cn(
          'inline-flex size-18px rd-4 b-1 items-center justify-center shrink-0 transition-colors duration-150',
          checked ? 'bg-[#00b8d4] b-[#00b8d4]' : 'bg-white/5 b-white/30',
        )}
      >
        {checked && <span class="i-ri-check-line size-12px text-[#04121f]" />}
      </span>
    );

    /** 分组半选复选（青色底 + 短横，表达「已选 n」） */
    const renderIndeterminate = () => (
      <span class="inline-flex size-18px rd-4 b-1 items-center justify-center bg-[#00b8d4] b-[#00b8d4] shrink-0">
        <span class="w-10px h-2px rd-full bg-[#04121f]" />
      </span>
    );

    /** 单项分类行（卫星影像 / 行政区划 …） */
    const renderLeafRow = (cat: LayerCategory) => (
      <div
        class="flex items-center gap-3 h-48px px-6px cursor-pointer hover:bg-white/5 rd-8px"
        onClick={() => toggleLeaf(cat.key)}
      >
        <span class="size-5px rd-full bg-[#00b8d4]/70 shrink-0" />
        <span class="flex-1 text-white/90 text-14px">{cat.label}</span>
        {renderCheckbox(!!leafChecked.value[cat.key])}
      </div>
    );

    /** 分组分类行（国土空间规划 / 五改类型 …，可展开） */
    const renderGroupRow = (cat: LayerCategory) => (
      <div
        class="flex items-center gap-3 h-48px px-6px cursor-pointer hover:bg-white/5 rd-8px"
        onClick={() => toggleGroup(cat)}
      >
        <span
          class={cn(
            'i-ri-arrow-down-s-line size-16px text-white/60 transition-transform duration-200',
            cat.expanded ? '' : '-rotate-90',
          )}
        />
        <span class="flex-1 text-white/90 text-14px">{cat.label}</span>
        {cat.count != null && <span class="text-12px text-[#00b8d4]">(已选 {cat.count})</span>}
        {renderIndeterminate()}
      </div>
    );

    /** 分组展开的子项列表 */
    const renderChildren = (cat: LayerCategory) => (
      <div class="flex flex-col gap-1 pl-22px pr-6px pb-2px">
        {(cat.children ?? []).map((child) => (
          <div
            class={cn(
              'flex items-center gap-2 h-42px px-3 rd-8px text-14px cursor-pointer',
              child.highlight ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5',
            )}
          >
            <span class="flex-1">{child.label}</span>
            {renderCheckbox(child.checked)}
          </div>
        ))}
      </div>
    );

    /** 图层开关列表（按当前页签展示；外层负责边距） */
    const renderLayerList = (list: LayerSwitchItem[]) => (
      <div class="h-160px overflow-y-auto scrollbar-gutter-stable pr-0px -mr-12px">
        <div class="flex flex-col rd-6px bg-[#0c1c39]">
          {list.map((item) => (
            <div class="flex items-center min-h-36px shrink-0 px-12px py-8px">
              {renderSwitch(item)}
              <label
                class="ml-12px flex-1 text-white text-14px cursor-pointer select-none"
                onClick={() => (item.on = !item.on)}
              >
                {item.label}
              </label>

              <div
                class={cn(
                  'ml-16px size-16px shrink-0 cursor-pointer',
                  item.starred ? 'i-ri-star-fill text-amber-400' : 'i-ri-star-fill text-gray-500',
                )}
                onClick={() => toggleStar(item)}
              />
              <div class="ml-8px i-ri-delete-bin-fill size-16px text-gray-500 shrink-0 cursor-pointer" />
            </div>
          ))}
        </div>
      </div>
    );

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
          'absolute top-24px z-50 w-320px max-h-780px flex flex-col rd-4px of-hidden py-20px px-12px bg-linear-to-r from-[#0c2945] to-[#07465A]',
          props.class,
        )}
        initial={{ opacity: 0, x: -ANIM_X }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: ANIM_X }}
        transition={{ duration: ANIM_DURATION, ease: 'easeInOut' }}
      >
        <img src={topBarImg} class="absolute top-0 pointer-events-none h-10px w-full" />
        <img src={bottomBarImg} class="absolute bottom-0 pointer-events-none h-10px w-full" />

        {/* 头部：LayerTabs（已打开图层 / 我的收藏图层）+ 右上角关闭按钮 */}
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

          <div class="i-ri-close-fill size-28px text-gray-400 cursor-pointer " onClick={closePanel} />
        </div>

        {/* 图层开关列表：按选中页签展示（antdv-next Switch，局部主题） */}
        <div class="mt-16px shrink-0">
          <ConfigProvider theme={PANEL_THEME}>
            {activeTab.value === 'opened'
              ? renderLayerList(layers.value)
              : renderLayerList(layers.value.filter((l) => l.starred))}
          </ConfigProvider>
        </div>

        {/* 数据菜单：antdv Divider 标题居中（可折叠区头） */}
        <ConfigProvider theme={PANEL_THEME}>
          <Divider class="!m-0 !my-12px shrink-0" titlePlacement="center">
            <span
              class="inline-flex items-center gap-1 text-14px text-gray-400 cursor-pointer select-none"
              onClick={toggleMenu}
            >
              数据菜单
              <span
                class={cn(
                  'i-ri-arrow-down-s-line size-14px text-gray-400 transition-transform duration-200',
                  menuExpanded.value ? '-rotate-180' : '',
                )}
              />
            </span>
          </Divider>
        </ConfigProvider>

        {/* 数据菜单内容：搜索 + 分类复选树（height 收起/展开动画） */}
        <div ref={menuBodyRef} class="flex flex-col gap-1 overflow-hidden">
          <div class="mb-4px shrink-0">
            <Input
              classes={{
                root: '!bg-white/6 !border-gray-500 focus-within:!border-cyan-500 w-full h-40px text-white !rd-8px',
                input: 'placeholder:!text-gray-500 !pl-4px',
              }}
              value={searchText.value}
              onUpdate:value={(v) => {
                searchText.value = v;
              }}
              prefix={<Search class="size-20px text-gray-400" />}
              placeholder="请输入图层名称"
              allowClear
            >
              {{
                clearIcon: () => <CircleX class="size-20px text-gray-400" />,
              }}
            </Input>
          </div>

          <div class="overflow-y-auto scrollbar-gutter-stable -mr-12px pr-12px h-400px">
            <div class="flex flex-col gap-1">
              {filteredCategories.value.map((cat) => (
                <div key={cat.key} class="flex flex-col">
                  {cat.type === 'leaf' ? renderLeafRow(cat) : renderGroupRow(cat)}
                  {cat.type === 'group' && cat.expanded && cat.children && renderChildren(cat)}
                </div>
              ))}
            </div>
          </div>
        </div>
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

/** 图层开关项 */
interface LayerSwitchItem {
  key: string;
  label: string;
  on: boolean;
  starred: boolean;
}

/** 数据菜单子项 */
interface LayerChild {
  label: string;
  checked: boolean;
  /** 选中态高亮（如图片里的「老旧厂区改造」） */
  highlight?: boolean;
}

/** 数据菜单分类：leaf 单项 / group 可展开分组 */
interface LayerCategory {
  key: string;
  label: string;
  type: 'leaf' | 'group';
  expanded?: boolean;
  /** 已选数量，组内展示「(已选 n)」 */
  count?: number;
  children?: LayerChild[];
}
