import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, ref, type CSSProperties, type PropType } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import ltCornerSvg from '@jeesite/assets/svg/display/lt-corner.svg';
import rtCornerSvg from '@jeesite/assets/svg/display/rt-corner.svg';
import lbCornerSvg from '@jeesite/assets/svg/display/lb-corner.svg';
import rbCornerSvg from '@jeesite/assets/svg/display/rb-corner.svg';

/** 指标行：序号 + 指标名称 + 数值 + 评级 */
interface CornerItem {
  /** 序号（如 01、02） */
  seq: string;
  /** 指标名称 */
  label: string;
  /** 数值（如 77.8%、5个、7.03Km） */
  value: string;
  /** 评级（很好 / 较好 / 一般 / 较差） */
  rating: string;
}

// 默认指标数据（来自「指标评价结果」面板截图）
const DEFAULT_ITEMS: CornerItem[] = [
  { seq: '01', label: '公园绿化活动场地服务半径', value: '77.8%', rating: '很好' },
  { seq: '02', label: '城市绿地率', value: '28.58%', rating: '一般' },
  { seq: '03', label: '城市绿化覆盖率', value: '84.0%', rating: '较好' },
  { seq: '04', label: '10万人拥有综合公园数量', value: '5个', rating: '很好' },
  { seq: '05', label: '人均公园绿地面积', value: '0.16m²/人', rating: '较差' },
  { seq: '06', label: '公园综合吸引半径', value: '7.03Km', rating: '较好' },
  { seq: '07', label: '年度主要城市公园游客量', value: '3万人', rating: '一般' },
  { seq: '08', label: '公园内年举办活动数量', value: '25场', rating: '一般' },
];

/** 评级语义色（与「指标评价结果分布」色系一致） */
const RATING_COLOR: Record<string, string> = {
  很好: '#22D3EE',
  较好: '#4ADE80',
  一般: '#FBBF24',
  较差: '#F472B6',
};

// 左右荧光条（参考 Light 组件，颜色 #00EAFF）：多层 box-shadow 叠加泛光
const CYAN_BAR_SHADOW =
  '0 0 32px 0 rgba(0, 234, 255, 0.30), 0 0 24px 0 #00EAFF, 1px 0 12px 0 rgba(0, 234, 255, 0.30), 2px 0 8px 0 rgba(0, 234, 255, 0.60)';
const cyanBarStyle = (): CSSProperties => ({
  width: '2px',
  height: '20px',
  background: '#00EAFF',
  boxShadow: CYAN_BAR_SHADOW,
});

// line 形式：上下线生长时长（s），左右灯需等线完成后才开灯
const LINE_GROW_DURATION = 0.3;
// line 形式：左右灯开/关时长（s）
const LIGHT_FADE_DURATION = 0.2;

