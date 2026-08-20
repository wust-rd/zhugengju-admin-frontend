import chartSvg from '@jeesite/assets/svg/display/chart.svg';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { buildYearItems, cn } from '@jeesite/core/libs';
import { CornerPanel } from '@jeesite/display/components/corner-panel';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlowCollapse } from '@jeesite/display/components/glow-collapse';
import { GlowTabs, type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle1 } from '@jeesite/display/components/glow-title/title1';
import type { MenuItemType } from 'antdv-next';
import { Input } from 'antdv-next';
import { CircleX, Funnel, Search } from 'lucide-vue-next';
import { AnimatePresence, motion } from 'motion-v';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';

// 指标评价结果分布：饼图与右侧统计网格共用同一份数据（数值为百分数）
const ratingData = [
  { key: '很好', label: '很好', value: 18.7, color: '#22D3EE' },
  { key: '无标准', label: '无标准', value: 20.1, color: '#CBD5E1' },
  { key: '较好', label: '较好', value: 32.5, color: '#4ADE80' },
  { key: '较差', label: '较差', value: 32.5, color: '#F472B6' },
  { key: '一般', label: '一般', value: 23.7, color: '#FBBF24' },
];

// 区域 tabs：激活项由 GlowTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'city', label: '城区', icon: 'i-ri-map-2-line' },
  { key: 'factory', label: '工厂', icon: 'i-ri-community-line' },
  { key: 'enterprise', label: '企业', icon: 'i-ri-building-2-line' },
  { key: 'residence', label: '住宅', icon: 'i-ri-home-smile-line' },
];

// icon 左移动画时长（s）：文字需等 icon 左移完成后再渐显
const ICON_MOVE_DURATION = 0.2;

// 文字动画方式：'slide-right'（右滑）| 'slide-up'（自下而上），改这里即可切换
const TEXT_ANIMATION_MODE: 'slide-right' | 'slide-up' = 'slide-right';

