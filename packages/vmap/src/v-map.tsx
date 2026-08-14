import { cn } from '@jeesite/core/libs';
import MapLibreGL, { type MapOptions, type ProjectionSpecification, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibre-gl-empty.css';
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type PropType,
  type SlotsType,
} from 'vue';
import { MapContextKey } from './context';
import type { MapViewport } from './types';
import { getViewport } from './utils';

type MapStyleOption = string | StyleSpecification;

/**
 * ============================================================
 * Map.tsx —— Map.vue 的 TSX 等价实现（学习/对比用）
 * ============================================================
 *
 * 与 Map.vue 功能基本等价（仅写法不同），但有一个行为差异：
 *
 * ★ 本组件没有 theme 概念：不做系统/页面主题自动检测，也不区分明暗。
 *   Map.vue 用 useResolvedTheme 做三层自动解析（prop > <html class> > 系统），
 *   本组件只加载一个底图样式：
 *   - 用户传 <Map :style="myStyle"> → 加载用户自定义底图
 *   - 什么都不传                    → 加载默认 Carto Positron（亮）
 *
 * 转换对照表：
 *
 * | Map.vue (SFC)            | Map.tsx (TSX)                        |
 * |--------------------------|--------------------------------------|
 * | <script setup>           | setup() 函数                         |
 * | defineProps<Props>()     | props 运行时对象声明 + PropType      |
 * | defineEmits<{...}>()     | emits 对象声明                       |
 * | defineOptions({inheritAttrs:false}) | inheritAttrs: false 组件选项 |
 * | defineExpose({...})      | setup 参数中的 expose()              |
 * | useTemplateRef("x")      | 普通 ref + JSX ref={x}               |
 * | <slot />                 | slots.default?.()                    |
 * | v-if / v-for             | 三元 / && / .map()                   |
 *
 * ★ 注意：Nuxt 的 components 自动导入只配置了 extensions: ["vue"]，
 *   本文件不会被自动导入，必须手动 import 使用（且不要与 Map.vue 同时注册）。
 * ============================================================
 */

