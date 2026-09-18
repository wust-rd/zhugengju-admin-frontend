/**
 * FuncTagRow —— 更新片区行（本页 XodRow 替代版）：
 * 片区名称 + 功能定位胶囊组，胶囊背景色取统计图统一色板 FUNC_COLORS
 * （与功能定位柱状图、地图着色三处一致；XodRow 公共组件色板写死，故本页自行渲染）。
 * 保留 XodRow 的行协议属性（data-corner-row / data-corner-key + CornerPanel 选中态）。
 */
import { cn, type ClassValue } from '@jeesite/core/libs';
import { computed, defineComponent, inject, ref, type PropType } from 'vue';
import { CORNER_ACTIVE_KEY } from '@jeesite/display/components/corner-panel';
import type { XodItem } from '@jeesite/display/components/corner-panel/xod-row';
import { FUNC_COLORS, type FuncKey } from './func-type-chart';

/** 胶囊位与文字（顺序即渲染顺序，色取 FUNC_COLORS.color） */
const CAPSULES: { key: Exclude<FuncKey, 'other'>; text: string }[] = [
  { key: 'tod', text: 'TOD' },
  { key: 'eod', text: 'EOD' },
  { key: 'iod', text: 'IOD' },
  { key: 'sod', text: 'SOD' },
  { key: 'cod', text: 'COD' },
  { key: 'hod', text: 'HOD' },
];

export const FuncTagRow = defineComponent({
  name: 'EarlyStagePlanningFuncTagRow',

  props: {
    item: { type: Object as PropType<XodItem>, required: true },
    rowKey: { type: String, default: '' },
    /** 选中时的附加样式类，默认文字亮青色；传空字符串关闭行级选中样式 */
    activeClass: { type: String, default: '[&>span]:text-cyan-200' },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },

  emits: {
    /** 行点击（父级据此做地图聚焦等联动；由根元素原生 click 转发） */
    click: (e: MouseEvent) => e instanceof MouseEvent,
  },

  setup(props, { emit }) {
    // 读取父容器（CornerPanel）注入的选中行 key；不在 CornerPanel 内时回退为永不选中
    const activeKey = inject(CORNER_ACTIVE_KEY, ref(''));
    const isActive = computed(() => activeKey.value !== '' && activeKey.value === (props.rowKey || props.item.label));

    return () => (
      <div
        data-corner-row
        data-corner-key={props.rowKey || props.item.label}
        class={cn(
          'relative flex items-center gap-16px self-stretch py-10px px-12px cursor-pointer',
          isActive.value && props.activeClass,
          props.class,
        )}
        onClick={(e: MouseEvent) => emit('click', e)}
      >
        {/* 行首圆点：未选中白色，选中青色 */}
        <div
          class={cn(
            'relative z-10 shrink-0 rd-full size-12px flex items-center justify-center',
            isActive.value ? 'bg-cyan-700/40' : 'bg-white/10',
          )}
        >
          <div class={cn('rd-full size-4px', isActive.value ? 'bg-cyan-500' : 'bg-white')}></div>
        </div>

        {/* 片区名称 */}
        <span class="relative z-10 text-14px text-white shrink-0">{props.item.label}</span>

        {/* 命中胶囊组：背景色取统计图统一色板 FUNC_COLORS */}
        <div class="ml-auto flex items-center gap-6px flex-wrap">
          {CAPSULES.filter(({ key }) => props.item[key]).map(({ key, text }) => (
            <div
              key={key}
              class="font-chakra rd-4px w-32px h-16px flex items-center justify-center text-black text-14px font-500"
              style={{ background: FUNC_COLORS[key].color }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    );
  },
});
