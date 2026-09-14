import {
  Transition,
  computed,
  defineComponent,
  onBeforeUnmount,
  ref,
  toRef,
  watch,
  type PropType,
  type Ref,
} from 'vue';
import { Tooltip } from 'antdv-next';
import { Locate, Loader2, Maximize, Minus, Plus } from 'lucide-vue-next';
import type { Map as MapLibreMap } from 'maplibre-gl';
import sgjElectricImg from '@jeesite/assets/images/vmap/数公基电子地图.webp';
import sgjRemoteImg from '@jeesite/assets/images/vmap/数公基遥感影像.webp';
import yztElectricImg from '@jeesite/assets/images/vmap/一张图电子地图.webp';
import yztRemoteImg from '@jeesite/assets/images/vmap/一张图遥感影像.webp';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { useMap } from './composables/use-map';

type Orientation = 'vertical' | 'horizontal';

/** 底图切换面板的可选项（name 为图片文件名去扩展名，同时作为 basemap 事件的 payload） */
const BASEMAP_OPTIONS = [
  { name: '数公基电子地图', image: sgjElectricImg },
  { name: '数公基遥感影像', image: sgjRemoteImg },
  { name: '一张图电子地图', image: yztElectricImg },
  { name: '一张图遥感影像', image: yztRemoteImg },
] as const;

/**
 * 地图控制条（VMapControls）
 *
 * 供 <VMap> 悬浮使用的操作控件集合，渲染顺序：底图 → 罗盘 → 3D → 定位 → 全屏 → 缩放。
 * 统一深色胶囊风格（bg-[#3a4a5e] + hover 提亮 + 圆角容器 overflow-hidden）。
 *
 * 地图实例来源（两种模式）：
 * - 显式传入 `map` prop（含 `null`）→ 跳过 useMap 上下文注入，可脱离 <VMap> 单独渲染，
 *   此时为纯 UI 模式：所有地图操作经 `map.value?.` 可选链静默失效，点击仅切换本地状态（如 3D 高亮）。
 * - 未传 `map` prop → 通过 useMap() 从 <Map> 上下文注入；若既未传 prop 又不在 <VMap> 内，
 *   useMap() 会抛错（严格契约，提示用法错误）。
 *
 * 事件：
 * - `locate`：定位成功后触发，payload 为 `{ longitude, latitude }`。
 * - `basemap`：底图面板中选中某项后触发，payload 为底图名（图片文件名去扩展名，如「一张图遥感影像」）；
 *   仅通知选中项，实际切换底图样式由外部监听方实现。
 */
