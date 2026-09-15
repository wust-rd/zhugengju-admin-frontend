import { defineComponent, ref, watch, type CSSProperties, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';
import pictureBoxImg from '@jeesite/assets/images/display/plan/picture-box-plus.webp';

/** 磨砂卡片外壳：与标题栏下载/关闭按钮同类（0.5px 细边框 + white/6 磨砂底 + 右下柔和阴影） */
const FROST_SHELL: CSSProperties = {
  border: '0.5px solid #57859E30',
  background: 'var(--alpha---ui-bg-6, rgba(255, 255, 255, 0.06))',
  boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
};

/**
 * 实施后评估弹窗：与图册弹窗结构/内容一模一样，独立文件（不复用，方便自行修改）
 *
 * 用法（TSX）：
 * <PostEvaluationModal
 *   visible={previewVisible.value}
 *   images={ALBUM_PLACEHOLDERS}
 *   initialIndex={previewIndex.value}
 *   onUpdate:visible={(v) => (previewVisible.value = v)}
 * />
 */
export const PostEvaluationModal = defineComponent({
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

    // 底部缩略图滚动容器
    const stripRef = ref<HTMLElement | null>(null);

    /** 左右翻页：按单张图片宽度平滑滚动 */
    const scrollStrip = (dir: number) => {
      stripRef.value?.scrollBy({ left: dir * 144, behavior: 'smooth' });
    };

    /** 上/下一张（循环切换，配合翻页箭头） */
    const stepImage = (dir: number) => {
      const len = props.images.length;
      if (len === 0) return;
      activeIndex.value = (activeIndex.value + dir + len) % len;
    };

    /** 下载当前大图 */
    const handleDownload = () => {
      const len = props.images.length;
      const img = props.images[Math.min(activeIndex.value, Math.max(len - 1, 0))];
      if (!img) return;
      const a = document.createElement('a');
      a.href = img;
      a.download = `图册-${activeIndex.value + 1}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    return () => {
      if (!props.visible) return null;

      const images = props.images;
      const current = images[Math.min(activeIndex.value, Math.max(images.length - 1, 0))];

      return (
        <div class="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
          {/* 遮罩：点击关闭 */}
          <div class="absolute inset-0 bg-black/10 backdrop-blur-sm" />

          {/* 弹窗主体：相框背景 + 内容层 */}
          <div class="relative z-10 w-884px pb-36px" onClick={(e) => e.stopPropagation()}>
            {/* 相框背景 */}
            <img src={frameImg} alt="" class="pointer-events-none absolute inset-0 size-full object-fill" />

            {/* 内容层（盖在相框之上） */}
            <div class="relative z-10 size-full">
              {/* 标题 */}
              <div class="flex h-68px items-center px-32px pt-24px pb-12px">
                <div
                  class="text-20px font-700 text-white"
                  style={{
                    background: 'linear-gradient(180deg, #FFF 20.83%, #8AC9FF 83.33%)',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  实施后评估
                </div>

                {/* 下载按钮 */}
                <div
                  class="ml-auto flex size-32px cursor-pointer items-center justify-center rd-8px transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={handleDownload}
                >
                  <div class="i-ri:download-line size-18px bg-linear-to-b from-[#40DFFF] to-[#FFFFFF]"></div>
                </div>

                {/* 关闭按钮 */}
                <div
                  class="ml-12px flex size-32px cursor-pointer items-center justify-center rd-8px transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={close}
                >
                  <div class="i-ri-close-line size-18px bg-linear-to-b from-[#40DFFF] to-[#FFFFFF]"></div>
                </div>
              </div>

              <div class="h-1px w-full bg-white/6" />

              {/* 相框：图片垫底，相框覆盖层叠在图片上面 */}
              <div class="relative mx-auto mt-24px h-420px w-812px overflow-hidden">
                {/* 当前大图（红色区域） */}
                <div
                  class="absolute inset-10px rd-20px bg-center"
                  style={{
                    backgroundImage: `url(${current})`,
                  }}
                ></div>

                {/* 相框覆盖层 */}
                <img src={pictureBoxImg} alt="" class="pointer-events-none absolute inset-0 object-fill" />
              </div>

              {/* 图片信息卡片 */}
              <div
                class="relative mt-16px h-154px w-812px overflow-hidden rounded-4px border border-[#7FD8F0]/45 mx-auto p-12px"
                style={{
                  boxShadow: 'inset 0 -6px 20px 8px #38DEFF20'
                }}
              >
                {/* 标题行 */}
                <div class="flex h-30px items-center">
                  <div class="size-8px ml-4px bg-[#4FB8E8]" />
                  <div class="text-20px font-500 text-[#E4FBFF] ml-12px">老街区变身"新地标"，"好房子"融入武汉市更新片</div>
                </div>

                {/* 内容行：正文 + 右侧图标占位 */}
                <div class="flex items-center gap-24px p-12px text-14px text-white lh-20px b-1px b-solid b-white/6 mt-12px bg-#0F172A15 rd-4px">
                    实现原住民原地回迁居住提质，全面升级市政、消防与便民配套；完整保留汉口里分街巷肌理，活化历史建筑传承老城文脉；配套特色商业街区互补江汉路商圈，拓展公共休闲空间，打造居住、文旅、商业融合发展模式，成为中心城区城市更新示范样板。
  
                </div>
              </div>

              {/* 底部横向缩略图选择（轮播） */}
              <div class="mt-24px flex h-72px items-center justify-between px-60px">
                {/* 左翻按钮（与关闭按钮同类外壳） */}
                <div
                  class="flex size-32px shrink-0 cursor-pointer items-center justify-center rd-full transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={() => {
                    stepImage(-1);
                    scrollStrip(-1);
                  }}
                >
                  <div class="i-ri-arrow-left-double-line size-18px bg-white"></div>
                </div>

                {/* 图片条：横向滚动 */}
                <div ref={stripRef} class="scrollbar-none flex max-w-full gap-8px overflow-x-auto">
                  {images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`图册 ${i + 1}`}
                      class={cn(
                        'h-72px w-72px shrink-0 cursor-pointer rd-10px object-cover transition-all duration-150',
                        i === activeIndex.value
                          ? 'border-2 border-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                          : 'border-b-1 border-white/20 opacity-80 hover:opacity-100',
                      )}
                      onClick={() => (activeIndex.value = i)}
                    />
                  ))}
                </div>

                {/* 右翻按钮（与关闭按钮同类外壳） */}
                <div
                  class="flex size-32px shrink-0 cursor-pointer items-center justify-center rd-full transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={() => {
                    stepImage(1);
                    scrollStrip(1);
                  }}
                >
                  <div class="i-ri-arrow-right-double-line size-18px bg-white"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
  },
});
