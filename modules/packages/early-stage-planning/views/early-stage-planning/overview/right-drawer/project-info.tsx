import { computed, defineComponent, ref, shallowRef, watch, type PropType, type Ref } from 'vue';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import { cn } from '@jeesite/core/libs';
import type { AreaInfo } from '../area-info';
import type { EspSchemeProject } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { ViewDetailButton } from './view-detail-button';
import { ProjectDetailModal, categoryColorOf } from './project-detail-modal';

/** 资金来源分段/图例色板（按勾选顺序循环取色，同大屏荧光色系） */
const SEGMENT_COLORS = ['#4FD8FF', '#4ADE80', '#F5C443', '#F97316', '#A78BFA', '#F472B6', '#38BDF8', '#2EE6A8'];

/** 项目情况（含资金方案：项目清单 + 资金统计图 + 资金来源概况） */
export const ProjectInfo = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[项目情况] 片区完整数据（图斑要素 + 填报表单）', props.area);

    /** 片区项目清单（填报「项目情况」projects：改造类别 + 项目名等全字段） */
    const projects = computed<EspSchemeProject[]>(() => props.area.form?.projects ?? []);

    /** 项目详情弹窗可见性 */
    const detailVisible = ref(false);

    /* ---------- 资金方案（并入本 tab）：环形图 + 图例 + 资金来源概况 ---------- */

    /** 勾选的资金来源（fundSources 键存在即选中；金额未填 null → 记 0） */
    const fundItems = computed(() =>
      Object.entries(props.area.form?.fundSources ?? {}).map(([name, amount]) => ({
        name,
        amount: amount ?? 0,
      })),
    );

    /** 总投资估算（亿元，环形图中心大数字） */
    const invest = computed(() => props.area.form?.invest ?? null);
    const investText = computed(() => (invest.value != null ? Number(invest.value).toFixed(2) : '—'));

    /** 资金来源概况（≤500 字） */
    const fundOverview = computed(() => props.area.form?.fundOverview?.trim() || '');

    /** 资金来源环形图（echarts pie，同看板投资总额卡片的画法） */
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    watch(
      fundItems,
      (items) => {
        const total = items.reduce((sum, it) => sum + (it.amount || 0), 0);
        setOptions({
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(10, 26, 45, 0.92)',
            borderColor: 'rgba(86, 168, 224, 0.5)',
            borderWidth: 1,
            padding: [8, 12],
            textStyle: { color: '#EAF4FF', fontSize: 13 },
            formatter: (params: Recordable) => {
              const value = Number(params.value ?? 0);
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                `${params.marker}<span style="font-weight:500">${params.name}</span><br/>` +
                `<span style="color:#9FC4E0">金额</span> <span style="font-weight:600">${value.toFixed(2)} 亿</span>` +
                `<span style="color:#9FC4E0;margin-left:10px">占比</span> ` +
                `<span style="color:#7DE3B0;font-weight:600">${pct.toFixed(1)}%</span>`
              );
            },
          },
          series: [
            {
              type: 'pie',
              radius: ['72%', '82%'],
              center: ['50%', '50%'],
              padAngle: 3,
              avoidLabelOverlap: true,
              label: { show: false },
              emphasis: { scale: false },
              // 全 0 时给灰色整环占位（避免空白环），正常时按金额占比分段
              data:
                total > 0
                  ? items.map((it, i) => ({
                      value: it.amount,
                      name: it.name,
                      itemStyle: {
                        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                        borderRadius: 3,
                      },
                    }))
                  : [{ value: 1, name: '暂无资金数据', itemStyle: { color: 'rgba(255,255,255,0.10)' } }],
            },
          ],
        });
      },
      { immediate: true },
    );

    return () => (
      <>
        <div class="p-16px overflow-hidden relative">
          {/* 可折叠区块 */}
          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px w-full items-center relative pb-4px">
                  <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                  <div class="text-18px font-400 text-white ml-8px font-youshe">片区项目情况</div>

                  {/* 箭头：打开朝下（SVG 原方向不旋转），关闭朝右（逆时针转 90°） */}
                  <img
                    src={arrowImg}
                    alt=""
                    class={cn('w-20px h-20px ml-auto transition-transform duration-200', {
                      '-rotate-90': !isOpen,
                    })}
                  />

                  {/* 底部图片 */}
                  <img src={bottomImg} alt="" class="w-full h-4px absolute bottom-0 left-0 object-fill" />
                </div>
              ),
              body: () => (
                <div class="">
                  {/* 片区项目清单：改造类别圆点 + 项目名（超长单行省略，title 悬浮看全名） */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    {/* 标题行 */}
                    <div class="flex h-34px items-center">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>
                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区项目清单</div>

                      {/* 查看详情按钮（组件：蓝渐变 + 三处光晕） */}
                      <ViewDetailButton
                        class="ml-auto h-30px w-72px"
                        label="查看详情"
                        onClick={() => (detailVisible.value = true)}
                      />
                    </div>

                    {projects.value.length ? (
                      <div class="mt-4px flex flex-col divide-y divide-white/6">
                        {projects.value.map((p, i) => (
                          <div key={p.id ?? p.pUid ?? i} class="flex items-center py-14px">
                            <div class="w-44px shrink-0 text-14px text-white/45">{String(i + 1).padStart(2, '0')}</div>

                            <div class="flex shrink-0 items-center gap-6px w-120px">
                              <div
                                class="size-8px rd-full shrink-0"
                                style={{ backgroundColor: categoryColorOf(p.category) }}
                              />
                              <div class="truncate text-14px text-white/75" title={p.category ?? ''}>
                                {p.category || '—'}
                              </div>
                            </div>

                            <div
                              class="min-w-0 flex-1 truncate text-left text-14px text-white ml-16px"
                              title={p.name ?? ''}
                            >
                              {p.name || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div class="py-24px text-center text-14px text-white/40">暂无数据</div>
                    )}
                  </div>

                  {/* 资金统计图卡片：左环形图（中心 = 总投资估算）+ 右资金来源图例列表 */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="flex h-24px items-center">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>

                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区资金情况</div>
                    </div>

                    <div class="mt-8px flex items-center">
                      {/* 环形图 + 中心大数字（DOM 覆盖层，不参与事件） */}
                      <div class="relative shrink-0">
                        <div ref={chartRef} class="size-140px"></div>

                        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <div class="text-12px text-white/55">总投资估算</div>

                          <div class="mt-2px flex items-baseline">
                            <div
                              class="text-19px font-700 font-youshe leading-none tracking-tight"
                              style={{
                                background: 'linear-gradient(180deg, #4FD8FF 0%, #2A9BE8 100%)',
                                backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}
                            >
                              {investText.value}
                            </div>
                            <div class="ml-2px text-12px text-white/70">亿</div>
                          </div>
                        </div>
                      </div>

                      {/* 图例列表：勾选多少显示多少（金额未填显示 0.00 亿；超长滚动） */}
                      <div class="min-w-0 flex-1 ml-12px max-h-160px space-y-10px overflow-y-auto scrollbar-none pr-4px">
                        {fundItems.value.length ? (
                          fundItems.value.map((it, i) => (
                            <div key={it.name} class="flex items-center gap-8px">
                              <div
                                class="h-10px w-14px rd-2px shrink-0"
                                style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                              />

                              <div class="min-w-0 flex-1 truncate text-13px text-white/75" title={it.name}>
                                {it.name}
                              </div>

                              <div class="shrink-0 text-14px text-white font-600 tabular-nums">
                                {it.amount.toFixed(2)}
                                <span class="ml-2px text-12px text-white/50">亿</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div class="py-16px text-center text-13px text-white/40">暂无数据</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 资金来源概况：填报文本 */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="flex h-24px items-center">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>

                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">资金来源概况</div>
                    </div>

                    <div class="text-white text-14px font-400 lh-24px mt-8px">{fundOverview.value || '暂无数据'}</div>
                  </div>
                </div>
              ),
            }}
          />
        </div>

        {/* 项目详情弹窗：全字段表格（填报 projects） */}
        <ProjectDetailModal
          visible={detailVisible.value}
          projects={projects.value}
          onUpdate:visible={(v) => (detailVisible.value = v)}
        />
      </>
    );
  },
});
