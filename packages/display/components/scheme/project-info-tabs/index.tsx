import { defineComponent, ref, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

import { BasicInfo } from './basic-info';
import { RenovationInfo } from './renovation-info';

/** Tab 配置 */
const TABS = ['项目基本信息', '项目改造情况'] as const;
type TabLabel = (typeof TABS)[number];

/**
 * ProjectInfoTabs —— 地图右侧项目信息 Tab 面板
 *
 * 胶囊分段控件（激活项蓝色发光胶囊）+ 下方内容区（当前留空，由使用方填充）
 *
 * props：
 * - class：透传类（定位/尺寸，如 w-320px）
 */
export const ProjectInfoTabs = defineComponent({
  name: 'ProjectInfoTabs',
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    const activeTab = ref<TabLabel>('项目基本信息');

    return () => (
      <div class={cn('w-420px', props.class)}>
        {/* Tab 栏（胶囊分段控件，样式同 views/project 页） */}
        <div class="flex h-52px rounded-full bg-[#1a3a5c] p-4px">
          {TABS.map((tab) => (
            <div
              key={tab}
              class={
                'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px text-white transition-all duration-200 ' +
                (activeTab.value === tab
                  ? 'bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 shadow-lg'
                  : 'text-white/60 hover:text-white')
              }
              onClick={() => (activeTab.value = tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* 内容区：两个 Tab 各自独立组件 */}
        <div class="mt-12px">
          {activeTab.value === '项目基本信息' && <BasicInfo />}
          {activeTab.value === '项目改造情况' && <RenovationInfo />}
        </div>
      </div>
    );
  },
});
