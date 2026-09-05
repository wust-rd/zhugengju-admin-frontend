import { cn, type ClassValue } from '@jeesite/core/libs';
import { computed, defineComponent, inject, ref, type PropType } from 'vue';
import { CORNER_ACTIVE_KEY } from '@jeesite/display/components/corner-panel/row';

/** 片区标签类型（征收片区分类） */
export type DistrictTag = 'shiwu' | 'wuzhongxin' | 'wugai' | 'yuzheng' | 'zhili';

/** 各标签胶囊配色（背景色；文字深色） */
export const DISTRICT_TAG_COLOR: Record<DistrictTag, string> = {
  shiwu: '#2BD9A3', // 十五五（绿）
  wuzhongxin: '#E8E34A', // 五个中心（黄）
  wugai: '#35D0E8', // 五改四好（青）
  yuzheng: '#F2A54A', // 预征收（橙）
  zhili: '#C86BE8', // 治理重点（紫）
};

/** 标签类型 → 胶囊文字 */
const TAG_TEXT: { key: DistrictTag; text: string }[] = [
  { key: 'shiwu', text: '十五五' },
  { key: 'wuzhongxin', text: '五个中心' },
  { key: 'wugai', text: '五改四好' },
  { key: 'yuzheng', text: '预征收' },
  { key: 'zhili', text: '治理重点' },
];

/** 片区行数据：名称 + 命中的标签（任意组合） */
export interface DistrictRowItem {
  /** 片区名称（如 西马片） */
  label: string;
  shiwu?: boolean;
  wuzhongxin?: boolean;
  wugai?: boolean;
  yuzheng?: boolean;
  zhili?: boolean;
}

/**
 * DistrictRow —— 征收片区行：圆点 + 片区名称 + 右侧分类标签胶囊
 *
 * 视觉对齐 XodRow（圆点/布局/选中态协议一致），胶囊为「描边浅底」样式
 * （背景为标签色 14% 透明度 + 同色文字），与设计稿一致。
 * 自带 data-corner-row 协议属性，放入 CornerPanel 后点击触发行高亮动画。
 *
 * props：
 * - item: DistrictRowItem 数据
 * - rowKey: 可选，高亮切换动画 key；默认用 item.label
 * - class: 透传 UnoCSS 类
 */
export const DistrictRow = defineComponent({
  name: 'DistrictRow',
  props: {
    item: { type: Object as PropType<DistrictRowItem>, required: true },
    rowKey: { type: String, default: '' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    // 读取父容器（CornerPanel）注入的选中行 key；不在 CornerPanel 内时回退为永不选中
    const activeKey = inject(CORNER_ACTIVE_KEY, ref(''));
    const isActive = computed(() => activeKey.value !== '' && activeKey.value === (props.rowKey || props.item.label));

    return () => {
      const tags = TAG_TEXT.filter(({ key }) => props.item[key]);

      return (
        <div
          data-corner-row
          data-corner-key={props.rowKey || props.item.label}
          class={cn(
            'relative flex items-center gap-16px self-stretch py-10px px-12px cursor-pointer',
            isActive.value && '[&>span]:text-cyan-200',
            props.class,
          )}
        >
          {/* 行首圆点：未选中白色，选中青色（与 XodRow 同款） */}
          <div
            class={cn(
              'relative z-10 shrink-0 rd-full size-12px flex items-center justify-center',
              isActive.value ? 'bg-cyan-700/40' : 'bg-white/10',
            )}
          >
            <div class={cn('rd-full size-4px', isActive.value ? 'bg-cyan-500' : 'bg-white')} />
          </div>

          {/* 片区名称 */}
          <span class="relative z-10 text-14px text-white shrink-0">{props.item.label}</span>

          {/* 分类标签胶囊：描边浅底样式，颜色按标签类型 */}
          <div class="ml-auto flex items-center gap-6px flex-wrap">
            {tags.map(({ key, text }) => (
              <div
                key={key}
                class="rd-full px-10px h-20px flex items-center justify-center text-12px font-500"
                style={{
                  color: DISTRICT_TAG_COLOR[key],
                  background: `${DISTRICT_TAG_COLOR[key]}24`,
                  border: `1px solid ${DISTRICT_TAG_COLOR[key]}88`,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      );
    };
  },
});
