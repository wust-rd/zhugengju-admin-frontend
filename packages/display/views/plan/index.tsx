import { cn } from '@jeesite/core/libs';
import { ArtFont } from '@jeesite/display/components/art-font';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { GlowTabs, type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { StatCard } from '@jeesite/display/components/stat-card';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { Tooltip, type MenuItemType } from 'antdv-next';
import { AnimatePresence, animate, motion } from 'motion-v';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';

// 区域 tabs：激活项由 GlowTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
];

export default defineComponent({
  name: 'DisplayPlan',
  setup() {
    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('district');

    // 指标分类下拉菜单项
    const batches: MenuItemType[] = [
      {
        key: '1',
        label: '第一批 80',
      },
      {
        key: '2',
        label: ' 第二批 120',
      },
    ];

    const activeBatch = ref('1');

    /** 左侧面板引用：向左平移收起的动画目标 */
    const panelRef = ref<HTMLDivElement | null>(null);
    /** 收起按钮（GlassRing）引用：motion-v 通过该 ref 关联触发元素 */
    const ringRef = ref<InstanceType<typeof GlassRing> | null>(null);
    /** 收起状态：true = 面板已向左平移收起 */
    const collapsed = ref(false);

    // 片区投资总额右侧环形图
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      setOptions({
        series: [
          {
            type: 'pie',
            radius: ['68%', '82%'],
            center: ['50%', '50%'],
            padAngle: 3,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: [
              {
                value: 113.3,
                name: '2026年完成',
                itemStyle: {
                  color: '#eeff2a',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#eeff2a',
                },
              },
              {
                value: 783.34,
                name: '累计完成',
                itemStyle: {
                  color: '#4ADE80',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#4ADE80',
                },
              },
            ],
          },
        ],
      });
    });

    /**
     * 点击收起/展开按钮：
     * - 收起：面板整体向左平移（x: 0 → -460px，移出屏幕左侧）
     * - 展开：面板向右平移回原位（x: -460 → 0）
     * 用 motion-v 的 animate() 命令式驱动，保证与 UI 状态 ref 同步。
     */
    const toggleCollapse = () => {
      const el = panelRef.value;
      if (!el) return;
      animate(el, collapsed.value ? { x: [-460, 0] } : { x: [0, -460] }, {
        duration: 0.3,
        ease: 'easeInOut',
      });
      collapsed.value = !collapsed.value;
    };

    return () => (
      <div class="relative h-full">
        {/* 展开按钮：面板收起后固定在左边缘，点击展开面板 */}
        <AnimatePresence>
          {collapsed.value && (
            <motion.div
              key="expand-btn"
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.2 }}
              class="absolute left-8px top-32px"
            >
              <GlassRing class="w-32px h-32px flex items-center justify-center cursor-pointer" onClick={toggleCollapse}>
                <div class="i-ri-arrow-right-double-fill size-20px text-white" />
              </GlassRing>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 左侧面板：点击 GlassRing 后整体向左平移收起 */}
        <div ref={panelRef} class="blue-bg pl-16px pr-24px pt-24px w-460px h-full flex flex-col">
          <GlowTitle2 class="w-full h-56px">
            <ArtFont class="ml-72px text-20px">数据看板</ArtFont>

            <DropdownSelector v-model:activeKey={activeBatch.value} items={batches} class="ml-auto w-128px" ghost />

            <GlassRing
              ref={ringRef}
              class="ml-16px w-32px h-32px flex items-center justify-center cursor-pointer"
              onClick={toggleCollapse}
            >
              <div class="i-ri-arrow-left-double-fill size-20px text-white" />
            </GlassRing>
          </GlowTitle2>

          {/* 统计卡片：StatCard 只提供边框容器，内容由调用方渲染 */}
          <StatCard class="mt-24px">
            <div class="flex items-center">
              <div>
                {/* 顶部标题栏 */}
                <div class="flex items-center">
                  <DoubleRing class="size-32px">
                    <div class="i-ri-exchange-2-fill size-16px text-white" />
                  </DoubleRing>
                  <span class="ml-12px text-16px text-white font-500 tracking-wide">片区投资总额</span>
                  <Tooltip title="片区投资总额统计口径：含土地出让、基础设施及公共服务设施投资">
                    <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
                  </Tooltip>
                </div>

                {/* 中部数值区：数字用 Subway Ticker Grid 点阵 */}
                <div class="mt-20px flex items-baseline gap-8px">
                  <span class="font-subway text-36px font-700 leading-none text-cyan-500">1310.72</span>
                  <span class="text-20px text-white/90 font-500">亿</span>
                </div>
              </div>

              <div ref={chartRef} id="chart" class="size-100px ml-auto"></div>
            </div>

            {/* 底部指标行 */}
            <div class="mt-20px flex items-center">
              {[
                { value: '783.34', label: '累计完成' },
                { value: '113.30', label: '2026年完成' },
              ].map((item) => (
                <div key={item.label} class="flex flex-1 items-center">
                  <div class="w-4px h-56px rd-full bg-linear-to-b from-[#3BCFF7] to-[#84E6BD]" />
                  <div class="ml-20px">
                    <div class="inline-flex items-end text-white">
                      <span class="font-subway text-20px font-600 tabular-nums">{item.value}</span>
                      <span class="text-14px ml-4px translate-y-[-2px]">亿</span>
                    </div>
                    <div class="text-13px text-white/50">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </StatCard>

          {/* 区域 tabs：svg 发光胶囊滑动指示器（GlowTabs 抽象组件，tab 内容由调用方渲染） */}
          <GlowTabs v-model:activeKey={activeRegionKey.value} class="mt-20px">
            {{
              // tab 完全由调用方渲染（GlowTabs 抽象组件）：每个元素带 data-glow-tab-key 供点击委托与指示器测量
              default: () =>
                regionTabs.map((tab) => {
                  const active = tab.key === activeRegionKey.value;
                  return (
                    <div
                      key={tab.key}
                      data-glow-tab-key={tab.key}
                      class="shrink-0 px-12px flex-1 h-42px rd-10px flex items-center justify-center gap-8px select-none cursor-pointer"
                    >
                      <div
                        class={cn(tab.icon, 'size-20px transition-colors', active ? 'text-white' : 'text-gray-500')}
                      />
                      <span class={cn('text-16px transition-colors', active ? 'text-white' : 'text-gray-500')}>
                        {tab.label}
                      </span>
                    </div>
                  );
                }),
            }}
          </GlowTabs>
        </div>
      </div>
    );
  },
});
