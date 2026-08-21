import { cn, type ClassValue } from '@jeesite/core/libs';
import { computed, defineComponent, inject, ref, type PropType } from 'vue';
import { CORNER_ACTIVE_KEY } from './row';

/** 更新类型布尔标识：任意一个为 true 就渲染对应胶囊 */
export type XodFlag = 'tod' | 'eod' | 'iod' | 'sod' | 'cod' | 'hod';

/** 更新片区行数据：片区名称 + 各更新类型是否命中（任意组合，均可选） */
export interface XodItem {
  /** 片区名称（如 西马片） */
  label: string;
  tod?: boolean;
  eod?: boolean;
  iod?: boolean;
  sod?: boolean;
  cod?: boolean;
  hod?: boolean;
}

/** 各更新类型胶囊的背景色（按字段名取色） */
export const XOD_COLOR: Record<string, string> = {
  tod: '#17ae3b',
  eod: '#22D3EE',
  iod: '#f2e233',
  sod: '#f2a54a',
  cod: '#a762d7',
  hod: '#F472B6',
};

/** 布尔字段 → 胶囊文字（字段缩写大写，如 cod → COD） */
const XOD_CAPSULES: { key: XodFlag; text: string }[] = [
  { key: 'tod', text: 'TOD' },
  { key: 'eod', text: 'EOD' },
  { key: 'iod', text: 'IOD' },
  { key: 'sod', text: 'SOD' },
  { key: 'cod', text: 'COD' },
  { key: 'hod', text: 'HOD' },
];

/**
 * XodRow —— 更新片区行：片区名称 + 命中类型胶囊
 *
 * 传入 XodItem（label + 6 个 boolean 的任意组合），任一 boolean 为 true
 * 就渲染一个对应胶囊（胶囊文字为字段缩写大写，背景色取 XOD_COLOR）。全为 false 时不渲染胶囊。
 *
 * 自带 `data-corner-row` 行协议属性：放入 CornerPanel 的默认插槽后，
 * 点击该行即可触发面板的高亮动画（slide 滑块 / line 荧光线），行文字同步变亮（选中态）。
 *
 * props：
 * - item: XodItem 数据
 * - rowKey: 可选，用作高亮切换动画 key；不传默认用 item.label
 * - activeClass: 选中时的附加样式类，默认文字亮青色；传空字符串关闭行级选中样式
 * - class: 透传 UnoCSS 类
 *
 * 用法（配合 CornerPanel）：
 * ```tsx
 * <CornerPanel isRound>
 *   {xodItems.map((item) => <XodRow key={item.label} item={item} />)}
 * </CornerPanel>
 * ```
 */
export const XodRow = defineComponent({
  name: 'XodRow',
  props: {
    item: { type: Object as PropType<XodItem>, required: true },
    rowKey: { type: String, default: '' },
    /** 选中时的附加样式类，默认文字亮青色；传空字符串关闭行级选中样式 */
    activeClass: { type: String, default: '[&>span]:text-cyan-200' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    // 读取父容器（CornerPanel）注入的选中行 key；不在 CornerPanel 内时回退为永不选中
    const activeKey = inject(CORNER_ACTIVE_KEY, ref(''));
    // 行是否被选中：与 data-corner-key 相同的 key 判定
    const isActive = computed(() => activeKey.value !== '' && activeKey.value === (props.rowKey || props.item.label));

    return () => (
      <div
        data-corner-row
        data-corner-key={props.rowKey || props.item.label}
        class={cn(
          'relative flex items-center gap-16px self-stretch py-10px px-12px cursor-pointer',
          // 选中态：行级视觉反馈（默认文字亮青色，可通过 activeClass 自定义或关闭）
          isActive.value && props.activeClass,
          props.class,
        )}
      >
        {/* 行首圆点：未选中白色（bg-white/10 + bg-white），选中时青色（bg-cyan-500/10 + bg-cyan-500） */}
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

        {/* 命中胶囊组：任一 boolean 为 true 即渲染对应胶囊，背景色取 XOD_COLOR，文字用 Chakra Petch 西文字体 */}
        <div class="ml-auto flex items-center gap-6px flex-wrap">
          {XOD_CAPSULES.filter(({ key }) => props.item[key]).map(({ key, text }) => (
            <div
              key={key}
              class="font-chakra rd-4px w-32px h-16px flex items-center justify-center text-black text-12px font-500"
              style={{ background: XOD_COLOR[key] }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    );
  },
});
