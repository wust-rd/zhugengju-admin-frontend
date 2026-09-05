import { cn, type ClassValue } from '@jeesite/core/libs';
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  Transition,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue';

import { ExpropriationBasicInfo } from './project-basic-info';

/** Tab 配置（征收进度汇总内容待填充，先渲染占位） */
const TABS = ['项目基本信息', '征收进度汇总'] as const;
type TabLabel = (typeof TABS)[number];

/**
 * ExpropriationInfoTabs —— 地图右侧征收项目信息 Tab 面板
 *
 * 结构与 ifco 的 ProjectInfoTabs 同款：
 * - Tab 栏：胶囊轨道 + 滑动高亮指示器（切换时平滑滑动）
 * - 内容区：按切换方向左右滑动 + 淡入淡出（Transition）
 *
 * props：
 * - class：透传类（定位/尺寸）
 */
export const ExpropriationInfoTabs = defineComponent({
  name: 'ExpropriationInfoTabs',

  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },

  setup(props) {
    const activeTab = ref<TabLabel>('项目基本信息');
    const tabBarRef = ref<HTMLElement | null>(null);

    /* ---------- 滑动高亮指示器 ---------- */
    const indicatorStyle = ref<CSSProperties>({ left: '4px', width: '0px' });

    const updateIndicator = () => {
      const el = tabBarRef.value?.querySelector<HTMLElement>(`[data-tab="${activeTab.value}"]`);
      if (!el) return;
      indicatorStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` };
    };

    watch(activeTab, updateIndicator);
    onMounted(() => {
      updateIndicator();
      window.addEventListener('resize', updateIndicator);
    });
    onUnmounted(() => window.removeEventListener('resize', updateIndicator));

    /* ---------- 内容切换方向（滑动动画用） ---------- */
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
      <div class={cn('w-400px', props.class)}>
        {/* Tab 栏：胶囊轨道 + 滑动高亮指示器 */}
        <div ref={tabBarRef} class="relative flex h-52px rounded-full bg-[#1a3a5c] p-4px">
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
            {activeTab.value === '项目基本信息' ? (
              <ExpropriationBasicInfo />
            ) : (
              /* 征收进度汇总（待填充） */
              <div
                class="flex h-300px items-center justify-center rd-16px text-14px text-white/40"
                style={{ background: 'linear-gradient(270deg, #0F172A 1.26%, rgba(37, 86, 126, 0.90) 99.65%)' }}
              >
                征收进度汇总（待填充）
              </div>
            )}
          </Transition>
        </div>
      </div>
    );
  },
});