// 默认底图：Carto 免费 CDN 的亮色矢量风格
const defaultStyle: MapStyleOption = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const VMap = defineComponent({
  name: 'VMap',

  // 关闭 attrs 自动继承：所有 $attrs 由我们手动接管（转发给 MapLibre 构造器）
  inheritAttrs: false,

  // ---- 输入约束（运行时 props 声明）----
  // TSX 中不能用 defineProps 宏，改为对象声明 + PropType<T> 描述复杂类型。
  // 原生 MapLibre 选项（center/zoom/scrollZoom...）依然走 $attrs 透传（R11），
  // 不在此声明 —— 避免 Vue 把缺省的可选 boolean 强制补成 false。
  props: {
    /** 追加到容器上的 CSS 类 */
    class: { type: String },
    /** 自定义底图（MapLibre Style URL 或 StyleSpecification 对象）。传了则加载用户底图，否则用默认 Carto Positron */
    style: { type: [String, Object] as PropType<MapStyleOption> },
    /** 投影类型，传 { type: "globe" } 可切 3D 地球 */
    projection: { type: Object as PropType<ProjectionSpecification> },
    /** 原生 MapLibre 构造选项（crs/center/zoom/scrollZoom 等）。
     *  显式声明以获得 TSX 类型安全；$attrs 透传仅作补充，同名字段以此 prop 优先 */
    options: { type: Object as PropType<Partial<MapOptions>> },
    /** 受控视口（配合 update:viewport 实现 v-model:viewport） */
    viewport: { type: Object as PropType<Partial<MapViewport>> },
    /** 是否强制显示加载遮罩 */
    loading: { type: Boolean, default: false },
  },

  // ---- 输出约束：唯一事件 ----
  // 参数用 _ 前缀声明，避免"未使用参数"的 TS 提示（emits 校验函数需要参数签名）
  emits: {
    'update:viewport': (_viewport: MapViewport) => true,
  },

  // ---- 插槽类型声明（TSX 中手动声明以获得类型安全）----
  slots: {} as SlotsType<{
    default: () => unknown; // 默认插槽：地图子组件（Marker/Route/Arc...）
  }>,

  setup(props, { emit, expose, attrs, slots }) {
    // ==================== 响应式状态 ====================
    // 地图挂载的 DOM 容器。TSX 中无 useTemplateRef，用普通 ref，
    // 在 JSX 里以 ref={containerRef} 绑定，Vue 会自动把 DOM 节点写入 .value
    const containerRef = ref<HTMLDivElement | null>(null);
    // ★ 底层 MapLibre 实例。shallowRef（R2）：只追踪 .value 的整体替换，
    //   不深层代理地图对象，避免 Vue Proxy 干扰 MapLibre 内部 this 绑定
    const mapInstance = shallowRef<MapLibreGL.Map | null>(null);
    // 地图是否已触发 'load' 事件（资源加载完成）
    const isLoaded = ref(false);
    // 样式是否已加载完成（styledata 事件 + 100ms 防抖后置 true）
    // ★ 注意：换底图时会被主动置回 false，通知子组件"图层即将清空"
    const isStyleLoaded = ref(false);

    // 是否受控模式：只要用户传了 viewport prop，就进入受控
    const isControlled = computed(() => props.viewport !== undefined);

    // 最终使用的底图样式：用户自定义优先，否则回退 Carto 默认亮色
    const styleOption = computed<MapStyleOption>(() => props.style ?? defaultStyle);

    // 容器类名：基础占满父容器 + 用户追加的类
    const containerClass = computed(() => cn('relative h-full w-full', props.class));

    // ==================== 非响应式辅助状态 ====================
    // 当前生效的底图样式，用于判断切换时是否需要真的 setStyle
    let currentStyle: MapStyleOption | null = null;
    // styledata 防抖定时器句柄（100ms 内连发 styledata 只认最后一次）
    let styleTimeout: ReturnType<typeof setTimeout> | null = null;
    // ★ 受控 viewport 防重入标志（R13）：
    //   true  = 内部 jumpTo 触发的 move，不该 emit 回外部
    //   false = 用户拖拽产生的 move，应该 emit 同步外部
    let internalUpdate = false;

    // 清理防抖定时器（卸载、换样式前都要清）
    const clearStyleTimeout = () => {
      if (styleTimeout) {
        clearTimeout(styleTimeout);
        styleTimeout = null;
      }
    };

    // ★ 子组件真正能开始画图层的时机：load && styledata
    const isLoadedAndStyleLoaded = computed(() => isLoaded.value && isStyleLoaded.value);

    // ==================== 上下文注入 ====================
    // 把「地图实例 + 加载状态」注入组件树，
    // 所有子组件通过 useMap() inject 后 watch isLoaded 决定建图时机
    provide(MapContextKey, {
      map: mapInstance,
      isLoaded: isLoadedAndStyleLoaded,
    });

    // 暴露底层实例：<Map ref="mapRef" /> → mapRef.map 直接拿 MapLibre 实例
    // （TSX 中 defineExpose 宏不可用，改用 setup 的 expose() 函数）
    expose({ map: mapInstance });

    // ==================== attrs 收集 ====================
    // 这些 attrs 不应该转发给 MapLibre 构造器
    const RESERVED_ATTR_KEYS = new Set(['class', 'style', 'container']);

    /**
     * 收集 MapLibre 构造选项：
     *   $attrs（用户透传的原生选项）→ 过滤 → 合并 options prop → 与受控 viewport 合并
     * 过滤规则：undefined 跳过 / Vue 事件监听器跳过 / 保留键跳过
     * 优先级：attrs < options（显式 prop）< viewport（受控值最高）
     */
    const collectMapOptions = (): Partial<MapOptions> => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined) continue;
        // 跳过 Vue 事件监听器（onClick 等），它们不是地图选项
        if (/^on[A-Z]/.test(key)) continue;
        if (RESERVED_ATTR_KEYS.has(key)) continue;
        out[key] = value;
      }
      // 显式 options prop 覆盖 attrs 同名字段
      for (const [key, value] of Object.entries(props.options ?? {})) {
        if (value !== undefined) out[key] = value;
      }
      // 受控 viewport 最后合并，覆盖上面的字段
      for (const [key, value] of Object.entries(props.viewport ?? {})) {
        if (value !== undefined) out[key] = value;
      }
      return out as Partial<MapOptions>;
    };

    // ==================== 生命周期：挂载 ====================
    onMounted(() => {
      if (!containerRef.value) return;

      // 初始底图：用户自定义优先，否则默认 Carto 亮色
      currentStyle = styleOption.value;

      // ★ 创建 MapLibre 底层实例
      const map = new MapLibreGL.Map({
        container: containerRef.value,
        style: styleOption.value,
        renderWorldCopies: false,
        attributionControl: { compact: true },
        ...collectMapOptions(),
      });

      // 事件处理器 1：styledata —— 样式数据到达（加载/换底图时触发）
      // 100ms 防抖：一次样式加载可能连续触发多次，只认最后一次
      const styleDataHandler = () => {
        clearStyleTimeout();
        styleTimeout = setTimeout(() => {
          isStyleLoaded.value = true;
          if (props.projection) {
            map.setProjection(props.projection);
          }
        }, 100);
      };
      // 事件处理器 2：load —— 地图资源加载完成
      const loadHandler = () => {
        isLoaded.value = true;
      };
      // 事件处理器 3：move —— 相机位置/角度变化
      // ★ 防重入：内部 jumpTo 触发的 move（internalUpdate=true）直接 return
      const handleMove = () => {
        if (internalUpdate) return;
        emit('update:viewport', getViewport(map));
      };

      map.on('load', loadHandler);
      map.on('styledata', styleDataHandler);
      map.on('move', handleMove);
      // ★ 最后才赋值：provide 出去的 map 变为可用，
      //   render 里 <slots.default> 也因 mapInstance 非空而开始渲染子组件
      mapInstance.value = map;
    });

    // ==================== 生命周期：卸载 ====================
    onBeforeUnmount(() => {
      clearStyleTimeout();
      const map = mapInstance.value;
      if (map) {
        map.remove(); // 销毁 MapLibre 实例
      }
      mapInstance.value = null;
      isLoaded.value = false;
      isStyleLoaded.value = false;
    });

    // ==================== 受控 viewport：外 → 内 ====================
    watch(
      () => props.viewport,
      (next) => {
        const map = mapInstance.value;
        if (!map || !isControlled.value || !next) return;
        // 地图动画中（flyTo/easeTo）跳过，避免打断动画
        if (map.isMoving()) return;

        const current = getViewport(map);
        // 目标状态：viewport 是 Partial，缺的字段用当前值补全
        const target = {
          center: next.center ?? current.center,
          zoom: next.zoom ?? current.zoom,
          bearing: next.bearing ?? current.bearing,
          pitch: next.pitch ?? current.pitch,
        };

        // 全字段相等 → 值没变，跳过（防死循环第二道闸）
        if (
          target.center[0] === current.center[0] &&
          target.center[1] === current.center[1] &&
          target.zoom === current.zoom &&
          target.bearing === current.bearing &&
          target.pitch === current.pitch
        ) {
          return;
        }

        // 置防重入标志 → jumpTo 瞬时跳转 → 清标志
        internalUpdate = true;
        map.jumpTo(target);
        internalUpdate = false;
      },
      { deep: true },
    );

    // ==================== 底图切换 ====================
    // 只监听 style prop（用户显式修改底图）。没有 theme/自动检测概念。
    watch(styleOption, (newStyle) => {
      const map = mapInstance.value;
      if (!map) return;
      if (currentStyle === newStyle) return; // 底图没变，跳过

      clearStyleTimeout();
      currentStyle = newStyle;
      // ★ 置 false：通知子组件 teardown 清理旧图层，新样式加载完再重建
      isStyleLoaded.value = false;
      // diff: true —— 只 diff 新旧样式差异做增量更新，避免整图重载
      map.setStyle(newStyle, { diff: true });
    });

    // ==================== 投影切换 ====================
    watch(
      () => props.projection,
      (next) => {
        const map = mapInstance.value;
        if (!map || !next) return;
        map.setProjection(next);
      },
    );

    // ==================== render 函数 ====================
    // ★ 组件本质：被 Vue 托管的 render 函数。响应式数据变化时自动重新运行。
    //   v-if  → 三元 / && 表达式
    //   v-for → .map()
    //   slot  → slots.default?.()
    return () => (
      <div ref={containerRef} class={containerClass.value}>
        {/* 加载遮罩：地图未加载完成或用户强制 loading */}
        {(!isLoaded.value || props.loading) && (
          <div class="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
            <div class="flex gap-1">
              {/* 三个圆点用 animation-delay 错峰，形成依次闪烁效果 */}
              <span class="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full" />
              <span class="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
              <span class="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {/* ★ 插槽渲染时机：mapInstance 存在（地图已创建）才渲染子组件 */}
        {mapInstance.value && slots.default?.()}
      </div>
    );
  },
});
