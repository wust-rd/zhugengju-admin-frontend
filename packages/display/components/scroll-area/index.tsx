import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * ScrollArea 滚动区域（仿 shadcn-vue ScrollArea 外观）
 *
 * 设计：
 *  - 隐藏原生滚动条，右侧自绘细圆角滚动条（thumb 高度按内容比例、随滚动位移）；
 *  - 悬停或滚动时显示，停止交互 1s 后渐隐（类似 Radix ScrollArea 行为）；
 *  - 内容加载/尺寸变化（ResizeObserver + load 捕获监听）自动重算 thumb；
 *  - 滚动条 absolute 定位不随内容滚动，内容不足一屏时 thumb 自动隐藏。
 */
export const ScrollArea = defineComponent({
  name: 'DisplayScrollArea',
  props: {
    /** 根容器（即滚动视口）额外样式类，控制高度/宽度，如 flex-1、max-h-[calc(100vh_-_246px)] */
    className: { type: String, default: '' },
    /** 滚动条宽度（px） */
    barWidth: { type: Number, default: 10 },
  },
  setup(props, { slots }) {
    const viewportRef = ref<HTMLDivElement | null>(null);
    const thumbRef = ref<HTMLDivElement | null>(null);
    const visible = ref(false);

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    /** 根据滚动位置/内容比例更新 thumb 高度与位移（thumb 高度 = 可视比例，位移 = scrollTop * 比例） */
    const updateThumb = () => {
      const viewport = viewportRef.value;
      const thumb = thumbRef.value;
      if (!viewport || !thumb) return;
      const { clientHeight, scrollHeight, scrollTop } = viewport;
      const ratio = clientHeight / scrollHeight;
      if (ratio >= 1) {
        thumb.style.display = 'none';
        return;
      }
      thumb.style.display = '';
      thumb.style.height = `${Math.max(clientHeight * ratio, 20)}px`;
      thumb.style.transform = `translateY(${scrollTop * ratio}px)`;
    };

    /** 显示滚动条并安排 1s 后渐隐 */
    const showTemporarily = () => {
      visible.value = true;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, 1000);
    };

    onMounted(() => {
      const viewport = viewportRef.value;
      if (!viewport) return;
      updateThumb();
      // 监听内容尺寸变化（图片加载、tab 切换等）重算 thumb
      resizeObserver = new ResizeObserver(() => updateThumb());
      resizeObserver.observe(viewport);
      const content = viewport.firstElementChild;
      if (content) resizeObserver.observe(content);
      // img load 事件不冒泡，用捕获阶段监听
      viewport.addEventListener('load', updateThumb, true);
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (hideTimer) clearTimeout(hideTimer);
      viewportRef.value?.removeEventListener('load', updateThumb, true);
    });

    return () => (
      <div
        ref={viewportRef}
        class={`relative size-full overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${props.className}`}
        onScroll={() => {
          updateThumb();
          showTemporarily();
        }}
        onMouseenter={() => (visible.value = true)}
        onMouseleave={() => {
          visible.value = false;
          if (hideTimer) clearTimeout(hideTimer);
        }}
      >
        {slots.default?.()}

        {/* 自绘滚动条：absolute 不随内容滚动 */}
        <div
          class={`pointer-events-none absolute top-0 right-0 bottom-0 z-10 transition-opacity duration-300 ${visible.value ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: `${props.barWidth}px` }}
          aria-hidden="true"
        >
          <div
            ref={thumbRef}
            class="absolute top-0 left-0 w-full rounded-full bg-white/30"
            style={{ minHeight: '20px' }}
          />
        </div>
      </div>
    );
  },
});
