import { defineComponent, ref, type PropType } from 'vue';

/**
 * 地图控件条：罗盘重置方位 / 2D-3D 切换 / 缩放
 *
 * 设计：
 *  - 三个按钮并排，深色胶囊风，参考 figma 控件条
 *  - 颜色：bg-slate-600 (#475569) + hover:bg-slate-500
 *  - 直接绑定 MapLibre 实例方法，调用方只需传入 map
 */
export const MapControls = defineComponent({
  props: {
    map: { type: Object as PropType<maplibregl.Map | null>, default: null },
  },
  setup(props) {
    const is3D = ref(false);

    // 罗盘：重置方位（指北 + 俯视）
    const handleResetBearing = () => {
      props.map?.easeTo({ bearing: 0, pitch: 0, duration: 600 });
    };

    // 3D 切换：60° 俯视 ↔ 0° 顶视
    const handleToggle3D = () => {
      is3D.value = !is3D.value;
      props.map?.easeTo({
        pitch: is3D.value ? 60 : 0,
        bearing: is3D.value ? -20 : 0,
        duration: 800,
      });
    };

    const handleZoomIn = () => {
      props.map?.zoomIn({ duration: 300 });
    };

    const handleZoomOut = () => {
      props.map?.zoomOut({ duration: 300 });
    };

    // 共用按钮基础样式
    const btnBase =
      'flex items-center justify-center text-white bg-[#3a4a5e] hover:bg-[#4a5b71] transition-colors duration-200 rounded-12px';

    return () => (
      <div class="flex items-center gap-2 select-none">
        {/* 罗盘：重置方位 */}
        <button
          type="button"
          class={`${btnBase} size-60px`}
          title="重置方位"
          aria-label="重置方位"
          onClick={handleResetBearing}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            {/* 北指针（蓝色尖三角） */}
            <polygon points="12,3 16,12 12,10 8,12" fill="#5fbfff" />
            {/* 南指针（白色半透明三角） */}
            <polygon points="12,21 16,12 12,14 8,12" fill="rgba(255,255,255,0.7)" />
          </svg>
        </button>

        {/* 2D / 3D 切换 */}
        <button
          type="button"
          class={`${btnBase} size-60px px-22px text-22px font-600 tracking-wider ${
            is3D.value ? 'text-[#5fbfff]' : 'text-white'
          }`}
          title={is3D.value ? '切换到 2D' : '切换到 3D'}
          aria-label={is3D.value ? '切换到 2D' : '切换到 3D'}
          onClick={handleToggle3D}
        >
          3D
        </button>

        {/* 缩放：+ / - */}
        <div class={`${btnBase} h-60px overflow-hidden`}>
          <button
            type="button"
            class="flex h-full w-60px cursor-pointer items-center justify-center border-none bg-transparent text-26px text-white font-300 hover:bg-[#4a5b71]"
            onClick={handleZoomIn}
            title="放大"
          >
            +
          </button>

          <button
            type="button"
            class="flex h-full w-60px cursor-pointer items-center justify-center border-none bg-transparent text-28px text-white font-300 hover:bg-[#4a5b71]"
            onClick={handleZoomOut}
            title="缩小"
          >
            −
          </button>
        </div>
      </div>
    );
  },
});
