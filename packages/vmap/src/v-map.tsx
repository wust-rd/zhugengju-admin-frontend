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
 * ★ reuseMaps（跨路由复用）：参考 react-map-gl 的 reuseMaps。
 *   开启后组件卸载时不销毁 MapLibre 实例（入池），另一个 <VMap reuseMaps>
 *   挂载时复用同一实例：DOM 搬移 + 尺寸适配，保留底图、已添加图层 / marker 与视口。
 *   适用于“地图挂载在 layout，路由切换只做隐藏/复显”的场景；
 *   约束：跨实例复用应保持底图一致（复用不 setStyle，保留旧实例状态）。
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

/**
 * 已回收待复用的 MapLibre 实例池（LIFO）。
 * reuseMaps 模式下，组件卸载时不销毁实例而是推入此池；
 * 新 <VMap reuseMaps> 挂载时优先从池中取出复用，保留图层 / marker / 视口。
 *
 * 内存说明：池内实例为强引用、不会自动 GC，需通过 setSavedMapsLimit / clearSavedMaps 控制。
 */
const savedMaps: MapLibreGL.Map[] = [];

/** 池容量上限（0 = 不限制，默认）。超过上限时新回收的实例直接销毁，避免内存无限堆积 */
let savedMapsLimit = 0;

/**
 * 设置复用池容量上限（0 = 不限制）。
 * 例如 setSavedMapsLimit(1) 表示最多保留 1 个待复用实例，其余回收的实例立即销毁。
 */
export function setSavedMapsLimit(limit: number) {
  savedMapsLimit = limit;
}

/**
 * 销毁并清空复用池（真正释放内存）。
 * 适合在退出地图应用 / 注销登录 / 明确不再复用地图时调用；
 * 调用后下一次 <VMap reuseMaps> 会重新创建实例。
 */
export function clearSavedMaps() {
  const maps = savedMaps.splice(0, savedMaps.length);
  for (const map of maps) {
    try {
      map.remove();
    } catch {
      // 实例可能已被销毁，忽略
    }
  }
}

/**
 * 从池中复用地图实例：
 * 1. 把旧容器（已从 document 摘除但 DOM 节点仍在内存）的全部子节点搬到新容器；
 * 2. 替换 MapLibre 内部 container 引用（私有字段，需 cast）；
 * 3. resize() 适配新容器尺寸。
 * 池空时返回 null，由调用方新建实例。
 */
function reuseMap(container: HTMLDivElement): MapLibreGL.Map | null {
  const map = savedMaps.pop();
  if (!map) return null;
  const oldContainer = map.getContainer();
  while (oldContainer.childNodes.length > 0) {
    container.appendChild(oldContainer.childNodes[0]);
  }
  (map as unknown as { _container: HTMLDivElement })._container = container;
  map.resize();
  return map;
}

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
    /**
     * 是否复用已回收的地图实例（默认 false）。
     * 开启后，组件卸载时不销毁 MapLibre 实例（入池），另一个 <VMap reuseMaps>
     * 挂载时复用同一实例：DOM 搬移 + 尺寸适配，保留底图、已添加图层 / marker 与视口。
     * 适合地图挂载在 layout、跨路由切换的场景；底图一致时效果最佳。
     */
    reuseMaps: { type: Boolean, default: false },
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

    // ==================== 地图事件处理器（顶层定义，卸载回收时需 off） ====================
    // styledata —— 样式数据到达（加载/换底图时触发），100ms 防抖只认最后一次
    const styleDataHandler = () => {
      clearStyleTimeout();
      styleTimeout = setTimeout(() => {
        isStyleLoaded.value = true;
        if (props.projection) {
          mapInstance.value?.setProjection(props.projection);
        }
      }, 100);
    };
    // load —— 地图资源加载完成
    const loadHandler = () => {
      isLoaded.value = true;
    };
    // move —— 相机位置/角度变化；★ 防重入：内部 jumpTo 触发的 move（internalUpdate=true）直接 return
    const handleMove = () => {
      if (internalUpdate) return;
      const m = mapInstance.value;
      if (m) emit('update:viewport', getViewport(m));
    };

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

      let map: MapLibreGL.Map | null = null;
      // reuseMaps 优先复用池中已回收实例（保留图层 / marker / 视口）
      if (props.reuseMaps) map = reuseMap(containerRef.value);

      if (!map) {
        // 初始底图：用户自定义优先，否则默认 Carto 亮色
        currentStyle = styleOption.value;

        // ★ 创建 MapLibre 底层实例
        map = new MapLibreGL.Map({
          container: containerRef.value,
          style: styleOption.value,
          renderWorldCopies: false,
          attributionControl: { compact: true },
          ...collectMapOptions(),
        });
      }

      // 统一注册监听（新建 / 复用一致）；复用已加载实例时 load/styledata 不会再触发，
      // 改由下方手动置位 isLoaded / isStyleLoaded 模拟 load 事件
      map.on('load', loadHandler);
      map.on('styledata', styleDataHandler);
      map.on('move', handleMove);

      if (props.reuseMaps) {
        // 复用已加载实例：手动同步加载状态，子组件（useMapLayer 等）随即挂接图层
        // ★ 注意：不能用 map.loaded() —— 增强版它依赖 _styleDirty/_sourcesDirty，
        //   复用后刚执行过 resize() 会置 dirty 标志导致其返回 false；
        //   isStyleLoaded() 只查 style 内部状态、不依赖 dirty 标志，更可靠
        if (map.isStyleLoaded()) {
          isLoaded.value = true;
          isStyleLoaded.value = true;
        }
        // 复用不 setStyle（保留旧底图与已添加图层）；currentStyle 同步为期望值，
        // 防止 watch(styleOption) 误判“底图变化”而 setStyle 清空图层
        currentStyle = styleOption.value;
      }

      // ★ 最后才赋值：provide 出去的 map 变为可用，
      //   render 里 <slots.default> 也因 mapInstance 非空而开始渲染子组件
      mapInstance.value = map;
    });

    // ==================== 生命周期：卸载 ====================
    onBeforeUnmount(() => {
      clearStyleTimeout();
      const map = mapInstance.value;
      if (map) {
        if (props.reuseMaps) {
          // 回收而非销毁：先摘除本组件注册的监听器（避免复用后重复触发），实例入池
          map.off('move', handleMove);
          map.off('load', loadHandler);
          map.off('styledata', styleDataHandler);
          if (savedMapsLimit > 0 && savedMaps.length >= savedMapsLimit) {
            map.remove(); // 池已满：直接销毁而非入池
          } else {
            savedMaps.push(map);
          }
        } else {
          map.remove(); // 销毁 MapLibre 实例
        }
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
          <div class="bg-background/50 absolute inset-0 z-10 flex items-center justify-center">
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