// 两种文字进出动画：位移方向不同（x 右滑 / y 上移），透明渐显逻辑相同
const textMotion = {
  'slide-right': {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
};

export default defineComponent({
  name: 'DisplayInspection',
  setup() {
    // 指标分类下拉菜单项
    const items: MenuItemType[] = [
      {
        key: '1',
        label: '一好基础指标',
      },
      {
        key: '2',
        label: '二好基础指标',
      },
      {
        key: '3',
        label: '三好基础指标',
      },
      {
        key: '4',
        label: '四好基础指标',
      },
    ];

    // 年份下拉：最近 N 年（当前改为最近两年，变更年数只改 buildYearItems 参数）
    const yearItems = buildYearItems(2);

    // 受控选中项：指标分类默认选中「四好基础指标」，年份默认选中最近一年（当前年）
    const indicatorKey = ref<string | number>('4');
    const yearKey = ref<string | number>(yearItems[0]?.key ?? '');

    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('city');

    // 指标评价结果：环形饼图（与 useECharts 同款用法，参照 VisitRadar.vue）
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions, getInstance } = useECharts(chartRef as Ref<HTMLDivElement>);
    // 中心文字：初始为空，hover 某段时填充其名称与数值（由下方 HTML overlay 渲染，避免 echarts graphic 类型问题）
    const centerLabel = ref('');
    const centerValue = ref('');

    onMounted(() => {
      // options 内联传入 setOptions，由参数类型 EChartsOption 上下文推断，
      // 保证 type: 'pie' 保持字面量类型（脱离上下文会被拓宽为 string 报类型不匹配）
      setOptions({
        series: [
          {
            type: 'pie',
            // —— 饼圈粗细 ——
            // 环形半径：[内半径%, 外半径%]，数值差 = 环宽。80%~87% 即环宽 7% 的细圈，
            // 想更细就拉近两值（如 ['83%','87%']），想更粗就拉开（如 ['70%','87%']）
            radius: ['80%', '87%'],
            center: ['50%', '50%'],
            // 段与段之间的夹角间隙（度），数值越大分段越明显
            padAngle: 4,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: ratingData.map(({ label, value, color }) => ({
              name: label,
              value,
              itemStyle: {
                color,
                borderRadius: 2,
                // —— 荧光效果 ——
                // shadowColor 与段同色 + shadowBlur 向四周晕开，形成霓虹发光；
                // blur 越大荧光越强（同时扩散越开），调小可减弱至无荧光（0）
                shadowBlur: 8,
                shadowColor: color,
                shadowOffsetY: 0,
              },
            })),
          },
        ],
      });

      // 鼠标移入某段：中心显示该段名称与数值；移出后清空
      const chart = getInstance();
      if (!chart) return;
      chart.on('mouseover', (params) => {
        const item = ratingData.find((d) => d.label === params.name);
        if (!item) return;
        centerLabel.value = item.label;
        centerValue.value = `${item.value}%`;
      });
      chart.on('mouseout', () => {
        centerLabel.value = '';
        centerValue.value = '';
      });
    });

    return () => (
      <div class="blue-bg pl-16px pr-24px pt-24px w-460px h-full flex flex-col">
        <div class="flex items-center w-full">
          <DropdownSelector v-model:activeKey={yearKey.value} items={yearItems} class="w-120px" />

          <DropdownSelector v-model:activeKey={indicatorKey.value} items={items} class="ml-auto w-208px">
            {{
              prefix: () => <img src={chartSvg} alt="" class="size-32px" />,
            }}
          </DropdownSelector>
        </div>

        <GlowTabs v-model:activeKey={activeRegionKey.value} class="mt-16px">
          {{
            // tab 完全由调用方渲染（GlowTabs 抽象组件）：每个元素带 data-glow-tab-key 供点击委托与指示器测量
            // 内容动画（motion-v）：非激活仅灰色 icon；激活时 icon 左移变白，文字随后渐显
            default: () =>
              regionTabs.map((tab) => {
                const active = tab.key === activeRegionKey.value;
                return (
                  <div
                    key={tab.key}
                    data-glow-tab-key={tab.key}
                    class="shrink-0 px-12px w-102px h-42px rd-12px flex items-center justify-center select-none cursor-pointer"
                  >
                    <motion.div
                      class="relative flex items-center"
                      animate={{ x: active ? -16 : 0 }}
                      transition={{ duration: ICON_MOVE_DURATION, ease: 'easeOut' }}
                    >
                      <div class={cn(tab.icon, 'size-20px transition-all', active ? 'text-white' : 'text-gray-500')} />
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            key={`${tab.key}-label`}
                            class="absolute left-full ml-6px text-16px text-white font-500 whitespace-nowrap"
                            initial={textMotion[TEXT_ANIMATION_MODE].initial}
                            animate={textMotion[TEXT_ANIMATION_MODE].animate}
                            exit={textMotion[TEXT_ANIMATION_MODE].exit}
                            transition={{ duration: 0.2, ease: 'easeOut', delay: ICON_MOVE_DURATION }}
                          >
                            {tab.label}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              }),
          }}
        </GlowTabs>

        <div class="mt-20px">
          <GlowTitle1 class="w-full h-28px">
            <div class="pl-52px mb-4px text-white font-500 text-18px">指标评价结果</div>
          </GlowTitle1>

          <div class="mt-16px flex items-center">
            <div class="relative w-160px h-160px shrink-0">
              <div ref={chartRef} class="w-full h-full" />
              {/* 中心文字 overlay：hover 某段时显示其名称与数值，pointer-events-none 不挡图表交互 */}
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* —— 文本大小 —— */}
                {/* 名称：text-12px 小号，可改 text-14px 等调整 */}
                <span class="text-white text-16px leading-6">{centerLabel.value}</span>
                {/* 数值：text-26px 大号，可改 text-30px 等调整 */}
                <span class="text-white text-20px font-500 leading-8">{centerValue.value}</span>
              </div>
            </div>

            <div class="ml-16px flex-1 grid grid-cols-2 gap-x-12px gap-y-8px">
              {ratingData.map((item) => (
                <div key={item.label} class="flex items-center gap-8px px-8px py-6px whitespace-nowrap">
                  <div class="w-2px h-6px rd-full" style={{ backgroundColor: item.color }} />
                  <span class="text-white text-14px">{item.label}</span>
                  <span class="text-white text-16px ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="mt-20px flex items-center gap-x-12px h-40px">
          {/* 搜索输入框：前缀为 lucide-vue-next 搜索 icon；root 定制背景/边框，input 定制 placeholder 颜色
                  （antdv cssinjs 运行时注入会覆盖普通类，故用 !important 前缀的 UnoCSS 类） */}
          <Input
            classes={{
              root: '!bg-white/6 !border-gray-500 focus-within:!border-cyan-500 w-280px h-40px text-white !rd-8px',
              input: 'placeholder:!text-gray-500 !pl-4px',
            }}
            prefix={<Search class="size-20px text-gray-400" />}
            placeholder="输入指标 / 类别名称"
            allowClear
          >
            {{
              // 清除按钮：替换 antdv 默认图标为 lucide 的 X
              clearIcon: () => <CircleX class="size-20px text-gray-400" />,
            }}
          </Input>

          <DropdownSelector
            v-model:activeKey={yearKey.value}
            items={ratingData}
            placeholder="全部"
            class="w-136px rd-8px px-12px"
            allowClear
          >
            {{
              prefix: () => <Funnel class="size-20px text-gray-400" />,
              suffix: () => null,
            }}
          </DropdownSelector>
        </div>

        <div class="mt-16px space-y-12px flex-1 min-h-0 overflow-y-auto pr-24px -mr-24px scrollbar-gutter-stable">
          {/* 折叠面板：标题 + 徽章 + 箭头，点击展开/收起（GlowCollapse 组件） */}
          <GlowCollapse title="生态宜居" badgeValue={25}>
            <CornerPanel highlight="line" />
          </GlowCollapse>

          <GlowCollapse title="历史文化保护利用" badgeValue={18}>
            <CornerPanel highlight="line" />
          </GlowCollapse>

          <GlowCollapse title="特色活力" badgeValue={12}>
            <CornerPanel highlight="line" />
          </GlowCollapse>
        </div>
      </div>
    );
  },
});