export const VMapControls = defineComponent({
  name: 'VMapControls',
  props: {
    /** 控件排列方向：'horizontal'（横排，默认）| 'vertical'（竖排堆叠） */
    orientation: {
      type: String as PropType<Orientation>,
      default: 'horizontal',
    },
    /** 是否显示底图切换按钮（点击向上弹出四个底图缩略图竖排面板），默认 true */
    showBasemap: { type: Boolean, default: true },
    /** 是否显示缩放（+ / -）按钮组，默认 true */
    showZoom: { type: Boolean, default: true },
    /** 是否显示 3D 切换按钮，默认 true */
    show3D: { type: Boolean, default: true },
    /**
     * 显式传入的地图实例。
     * - 传了（含显式传 null）→ 完全跳过 useMap 的上下文检查，可脱离 <VMap> 单独渲染（纯 UI 模式）；
     * - 未传 → 走 <Map> 上下文注入（不在 <VMap> 内且未传时 useMap 会抛错，属预期）。
     */
    map: { type: Object as PropType<MapLibreMap | null> },
    /** 是否显示罗盘按钮（点击复位北向，SVG 随 rotate/pitch 实时旋转），默认 true */
    showCompass: { type: Boolean, default: true },
    /** 是否显示定位按钮（浏览器 Geolocation 定位并飞入，成功后 emit('locate')），默认 false */
    showLocate: { type: Boolean, default: false },
    /** 是否显示全屏按钮（切换地图容器全屏），默认 false */
    showFullscreen: { type: Boolean, default: false },
    /** 追加到控件容器的 CSS 类（字符串 / 对象 / 数组） */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  emits: ['locate', 'basemap'],
  setup(props, { emit }) {
    // ── 地图实例来源 ──────────────────────────────────────────────
    // 优先使用显式传入的 map prop（含 null，此时为纯 UI 模式）；
    // 未传时才从 <Map> 上下文注入（不在 <VMap> 内会抛错，属预期严格契约）。
    const map: Ref<MapLibreMap | null> =
      props.map !== undefined ? (toRef(props, 'map') as Ref<MapLibreMap | null>) : useMap().map;

    // ── 本地状态 ─────────────────────────────────────────────────
    const waitingForLocation = ref(false); // 定位请求进行中（按钮转圈并禁用）
    const compassRef = ref<SVGSVGElement | null>(null); // 罗盘 SVG，随 bearing/pitch 旋转
    const is3D = ref(false); // 当前是否为 3D 俯视视角
    const basemapPanelVisible = ref(false); // 底图面板是否展开
    const activeBasemap = ref<string>(BASEMAP_OPTIONS[0].name); // 当前选中的底图名（默认第一项）

    const isHorizontal = computed(() => props.orientation === 'horizontal');

    const containerClass = computed(() =>
      cn(
        'flex gap-8px',
        isHorizontal.value ? 'flex-row' : 'flex-col',
        props.class, // 定位类由外部通过 class 传入
      ),
    );

    // ── 地图操作 handlers（全部走 map.value?. 可选链，纯 UI 模式静默失效）───
    // 底图选择：仅更新选中态并 emit('basemap', name)，面板保持展开（只有再次点击按钮才收起），
    // 实际换底图由外部监听方实现
    const handleSelectBasemap = (name: string) => {
      activeBasemap.value = name;
      emit('basemap', name);
    };

    const handleZoomIn = () => map.value?.zoomTo(map.value.getZoom() + 1, { duration: 300 });
    const handleZoomOut = () => map.value?.zoomTo(map.value.getZoom() - 1, { duration: 300 });
    const handleResetBearing = () => map.value?.resetNorthPitch({ duration: 300 });

    // 3D 切换：60° 俯视 ↔ 0° 顶视，附带 -20° 偏航增强立体感（与 display MapControls 行为一致）
    const handleToggle3D = () => {
      is3D.value = !is3D.value;
      map.value?.easeTo({
        pitch: is3D.value ? 60 : 0,
        bearing: is3D.value ? -20 : 0,
        duration: 800,
      });
    };

    // 定位：浏览器 Geolocation 获取当前位置 → 地图 flyTo 飞到该点（zoom 14）→ emit('locate', 坐标)
    const handleLocate = () => {
      waitingForLocation.value = true;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude,
            };
            map.value?.flyTo({
              center: [coords.longitude, coords.latitude],
              zoom: 14,
              duration: 1500,
            });
            emit('locate', coords);
            waitingForLocation.value = false;
          },
          (error) => {
            console.error('Error getting location:', error);
            waitingForLocation.value = false;
          },
        );
      }
    };

    // 全屏：与当前 fullscreenElement 互斥切换（进入 / 退出地图容器全屏）
    const handleFullscreen = () => {
      const container = map.value?.getContainer();
      if (!container) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    };

    // ── 罗盘旋转同步 ──────────────────────────────────────────────
    // 监听地图 rotate / pitch 事件，把 bearing / pitch 映射为 SVG 的 rotateZ / rotateX 变换；
    // 依赖（map / showCompass / compassRef）任一变化时重建监听，卸载时统一清理。
    let cleanupCompass: (() => void) | null = null;

    watch([map, () => props.showCompass, compassRef], ([m, showCompass, compass]) => {
      cleanupCompass?.();
      cleanupCompass = null;
      if (!m || !showCompass || !compass) return;

      const update = () => {
        const bearing = m.getBearing();
        const pitch = m.getPitch();
        compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
      };
      m.on('rotate', update);
      m.on('pitch', update);
      update();
      cleanupCompass = () => {
        m.off('rotate', update);
        m.off('pitch', update);
      };
    });

    onBeforeUnmount(() => {
      cleanupCompass?.();
    });

    // ── 样式 ─────────────────────────────────────────────────────
    // 深色胶囊风：buttonClass 为单个按钮样式，groupClass 为圆角包裹容器（overflow-hidden 裁圆角）
    const buttonClass = computed(() =>
      cn(
        'flex size-60px cursor-pointer items-center justify-center text-white transition-all bg-[#3a4a5e] hover:bg-[#4a5b71] b-0 tracking-wider',
      ),
    );

    const groupClass = computed(() =>
      cn('flex items-center overflow-hidden rounded-12px bg-[#3a4a5e]', isHorizontal.value ? 'flex-row' : 'flex-col'),
    );

    // ── 渲染：底图 → 罗盘 → 3D → 定位 → 全屏 → 缩放 ─────────────
    return () => (
      <div class={containerClass.value}>
        {/* 底图切换：点击按钮向上 fadeUp 弹出四个底图缩略图竖排面板，再次点击按钮向下淡出收起；
            展开期间按钮图标变蓝，选中项蓝框高亮且点击底图不收起面板（仅按钮可收起） */}
        {props.showBasemap && (
          <div class="relative flex items-center">
            <Tooltip title="切换底图" placement="left">
              <button
                type="button"
                class={cn(buttonClass.value, 'rounded-12px')}
                aria-label="切换底图"
                onClick={() => (basemapPanelVisible.value = !basemapPanelVisible.value)}
              >
                <div class={cn('size-24px i-ri-road-map-fill', { 'text-blue-500': basemapPanelVisible.value })} />
              </button>
            </Tooltip>

            <Transition
              enterActiveClass="animated animated-duration-300ms fade-in-up-sm"
              leaveActiveClass="animated animated-duration-300ms fade-out-down-sm"
            >
              {basemapPanelVisible.value && (
                <div class="absolute bottom-full left-0 mb-8px flex flex-col gap-8px rounded-12px bg-[#3a4a5e] p-8px">
                  {BASEMAP_OPTIONS.map((option) => (
                    <div
                      key={option.name}
                      class={cn(
                        'relative w-140px h-80px cursor-pointer overflow-hidden rounded-8px b-2px b-solid transition-all hover:bg-[#4a5b71]',
                        activeBasemap.value === option.name ? 'b-blue-500' : 'b-transparent',
                      )}
                      onClick={() => handleSelectBasemap(option.name)}
                    >
                      <img src={option.image} alt={option.name} class="size-full object-cover" />
                      <div
                        class={cn(
                          'absolute bottom-0 w-full z-50 py-3px text-center text-14px text-white text-center',
                          activeBasemap.value === option.name ? 'bg-blue-500/70' : 'bg-black/70',
                        )}
                      >
                        {option.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Transition>
          </div>
        )}

        {/* 罗盘：点击复位北向，SVG 随视角实时旋转 */}
        {props.showCompass && (
          <div class={groupClass.value}>
            <Tooltip title="一键回北" placement="top">
              <button type="button" class={buttonClass.value} aria-label="一键回北" onClick={handleResetBearing}>
                <svg
                  ref={compassRef}
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    transformOrigin: 'center',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {/* 北指针（蓝色尖三角） */}
                  <polygon points="12,3 16,12 12,10 8,12" fill="#5fbfff" />
                  {/* 南指针（白色半透明三角） */}
                  <polygon points="12,21 16,12 12,14 8,12" fill="rgba(255,255,255,0.7)" />
                </svg>
              </button>
            </Tooltip>
          </div>
        )}

        {/* 3D：60° 俯视 ↔ 0° 顶视，激活态文字高亮 */}
        {props.show3D && (
          <div class={groupClass.value}>
            <Tooltip title={is3D.value ? '切换到 2D' : '切换到 3D'} placement="top">
              <button
                type="button"
                class={buttonClass.value}
                aria-label={is3D.value ? '切换到 2D' : '切换到 3D'}
                onClick={handleToggle3D}
              >
                <span class="text-20px font-500 tracking-wider">3D</span>
              </button>
            </Tooltip>
          </div>
        )}

        {/* 定位：Geolocation 定位并飞入，等待时转圈禁用 */}
        {props.showLocate && (
          <div class={groupClass.value}>
            <Tooltip title="定位" placement="top">
              <button
                type="button"
                class={buttonClass.value}
                aria-label="Find my location"
                disabled={waitingForLocation.value}
                onClick={handleLocate}
              >
                {waitingForLocation.value ? <Loader2 class="size-24px animate-spin" /> : <Locate class="size-24px" />}
              </button>
            </Tooltip>
          </div>
        )}

        {/* 全屏：切换地图容器全屏 */}
        {props.showFullscreen && (
          <div class={groupClass.value}>
            <Tooltip title="全屏" placement="top">
              <button type="button" class={buttonClass.value} aria-label="Toggle fullscreen" onClick={handleFullscreen}>
                <Maximize class="size-24px" />
              </button>
            </Tooltip>
          </div>
        )}

        {/* 缩放：+ / - 按钮组，中间分隔线方向随布局切换 */}
        {props.showZoom && (
          <div class={groupClass.value}>
            <Tooltip title="放大" placement="top">
              <button type="button" class={buttonClass.value} aria-label="Zoom in" onClick={handleZoomIn}>
                <Plus class="size-24px" />
              </button>
            </Tooltip>

            <div
              class={cn('bg-white/10', {
                'w-px h-1/2': isHorizontal,
                'w-1/2 h-px': !isHorizontal,
              })}
            />

            <Tooltip title="缩小" placement="top">
              <button type="button" class={buttonClass.value} aria-label="Zoom out" onClick={handleZoomOut}>
                <Minus class="size-24px" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    );
  },
});
