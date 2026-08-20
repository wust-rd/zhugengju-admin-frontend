import { defineComponent, ref, watch, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';

/**
 * 图册预览弹窗：屏幕中央展示大图，底部横向滑动选择图片
 *
 * 用法（TSX）：
 * <AlbumPreviewModal
 *   visible={previewVisible.value}
 *   images={ALBUM_PLACEHOLDERS}
 *   initialIndex={previewIndex.value}
 *   onUpdate:visible={(v) => (previewVisible.value = v)}
 * />
 */
export const AlbumPreviewModal = defineComponent({
  // 输入约束
  props: {
    /** 是否显示（配合 onUpdate:visible 关闭） */
    visible: { type: Boolean, default: false },
    /** 图册图片列表 */
    images: { type: Array as PropType<string[]>, default: () => [] },
    /** 打开时初始显示的图片下标（如点了第 3 张缩略图，就显示第 3 张） */
    initialIndex: { type: Number, default: 0 },
  },
  // 输出约束
  emits: {
    /** 请求关闭（点击遮罩 / 关闭按钮时触发） */
    'update:visible': (_: boolean) => true,
  },
  setup(props, { emit }) {
    // 当前大图下标（内部状态）
    const activeIndex = ref(props.initialIndex);

    // 每次打开时重置到 initialIndex
    watch(
      () => props.visible,
      (v) => {
        if (v) {
          activeIndex.value = Math.min(Math.max(props.initialIndex, 0), Math.max(props.images.length - 1, 0));
        }
      },
    );

    const close = () => emit('update:visible', false);

    return () => {
      if (!props.visible) return null;

      const images = props.images;
      const current = images[Math.min(activeIndex.value, Math.max(images.length - 1, 0))];

      return (
        <div class="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
          {/* 遮罩：点击关闭 */}
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* 弹窗主体：相框背景 + 内容层 */}
          <div class="relative z-10 mx-16px p-20px" onClick={(e) => e.stopPropagation()}>
            {/* 相框背景 */}
            <img src={frameImg} alt="" class="pointer-events-none absolute inset-0 size-full object-fill" />

            {/* 内容层（盖在相框之上） */}
            <div class="relative z-10 flex flex-col items-center gap-16px">

              <div class="text-24px font-bold text-white">片区策划图册</div>

              {/* 关闭按钮 */}
              <div
                class="absolute -right-10px -top-10px flex size-28px cursor-pointer items-center justify-center rd-full bg-[#183048] text-white/80 transition-colors hover:text-white"
                style={{ boxShadow: 'inset 0 0 6px rgba(125, 190, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.4)' }}
                onClick={close}
              >
                <div class="i-ri:close-line size-16px" />
              </div>

              {/* 大图 */}
              <div class="flex max-h-60vh max-w-full items-center justify-center">
                <img src={current} alt="图册预览" class="max-h-60vh max-w-full object-contain rd-8px" />
              </div>

              {/* 底部横向缩略图选择 */}
              <div class="scrollbar-none flex w-full max-w-full gap-8px overflow-x-auto">
                {images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`图册 ${i + 1}`}
                    class={cn(
                      'size-56px shrink-0 cursor-pointer object-cover rd-6px border b-1 transition-all duration-150',
                      i === activeIndex.value
                        ? 'border-[#4FD8FF] shadow-[0_0_8px_rgba(79,216,255,0.5)]'
                        : 'border-white/15 opacity-60 hover:opacity-100',
                    )}
                    onClick={() => (activeIndex.value = i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };
  },
});
