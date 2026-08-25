import { cn, type ClassValue } from '@jeesite/core/libs';
import { CSSProperties, defineComponent, onMounted, onUnmounted, ref, type PropType, type SlotsType } from 'vue';

import MonitoringIcon from '@jeesite/assets/images/scheme/双层菱形.svg';
import TriangleIcon from '@jeesite/assets/images/scheme/三角形.svg';
import BottomLight from '@jeesite/assets/images/scheme/底部光晕.svg';

/**
 * Monitoring —— 监测面板（scheme 页右上角）
 *
 * 深蓝玻璃卡片：标题栏 + 内容区（默认插槽，当前留空由使用方填充）
 *
 * props：
 * - title：标题文字，默认「监测」
 * - class：透传类（定位/尺寸，如 absolute right-24px top-24px w-320px）
 *
 * 用法（TSX）：
 * <Monitoring class="absolute right-24px top-24px z-10 w-320px">
 *   {/* 填充内容 *\u002F}
 * </Monitoring>
 */
export const Monitoring = defineComponent({
  name: 'Monitoring',
  props: {
    /** 标题文字 */
    title: { type: String, default: '监测' },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  // 内容区通过默认插槽渲染
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    // 当前时间（MM-DD HH:mm），每秒刷新
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatTime = (d: Date) =>
      `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const timeText = ref(formatTime(new Date()));
    let timer: number | undefined;
    onMounted(() => {
      timer = window.setInterval(() => {
        timeText.value = formatTime(new Date());
      }, 1000);
    });
    onUnmounted(() => {
      window.clearInterval(timer);
    });

    const FROST_SHELL: CSSProperties = {
      border: '0.5px solid #57859E30',
      background: '#0F172A30',
      boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
    };
    
    
    return () => (
      <div
        class={cn('relative overflow-hidden rd-8px border border-cyan-800/60 backdrop-blur-4px px-16px pb-20px', props.class)}
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
          <div class="text-white text-18px font-500 mx-16px"> 项目实时监控</div>

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

        <div class="flex items-center mt-12px ">
          {/* 当前时间 */}
          <div class="flex w-176px h-34px items-center rounded-6px bg-white/5 px-16px py-8px shrink-0 rd-8px" style={FROST_SHELL}>
            <span class="text-12px text-white/45 font-400">当前时间</span>
            <span class="h-16px w-1px bg-white/20 mx-12px" />
            <span class="text-12px font-500 text-white/90">{timeText.value}</span>
          </div>

          {/* 更多 */}
          <div class="flex items-center justify-center text-12px font-400 h-30px w-74px rd-20px text-white/60 ml-auto" style={FROST_SHELL}>更多
            <div class="i-ri-arrow-right-line text-white/60 size-16px ml-4px"></div>
          </div>

          {/* 图册 */}
          <div class="mt-12px ">
            小雨说先不做，可能没有这个功能
          </div>
        </div>
      </div>
    );
  },
});
