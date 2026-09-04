import defaultArrowImg from '@jeesite/assets/images/display/plan/arrow.png';
import defaultTitleImg from '@jeesite/assets/images/expropriation-management/汇总标题.webp';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, type PropType } from 'vue';

/**
 * GlowTitle3 —— 征收/汇总 标题栏
 *
 * 结构：背景图（cover）+ 左箭头 + 标题文字（白→浅蓝渐变，font-youshe）+ 右侧按钮。
 * 命名延续 glow-title 系列（title1/title2 为纯背景图+插槽），本组件多了渐变标题与右侧按钮。
 *
 * props：
 * - title：标题文字（必填）
 * - titleImg：背景图 url（默认征收汇总标题背景）
 * - arrowImg：左箭头图 url（默认箭头）
 * - buttonText：右侧按钮文字（默认「片区列表」，传空字符串隐藏按钮）
 * - onButtonClick：按钮点击回调
 * - class：透传容器类
 */
export const GlowTitle3 = defineComponent({
  name: 'GlowTitle3',
  props: {
    title: { type: String, required: true },
    titleImg: { type: String, default: defaultTitleImg },
    arrowImg: { type: String, default: defaultArrowImg },
    buttonText: { type: String, default: '片区列表' },
    onButtonClick: { type: Function as PropType<() => void>, default: null },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    return () => (
      <div
        class={cn('w-full h-56px flex items-center py-4px', props.class)}
        style={{
          backgroundImage: `url(${props.titleImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <img class="w-14px h-16px ml-70px" src={props.arrowImg} alt="" />

        {/* 标题文字：白→浅蓝水平渐变填充（取色自设计稿）+ 同色光晕，bg-clip:text 手法同 ArtFont 组件 */}
        <div
          class="ml-16px text-24px font-400 font-youshe tracking-wide"
          style={{
            color: 'transparent',
            background: 'linear-gradient(to right, #83E2FF 0%, #E0F8FF 45%, #C9F2FF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 12px rgba(131, 226, 255, 0.45)',
          }}
        >
          {props.title}
        </div>

        {/* 右侧按钮：深蓝渐变底 + 青蓝描边 + 左上角高光切角（buttonText 为空则隐藏） */}
        {props.buttonText && (
          <div
            class="ml-auto h-32px w-76px rd-6px text-14px font-400 text-white cursor-pointer transition-opacity hover:opacity-85 flex items-center justify-center mr-8px"
            style={{
              background: 'linear-gradient(to bottom, #2A5578 0%, #193552 60%, #21486C 100%)',
              border: '1px solid #4E86AE',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)',
            }}
            onClick={() => props.onButtonClick?.()}
          >
            {props.buttonText}
          </div>
        )}
      </div>
    );
  },
});
