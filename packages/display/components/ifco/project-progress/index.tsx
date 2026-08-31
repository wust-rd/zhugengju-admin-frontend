import { computed, defineComponent, onUnmounted, ref, type CSSProperties, type PropType, type SlotsType } from 'vue';
import { debounce } from 'lodash-es';
import MonitoringIcon from '@jeesite/assets/images/scheme/双层菱形.svg';
import TriangleIcon from '@jeesite/assets/images/scheme/三角形.svg';
import BottomLight from '@jeesite/assets/images/scheme/底部光晕.svg';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';

/** 项目进度列表数据 */
const PROJECT_STATUS_LIST = [
  { name: '新兴街片区拆除更新及周边配套', area: '合作路片', status: '规划许可', color: '#52D273' },
  { name: '共勉牌坊项目', area: '显正片', status: '立项批复', color: '#52D273' },
  { name: '胜利街(二曜路-三阳路)道路改造', area: '一元片', status: '建设中', color: '#F5C443' },
  { name: '珞瑜硅巷片一期锦鲤项目', area: '珞瑜硅巷片', status: '施工图审查', color: '#F59B45' },
  { name: '温馨路黑泥湖村段征拆项目', area: '黑泥湖片', status: '竣工验收', color: '#F05060' },
  { name: '楚宝里商业更新项目', area: '楚宝片', status: '初步设计批复', color: '#4FD8FF' },
];

/** 状态筛选选项（「全部状态」+ 去重后的状态） */
const STATUS_OPTIONS = ['全部状态', ...Array.from(new Set(PROJECT_STATUS_LIST.map((p) => p.status)))];

export const ProjectProgress = defineComponent({
  name: 'ProjectProgress',
  props: {
    /** 标题文字 */
    title: { type: String, default: '项目进度总览' },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  // 内容区通过默认插槽渲染
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    // —— 搜索（防抖：输入停止 300ms 后再更新过滤词，lodash debounce）——
    const keyword = ref('');
    const debouncedKeyword = ref('');
    const applyKeyword = debounce((v: string) => {
      debouncedKeyword.value = v;
    }, 300);

    const onSearchInput = (e: Event) => {
      keyword.value = (e.target as HTMLInputElement).value;
      applyKeyword(keyword.value);
    };

    // —— 状态筛选（antd Dropdown 封装）——
    const selectedStatus = ref('全部状态');

    onUnmounted(() => applyKeyword.cancel());

    /** 过滤后的列表（状态 + 名称） */
    const filteredList = computed(() => {
      const kw = debouncedKeyword.value.trim().toLowerCase();
      return PROJECT_STATUS_LIST.filter((p) => {
        const okStatus = selectedStatus.value === '全部状态' || p.status === selectedStatus.value;
        const okName = kw === '' || p.name.toLowerCase().includes(kw);
        return okStatus && okName;
      });
    });

    return () => (
      <div
        class={cn(
          'relative overflow-hidden rd-8px border border-cyan-800/60 backdrop-blur-4px px-16px pb-20px',
          props.class,
        )}
        style={{
          background:
            'radial-gradient(144.69% 140.47% at 0% 100.11%, rgba(46, 175, 255, 0.45) 0%, rgba(5, 27, 48, 0.00) 99.6%), rgba(5, 22, 48, 0.90)',
          boxShadow: 'inset 0 0 12px rgba(46, 213, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* 标题 */}
        <div class="h-52px flex items-center justify-between relative">
          <img src={MonitoringIcon} alt="" class="w-12px h-8px mr-8px" />
          <img src={TriangleIcon} alt="" class="w-16px h-20px ml-auto" />
          <div class="text-white text-18px font-500 mx-16px">项目进度总览</div>

          <img src={TriangleIcon} alt="" class="w-16px h-20px rotate-180" />
          <img src={MonitoringIcon} alt="" class="w-12px h-8px mr-8px rotate-180 ml-auto" />

          <img src={BottomLight} alt="" class=" absolute left-1/2 -translate-x-1/2 bottom-1px w-254px h-24px" />

          {/* 渐变底部条：中心亮青、两端渐隐，带柔光 */}
          <div
            class="absolute bottom-0 left-0 h-2px w-full"
            style={{
              background:
                'linear-gradient(90deg, rgba(14, 74, 110, 0) 0%, rgba(46, 213, 255, 0.50) 30%, rgba(46, 213, 255, 0.50) 70%, rgba(14, 74, 110, 0) 100%)',
            }}
          />
        </div>

        {/* 搜索框 + 状态筛选 */}
        <div class="mt-12px flex items-center gap-12px">
          {/* 搜索框 */}
          <div class="flex h-40px flex-1 items-center rounded-8px border border-white/10 bg-white/5 px-16px">
            <div class="i-ri:search-line size-16px shrink-0 text-white/40" />
            <input
              value={keyword.value}
              onInput={onSearchInput}
              class="ml-10px h-full flex-1 bg-transparent text-14px text-white outline-none placeholder:text-white/40"
              placeholder="输入指标 / 类别名称"
            />
          </div>

          {/* 状态筛选（antd Dropdown 封装，class 覆盖回原来的直圆角卡片样式） */}
          <DropdownSelector
            activeKey={selectedStatus.value}
            items={STATUS_OPTIONS.map((s) => ({ key: s, label: s }))}
            class="h-40px w-136px rd-8px border border-white/10 bg-white/5 px-16px"
            ghost
            onUpdate:activeKey={(k) => {
              selectedStatus.value = (k as string | null) ?? '全部状态';
            }}
          >
            {{
              prefix: () => <div class="i-ri:filter-line size-16px shrink-0 text-white/85" />,
              suffix: () => null, // 屏蔽默认胶囊箭头，与原有样式一致
            }}
          </DropdownSelector>
        </div>

        {/* 列表（按状态 + 名称过滤） */}
        <div class="mt-12px flex flex-col gap-6px">
          {filteredList.value.map((p) => (
            <div
              key={p.name}
              class="flex items-center rounded-8px border border-white/8 bg-white/4 pl-20px py-10px transition-colors duration-150 hover:bg-white/8 h-44px"
            >
              <div class="text-14px font-500 text-white">{p.name}</div>
              <div class="ml-12px shrink-0 text-12px text-white/75">{p.area}</div>

              {/* 状态胶囊 */}
              <div
                class="ml-auto shrink-0 rounded-full border px-10px py-3px text-12px"
                style={{
                  color: p.color,
                  borderColor: p.color,
                  background: `${p.color}1A`,
                }}
              >
                {p.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
});
