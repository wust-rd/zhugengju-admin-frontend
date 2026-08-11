# @jeesite/vmap — MapLibre 地图组件包

> 路径：`packages/vmap/`。Vue 3 + TSX 封装的超图定制版 MapLibre GL（`maplibre-gl-enhance.js`）组件包。

## 包结构

```
packages/vmap/
├── index.ts                        # 包入口：VMap / VMapControls / useMap / useMapLayer / usePopup / context
└── src/
    ├── v-map.tsx                   # <VMap> 地图容器组件（provide 地图上下文）
    ├── v-map-controls.tsx          # <VMapControls> 缩放/全屏控件
    ├── types.ts                    # MapViewport / MapRef / MapArc 等类型
    ├── context.ts                  # MapContextKey / MarkerContextKey 注入键
    └── composables/
        ├── use-map.ts              # useMap()：注入获取地图实例
        ├── use-map-layer.ts        # useMapLayer()：图层生命周期管理（本 README 重点）
        └── use-popup.ts            # usePopup()：弹窗绑定
```

## 地图上下文（useMap 的注入机制）

`<VMap>` 组件在自身 `setup()` 里 `provide(MapContextKey)` 地图上下文，**只对后代组件生效**。

**硬性约束**：`useMap()` / `useMapLayer()` 只能在 `<VMap>` **插槽内的子组件**中调用。

> ⚠️ 反例（常见报错）：页面根组件在 `setup()` 里直接 `const { map, isLoaded } = useMap()`。
> 此时页面根组件是 `<VMap>` 的**祖先**而非后代，`inject` 返回 `null`，
> `useMap` 直接抛错：`Error: useMap must be used within a Map component`。

**正确模式**：地图逻辑一律提取为纯逻辑子组件（`defineComponent` + `return () => null`，不渲染 DOM），
放进 `<VMap>` 插槽；父组件状态通过 `emit` 通信：

```tsx
// 地图逻辑子组件 map-layers.tsx
export const SchemeMapLayers = defineComponent({
  name: 'SchemeMapLayers',
  emits: { 'update:drawer': (_v: boolean) => true },
  setup(_props, { emit }) {
    const { map, isLoaded } = useMap();
    // ...图层逻辑...
    return () => null; // 纯逻辑组件不渲染 DOM
  },
});

// 页面根组件
<VMap style={style} options={mapOptions}>
  <VMapControls />
  <SchemeMapLayers onUpdate:drawer={(v) => (drawerVisible.value = v)} />
</VMap>
```

## useMapLayer —— 图层生命周期管理（正确使用方法）

### 签名

```ts
useMapLayer(
  map: Ref<MapLibreMap | null>,     // 来自 useMap() 的地图实例 ref
  isLoaded: Ref<boolean>,           // 地图加载完成标志
  setup: (map: MapLibreMap) => void | (() => void),  // 图层初始化函数，可返回清理函数
)
```

### 工作机制

内部 `watch([map, isLoaded], ..., { immediate: true })`，按状态自动执行：

| 状态 | 行为 |
|------|------|
| `map` 为 `null`（未注入/已销毁） | 执行清理 |
| `isLoaded === true` 且未 setup 过 | 调用一次 `setup(map)`，返回值存为清理函数 |
| `isLoaded === false`（`setStyle` 重置样式） | 先执行上次清理（注销陈旧 `map.on` 监听器），等重新加载后再 setup |
| 组件卸载 | 兜底执行清理 |

### 为什么必须返回清理函数

MapLibre `setStyle` 会清空所有 layers/sources，但**不会**移除 `map.on()` 注册的
**委托事件监听器**（如 `m.on('click', layerId, handler)`）。若不清理，主题切换/换底图后
监听器会跨样式累积，多次触发。因此 `setup` 内注册的监听器、添加的图层/数据源，
都要在清理函数里显式回收。

### 规范写法（模板）

```ts
useMapLayer(map, isLoaded, (m) => {
  // 1. 添加图层
  m.addSource('my-source', { type: 'geojson', data });
  m.addLayer({ id: 'my-layer', type: 'line', source: 'my-source', paint: { ... } });

  // 2. 注册交互监听器
  const onClick = (e: maplibregl.MapMouseEvent) => { /* ... */ };
  m.on('click', onClick);

  // 3. 返回清理函数（换底图/卸载时回收本次 setup 的资源）
  return () => {
    m.off('click', onClick);
    try {
      if (m.getLayer('my-layer')) m.removeLayer('my-layer');
      if (m.getSource('my-source')) m.removeSource('my-source');
    } catch {
      // setStyle 已把图层/数据源移除，忽略
    }
  };
});
```

### 注意事项

1. **清理函数必须判空守卫或 try/catch**：执行清理时 `setStyle` 可能已经把图层/数据源
   移除掉了，直接 `removeLayer` 会抛错。用 `m.getLayer(id)` / `m.getSource(id)` 判空，
   或整体 `try/catch`。
2. **异步 fetch 加载数据时要有卸载兜底**：`setup` 内发起 `fetch(geojsonUrl)` 是异步的，
   回调执行时组件可能已卸载。用模块闭包标志位 + 源判空双重防护：
   ```ts
   let disposed = false; // 组件卸载时置 true
   fetch(url).then(r => r.json()).then(data => {
     if (disposed || m.getSource('id')) return; // 已卸载 / 已存在则不重复添加
     m.addSource('id', { type: 'geojson', data });
   }).catch(() => {});
   // 卸载兜底
   onBeforeUnmount(() => { disposed = true; });
   ```
3. **`style` 对象内内联 geojson source 不渲染**（MapLibre 已知坑）：数据必须
   `map.once('load')` / `isLoaded` 后动态 `addSource` + `addLayer`，这正是
   `useMapLayer` 存在的原因。
4. **不要在页面根组件直接 `useMap`**：见上文"地图上下文"章节。
