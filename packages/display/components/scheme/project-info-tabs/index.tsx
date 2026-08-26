import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
  Transition,
  type CSSProperties,
  type PropType,
} from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

import { BasicInfo } from './basic-info';
import { RenovationInfo } from './renovation-info';

/** Tab 配置 */
const TABS = ['项目基本信息', '项目改造情况'] as const;
type TabLabel = (typeof TABS)[number];

/**
 * ProjectInfoTabs —— 地图右侧项目信息 Tab 面板
 *
 * - Tab 栏：滑动高亮指示器，切换时从左/右平滑滑到目标 tab
 * - 内容区：切换时按方向左右滑动 + 淡入淡出（Transition，纯 CSS）
 *
 * props：
 * - class：透传类（定位/尺寸）
 */
export const ProjectInfoTabs = defineComponent({
  name: 'ProjectInfoTabs',
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    const activeTab = ref<TabLabel>('项目基本信息');
    const tabBarRef = ref<HTMLElement | null>(null);

    /* ---------- 滑动高亮指示器 ---------- */
    // 指示器 left/width 跟随 activeTab，过渡由 class 的 transition-all 承担
    const indicatorStyle = ref<CSSProperties>({ left: '4px', width: '0px' });

    const updateIndicator = () => {
      const el = tabBarRef.value?.querySelector<HTMLElement>(`[data-tab="${activeTab.value}"]`);
      if (!el) return;
      // offsetLeft/offsetWidth 相对 Tab 栏（relative）
      indicatorStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` };
    };

    watch(activeTab, updateIndicator);
    onMounted(() => {
      updateIndicator();
      window.addEventListener('resize', updateIndicator);
    });
    onUnmounted(() => window.removeEventListener('resize', updateIndicator));

    /* ---------- 内容切换方向（滑动动画用） ---------- */
    // slideDir：新内容从哪一侧进来。切到右侧 tab → 'left'（旧内容向左出、新内容从右进）
    const prevIndex = ref(0);
    const slideDir = ref<'left' | 'right'>('left');

    const selectTab = (tab: TabLabel) => {
      if (activeTab.value === tab) return;
      const next = TABS.indexOf(tab);
      slideDir.value = next > prevIndex.value ? 'left' : 'right';
      prevIndex.value = next;
      activeTab.value = tab;
    };

    const enterFrom = computed(() =>
      slideDir.value === 'left' ? 'opacity-0 translate-x-20px' : 'opacity-0 -translate-x-20px',
    );
    const leaveTo = computed(() =>
      slideDir.value === 'left' ? 'opacity-0 -translate-x-20px' : 'opacity-0 translate-x-20px',
    );

    return () => (
      <div class={cn('w-420px', props.class)}>
        {/* Tab 栏：胶囊轨道 + 滑动高亮指示器 */}
        <div ref={tabBarRef} class="relative flex h-52px rounded-full bg-[#1a3a5c] p-4px">
          {/* 滑动高亮指示器：随 activeTab 平滑滑动 */}
          <div
            class="absolute bottom-4px top-4px rounded-full bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] shadow-lg transition-all duration-300 ease-out"
            style={indicatorStyle.value}
          />

          {TABS.map((tab) => (
            <div
              key={tab}
              data-tab={tab}
              class={cn(
                'relative z-10 flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px transition-colors duration-150',
                activeTab.value === tab ? 'font-500 text-white' : 'text-white/60 hover:text-white',
              )}
              onClick={() => selectTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* 内容区：切换时按方向左右滑动 + 淡入淡出 */}
        <div class="mt-12px overflow-hidden">
          <Transition
            mode="out-in"
            enterActiveClass="transition-all duration-300 ease-out"
            enterFromClass={enterFrom.value}
            enterToClass="opacity-100 translate-x-0"
            leaveActiveClass="transition-all duration-200 ease-in"
            leaveFromClass="opacity-100 translate-x-0"
            leaveToClass={leaveTo.value}
          >
            {activeTab.value === '项目基本信息' ? <BasicInfo /> : <RenovationInfo />}
          </Transition>
        </div>
      </div>
    );
  },
});
