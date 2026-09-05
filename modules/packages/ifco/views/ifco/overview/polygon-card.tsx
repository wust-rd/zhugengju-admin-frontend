import { GlassRing } from '@jeesite/display/components/glass-ring';
import { cn } from '@jeesite/core/libs';
import { defineComponent, type PropType } from 'vue';
import type { PolygonPropsBase, SelectedPolygon } from './polygon-types';

/** 类别标签配色（与地图图层色系一致：项目地块紫、片区范围蓝） */
const KIND_META: Record<SelectedPolygon['kind'], { label: string; color: string }> = {
  project: { label: '项目地块', color: '#A855F7' },
  area: { label: '片区范围', color: '#38BDF8' },
};

/** 文本取值：null/空白返回 ''（空字段不展示） */
const s = (v: unknown): string => (v == null ? '' : String(v).trim());

/** 金额：数字或数字字符串统一格式化，非正数视为无值（单位已在标签中） */
const bil = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
};

/** 面积：数字格式化两位小数（单位已在标签中） */
const ha = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
};

/** 个数：数字字符串（如 '4.0'）取整展示 */
const cnt = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)} 个` : '';
};

/**
 * PolygonCard —— 面（项目地块 / 片区范围）详情卡片（投融建运大屏右侧）
 *
 * 点击地图面要素后从右侧滑入：标题 + 类别标签 → 属性网格（两列，空字段自动隐藏）→
 * 起止时间跨两列。polygon 为 null 时整体隐藏（透明 + 禁用鼠标穿透）。
 * 数据来自 project_merged_all / area_merged_all geojson 的原始属性字段。
 */
export const PolygonCard = defineComponent({
  name: 'IfcoPolygonCard',

  props: {
    polygon: { type: Object as PropType<SelectedPolygon | null>, default: null },
  },

  emits: {
    close: () => true,
  },

  setup(props, { emit }) {
    return () => {
      const polygon = props.polygon;
      /** 共有字段（行政区/批次/起止时间）走基类型兜底，类别字段按 kind 收窄后取 */
      const p: PolygonPropsBase = polygon?.props ?? {};
      const kind = polygon ? KIND_META[polygon.kind] : null;

      /** 属性网格项（空值字段跳过；行政区始终展示） */
      const metaItems: [string, string][] = polygon
        ? [
            ...(polygon.kind === 'project'
              ? ([
                  ['项目编号', s(polygon.props.PJ_ID)],
                  ['片区名称', s(polygon.props.AREA_NAME)],
                  ['项目名称', s(polygon.props.PJ_NAME)],
                  ['功能定位', s(polygon.props.FUNC_TYPE)],
                  ['投资估算（亿元）', bil(polygon.props.INV_BIL)],
                  ['2026年计划投资（亿元）', bil(polygon.props.INV_2026)],
                  ['2027年计划投资（亿元）', bil(polygon.props.INV_2027)],
                  ['图斑面积（公顷）', ha(polygon.props.AREA_HA)],
                  ['项目进展', s(polygon.props.PROG)],
                  ['实施主体', s(polygon.props.BODY)],
                  ['责任主体', s(polygon.props.RESP)],
                  ['资金来源', s(polygon.props.FUND_SRC)],
                ] as [string, string][])
              : ([
                  ['功能定位', s(polygon.props.FUNC_TYPE)],
                  ['项目数量', cnt(polygon.props.PROJECT_CNT)],
                  ['投资估算（亿元）', bil(polygon.props.INV_BIL)],
                  ['图斑面积（公顷）', ha(polygon.props.AREA_HA)],
                  ['责任主体', s(polygon.props.RESP_BODY)],
                  ['资金来源', s(polygon.props.FUND_SRC)],
                ] as [string, string][])),
            ['行政区', s(p.DIST) || '—'] as [string, string],
            ['批次', s(p.BATCH) || '—'] as [string, string],
          ].filter(([, v]) => v !== '')
        : [];

      /** 起止时间（任一存在才展示，跨两列） */
      const start = s(p.START_DATE);
      const end = s(p.END_DATE);
      const showRange = !!polygon && (start !== '' || end !== '');

      return (
        <div
          class={cn(
            'absolute right-24px top-24px z-50 w-420px max-h-[calc(100%-48px)] flex flex-col rd-12px overflow-hidden',
            'border border-cyan-900 bg-[#0f2b47]/95 shadow-2xl backdrop-blur',
            'transition-[transform,opacity] duration-200',
            polygon ? 'opacity-100' : 'pointer-events-none translate-x-16px opacity-0',
          )}
        >
          {polygon && kind && (
            <>
              {/* 头部：名称 + 类别标签 + 关闭按钮 */}
              <div class="flex items-start gap-8px bg-gradient-to-r from-[#123a5c] to-transparent px-20px pt-16px pb-12px">
                <div class="min-w-0 flex-1">
                  <div
                    class="truncate text-18px font-600 text-white"
                    title={
                      polygon.kind === 'project'
                        ? s(polygon.props.GIS_NAME) || s(polygon.props.PJ_NAME)
                        : s(polygon.props.AREA_NAME)
                    }
                  >
                    {polygon.kind === 'project'
                      ? s(polygon.props.GIS_NAME) || s(polygon.props.PJ_NAME) || '未命名项目'
                      : s(polygon.props.AREA_NAME) || '未命名片区'}
                  </div>
                  <div
                    class="mt-6px inline-flex items-center gap-6px rd-full border px-10px py-2px text-14px"
                    style={{ borderColor: `${kind.color}66`, color: kind.color, background: `${kind.color}14` }}
                  >
                    <div class="size-6px rd-full" style={{ background: kind.color }} />
                    {kind.label}
                  </div>
                </div>

                <GlassRing
                  class="h-28px w-28px flex shrink-0 cursor-pointer items-center justify-center"
                  onClick={() => emit('close')}
                >
                  <div class="i-ri-close-line size-16px text-white" />
                </GlassRing>
              </div>

              {/* 属性网格：字段较多，高度受限时纵向滚动 */}
              <div class="min-h-0 flex-1 overflow-y-auto">
                <div class="grid grid-cols-2 gap-x-16px gap-y-10px px-20px py-14px">
                  {metaItems.map(([label, value]) => (
                    <div key={label} class="min-w-0">
                      <div class="text-14px text-white/45">{label}</div>
                      <div class="mt-2px truncate text-13px text-white/90" title={value}>
                        {value}
                      </div>
                    </div>
                  ))}

                  {showRange && (
                    <div class="col-span-2 min-w-0">
                      <div class="text-14px text-white/45">起止时间</div>
                      <div class="mt-2px text-13px text-white/90">
                        {start || '—'} ~ {end || '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    };
  },
});