// line 形式动画 variants：
// 入场：背景 + 上下线同步生长（0.3s）→ 灯开灯（延迟 0.3s）
// 退场：灯先关灯（0.25s）→ 背景 + 上下线再离开（延迟 0.25s）
const lineBgVariants = {
  enter: { opacity: 1, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut', delay: LIGHT_FADE_DURATION } },
};
const lineVariants = {
  enter: { scaleX: 1, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut' } },
  exit: { scaleX: 0, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut', delay: LIGHT_FADE_DURATION } },
};
const lightVariants = {
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: LIGHT_FADE_DURATION, ease: 'easeOut', delay: LINE_GROW_DURATION },
  },
  exit: { opacity: 0, scale: 0.4, transition: { duration: LIGHT_FADE_DURATION, ease: 'easeOut' } },
};

export const CornerPanel = defineComponent({
  props: {
    /** 指标列表；不传则渲染默认「指标评价结果」数据 */
    items: { type: Array as PropType<CornerItem[]>, default: () => DEFAULT_ITEMS },
    /** 高亮形式：'slide' 整块滑块滑动（默认）；'line' 上下线生长 + 左右灯开合（motion-v） */
    highlight: { type: String as PropType<'slide' | 'line'> },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    // 当前选中序号：默认不选中任何项（点击后才出现高亮滑块）
    const activeSeq = ref<string>('');

    // 滑块位置：点击选中时滑动到目标行（初始在列表上方不可见）
    const slideTop = ref(-80);
    const slideHeight = ref(40);
    // 行 DOM 引用：点击时读取 offsetTop / offsetHeight 计算滑块落点
    const rowRefs = new Map<string, HTMLElement>();

    /** 点击行：滑块从当前位置滑到目标行，并选中该行 */
    const handleSelect = (item: CornerItem) => {
      const el = rowRefs.get(item.seq);
      if (el) {
        slideTop.value = el.offsetTop;
        slideHeight.value = el.offsetHeight;
      }
      activeSeq.value = item.seq;
    };

    return () => (
      <div class={cn('relative mt-8px w-full h-400px b b-cyan-900 rd-4px bg-[#162a43]', props.class)}>
        {/* 四角装饰：不拦截指针事件 */}
        <img src={ltCornerSvg} alt="" class="absolute -top-14px -left-14px size-36px z-50 pointer-events-none" />
        <img src={rtCornerSvg} alt="" class="absolute -top-14px -right-14px size-36px z-50 pointer-events-none" />
        <img src={lbCornerSvg} alt="" class="absolute -bottom-4px -left-10px w-80px h-4px z-50 pointer-events-none" />
        <img src={rbCornerSvg} alt="" class="absolute -bottom-2px -right-2px size-48px z-50 pointer-events-none" />

        {/* 指标列表：纵向排列，超出滚动；点击行时高亮滑块滑动到目标行 */}
        <div class="relative z-10 flex flex-col gap-8px h-full overflow-y-auto py-12px">
          {/* slide 形式：高亮滑块，渐变背景 + 上下渐变边框 + 左右荧光条，点击选中时滑动而来 */}
          {props.highlight === 'slide' && (
            <div
              class="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${slideTop.value}px`,
                height: `${slideHeight.value}px`,
                transition: 'top 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                background:
                  'linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10)) top/100% 1px no-repeat, linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10)) bottom/100% 1px no-repeat, linear-gradient(87deg, rgba(41,79,132,0.60) -3.66%, rgba(41,79,132,0.27) 47.74%, rgba(25,140,169,0.60) 103.8%)',
              }}
            >
              {/* 左右荧光条（#00EAFF） */}
              <div class="absolute left-0 top-1/2 -translate-y-1/2" style={cyanBarStyle()} />
              <div class="absolute right-0 top-1/2 -translate-y-1/2" style={cyanBarStyle()} />
            </div>
          )}

          {props.items.map((item) => {
            const active = item.seq === activeSeq.value;
            return (
              <div
                key={item.seq}
                ref={(el) => {
                  if (el) rowRefs.set(item.seq, el as HTMLElement);
                }}
                class="relative flex items-center gap-16px self-stretch py-10px px-16px cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                {/* line 形式：上边线从左往右生长、下边线从右往左生长，左右灯开灯/关灯（含离场动画） */}
                {props.highlight === 'line' && (
                  <AnimatePresence>
                    {/* 选中行渐变背景：与线同步淡入，退场时灯关完后淡出 */}
                    {active && (
                      <motion.div
                        key={`${item.seq}-bg`}
                        class="absolute inset-0 pointer-events-none"
                        variants={lineBgVariants}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        style={{
                          background:
                            'linear-gradient(87deg, rgba(41,79,132,0.60) -3.66%, rgba(41,79,132,0.27) 47.74%, rgba(25,140,169,0.60) 103.8%)',
                        }}
                      />
                    )}
                    {active && (
                      <motion.div
                        key={`${item.seq}-top`}
                        class="absolute top-0 left-0 right-0 h-1px"
                        variants={lineVariants}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        style={{
                          // 渐变线：中间实色、两端浅青渐隐（非纯色 border）
                          background:
                            'linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10))',
                          transformOrigin: 'left center',
                        }}
                      />
                    )}
                    {active && (
                      <motion.div
                        key={`${item.seq}-bottom`}
                        class="absolute bottom-0 left-0 right-0 h-1px"
                        variants={lineVariants}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        style={{
                          background:
                            'linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10))',
                          transformOrigin: 'right center',
                        }}
                      />
                    )}
                    {active && (
                      <motion.div
                        key={`${item.seq}-left`}
                        class="absolute left-0 top-1/2"
                        variants={lightVariants}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        style={{ ...cyanBarStyle(), marginTop: '-10px' }}
                      />
                    )}
                    {active && (
                      <motion.div
                        key={`${item.seq}-right`}
                        class="absolute right-0 top-1/2"
                        variants={lightVariants}
                        initial="exit"
                        animate="enter"
                        exit="exit"
                        style={{ ...cyanBarStyle(), marginTop: '-10px' }}
                      />
                    )}
                  </AnimatePresence>
                )}

                {/* 序号 */}
                <span class="relative z-10 text-14px text-cyan-300 font-500 shrink-0">{item.seq}</span>
                {/* 指标名称：弹性占位 */}
                <span class="relative z-10 text-14px text-white truncate flex-1">{item.label}</span>
                {/* 数值 */}
                <span class="relative z-10 text-14px text-white font-500 shrink-0">{item.value}</span>
                {/* 评级：语义色 */}
                <span
                  class="relative z-10 text-14px font-500 shrink-0"
                  style={{ color: RATING_COLOR[item.rating] ?? '#FFFFFF' }}
                >
                  {item.rating}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
});
