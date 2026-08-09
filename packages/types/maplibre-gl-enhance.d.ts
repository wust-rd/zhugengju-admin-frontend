/**
 * 超图定制版 MapLibre GL（maplibre-gl-enhance.js）全局类型声明
 *
 * 背景：
 * - 由 web/index.html 的 <script src="/maplibregl/maplibre-gl-enhance.js"> 全局加载（UMD，挂 window.maplibregl）
 * - 基于官方 maplibre-gl v4.3.0 fork（20250425 超图构建），API 为官方超集
 * - 增强：CRS 自定义坐标系、geojson source 的 customprj 投影、LngLat.toMGRS、mapbox 兼容等
 *
 * 生效机制：
 * - 本文件位于 @jeesite/types 包，由根 tsconfig.json 的 compilerOptions.types
 *   数组引用（"@jeesite/types/maplibre-gl-enhance"），随 monorepo 所有继承根
 *   tsconfig 的包（web/core/cms/dbm/display）自动加载，全项目全局生效。
 *
 * 说明：借鉴官方 maplibre-gl@4.3.0 dist/maplibre-gl.d.ts 的公共 API 签名精炼重写
 * （官方 d.ts 依赖 style-spec/geojson-vt 等包，无法直接搬入项目）。
 * declare namespace 声明全局值+类型，页面代码直接 `maplibregl.Map` 使用，无需 import。
 */
// ===== GeoJSON 命名空间（供 MapClusterLayer/MapArc 等 generic 使用）=====
// pnpm strict 模式下无法从 @types/geojson 自动引用，在此最小声明
declare namespace GeoJSON {
  type GeoJsonProperties = { [name: string]: unknown } | null;
  type GeoJsonGeometryTypes =
    | 'Point'
    | 'MultiPoint'
    | 'LineString'
    | 'MultiLineString'
    | 'Polygon'
    | 'MultiPolygon'
    | 'GeometryCollection';

  interface Point {
    type: 'Point';
    coordinates: number[];
  }

  interface LineString {
    type: 'LineString';
    coordinates: number[][];
  }

  interface MultiLineString {
    type: 'MultiLineString';
    coordinates: number[][][];
  }

  interface Polygon {
    type: 'Polygon';
    coordinates: number[][][];
  }

  type Geometry = Point | LineString | MultiLineString | Polygon;

  interface Feature<G extends Geometry = Geometry, P = GeoJsonProperties> {
    type: 'Feature';
    properties: P;
    geometry: G;
    id?: string | number;
  }

  interface FeatureCollection<G extends Geometry = Geometry, P = GeoJsonProperties> {
    type: 'FeatureCollection';
    features: Feature<G, P>[];
  }
}

declare namespace maplibregl {
  // ===== 基础几何类型 =====
  type LngLatLike = LngLat | { lng: number; lat: number } | { lon: number; lat: number } | [number, number];
  type LngLatBoundsLike = LngLatBounds | [LngLatLike, LngLatLike] | [number, number, number, number];
  type PointLike = Point | [number, number];
  type PaddingOptions = { top?: number; bottom?: number; left?: number; right?: number };
  type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  class LngLat {
    lng: number;
    lat: number;
    constructor(lng: number, lat: number);
    toArray(): [number, number];
    toBounds(radius: number): LngLatBounds;
    distanceTo(lngLat: LngLat): number;
    toString(): string;
    clone(): LngLat;
    /** 超图增强：MGRS 坐标转换 */
    toMGRS(level?: number): string;
    static convert(input: LngLatLike): LngLat;
  }

  class LngLatBounds {
    constructor(sw?: LngLatLike, ne?: LngLatLike);
    setNorthEast(ne: LngLatLike): this;
    setSouthWest(sw: LngLatLike): this;
    extend(obj: LngLatLike | LngLatBoundsLike): this;
    getCenter(): LngLat;
    getSouthWest(): LngLat;
    getNorthEast(): LngLat;
    getWest(): number;
    getSouth(): number;
    getEast(): number;
    getNorth(): number;
    isEmpty(): boolean;
    equals(bounds: LngLatBounds): boolean;
    toString(): string;
    toArray(): LngLatLike[];
    static convert(input: LngLatBoundsLike): LngLatBounds;
  }

  class EdgeInsets {
    top: number;
    bottom: number;
    left: number;
    right: number;
    constructor(top: number, bottom: number, left: number, right: number);
    getCenter(width: number, height: number): Point;
    equals(other: PaddingOptions): boolean;
    clone(): EdgeInsets;
    toJSON(): PaddingOptions;
  }

  class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
    clone(): Point;
    add(p: Point): Point;
    sub(p: Point): Point;
    multiplyBy(k: number): Point;
    divideBy(k: number): Point;
    round(): Point;
    mag(): number;
    equals(p: Point): boolean;
    dist(p: Point): number;
    distSqr(p: Point): number;
    static convert(a: PointLike): Point;
  }

  class MercatorCoordinate {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z?: number);
    toLngLat(): LngLat;
    toAltitude(): number;
    meterInMercatorCoordinateUnits(): number;
    static fromLngLat(lngLatLike: LngLatLike, altitude?: number): MercatorCoordinate;
    static fromAltitude(altitude: number, lngLatLike: LngLatLike): MercatorCoordinate;
  }

  // ===== 样式类型（借鉴官方 style-spec，精炼公共面） =====
  type StyleSpecification = {
    version: 8;
    name?: string;
    metadata?: unknown;
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    light?: unknown;
    fog?: unknown;
    terrain?: unknown;
    sources: { [key: string]: SourceSpecification };
    layers: LayerSpecification[];
    sprite?: string;
    glyphs?: string;
    transition?: unknown;
  };

  type RasterSourceSpecification = {
    type: 'raster';
    tiles?: string[];
    url?: string;
    tileSize?: number;
    minzoom?: number;
    maxzoom?: number;
    attribution?: string;
    scheme?: 'xyz' | 'tms';
    [k: string]: unknown;
  };

  type RasterDEMSourceSpecification = {
    type: 'raster-dem';
    tiles?: string[];
    url?: string;
    tileSize?: number;
    minzoom?: number;
    maxzoom?: number;
    attribution?: string;
    encoding?: 'terrarium' | 'mapbox' | 'custom';
    [k: string]: unknown;
  };

  type GeoJSONSourceSpecification = {
    type: 'geojson';
    data: object | string;
    maxzoom?: number;
    attribution?: string;
    buffer?: number;
    tolerance?: number;
    cluster?: boolean;
    clusterRadius?: number;
    clusterMaxZoom?: number;
    clusterMinPoints?: number;
    clusterProperties?: unknown;
    lineMetrics?: boolean;
    generateId?: boolean;
    promoteId?: string;
    /** 超图增强：自定义投影坐标定义（EPSG:xxxx 或 proj4 字符串） */
    customprj?: string;
    [k: string]: unknown;
  };

  type VectorSourceSpecification = {
    type: 'vector';
    tiles?: string[];
    url?: string;
    minzoom?: number;
    maxzoom?: number;
    attribution?: string;
    promoteId?: string;
    [k: string]: unknown;
  };

  type ImageSourceSpecification = {
    type: 'image';
    url: string;
    coordinates: [[number, number], [number, number], [number, number], [number, number]];
    [k: string]: unknown;
  };

  type VideoSourceSpecification = {
    type: 'video';
    urls: string[];
    coordinates: [[number, number], [number, number], [number, number], [number, number]];
    [k: string]: unknown;
  };

  type CanvasSourceSpecification = {
    type: 'canvas';
    canvas: string | HTMLCanvasElement;
    coordinates: [[number, number], [number, number], [number, number], [number, number]];
    animate?: boolean;
    [k: string]: unknown;
  };

  type SourceSpecification =
    | RasterSourceSpecification
    | RasterDEMSourceSpecification
    | GeoJSONSourceSpecification
    | VectorSourceSpecification
    | ImageSourceSpecification
    | VideoSourceSpecification
    | CanvasSourceSpecification;

  type LayerType =
    | 'fill'
    | 'line'
    | 'symbol'
    | 'circle'
    | 'heatmap'
    | 'fill-extrusion'
    | 'raster'
    | 'hillshade'
    | 'background';

  type LayerSpecification = {
    id: string;
    type: LayerType;
    source?: string;
    'source-layer'?: string;
    minzoom?: number;
    maxzoom?: number;
    filter?: unknown;
    layout?: { [k: string]: unknown };
    paint?: { [k: string]: unknown };
    metadata?: unknown;
    [k: string]: unknown;
  };

  // ===== Line 图层专用类型 (供 MapArc/MapRoute 等组件使用) =====
  type LineLayerSpecification = {
    id: string;
    type: 'line';
    source?: string;
    'source-layer'?: string;
    filter?: unknown;
    minzoom?: number;
    maxzoom?: number;
    paint?: {
      'line-color'?: string;
      'line-width'?: number;
      'line-opacity'?: number;
      'line-blur'?: number;
      'line-gap-width'?: number;
      'line-offset'?: number;
      'line-dasharray'?: number[];
      [k: string]: unknown;
    };
    layout?: {
      'line-cap'?: 'butt' | 'round' | 'square';
      'line-join'?: 'bevel' | 'round' | 'miter';
      'line-miter-limit'?: number;
      'line-round-limit'?: number;
      'line-sort-key'?: number;
      visibility?: 'visible' | 'none';
      [k: string]: unknown;
    };
    metadata?: unknown;
    [k: string]: unknown;
  };

  // ===== 投影配置 =====
  type ProjectionSpecification = {
    name: 'mercator' | 'globe' | 'naturalEarth' | 'equalEarth' | 'winkelTripel' | 'lambertConformalConic' | 'albers' | 'azimuthalEqualArea' | 'azimuthalEquidistant' | 'conicConformal' | 'conicEqualArea' | 'conicEquidistant' | 'equirectangular' | 'gnomonic' | 'orthographic' | 'stereographic' | 'transverseMercator' | string;
    center?: [number, number];
    parallels?: [number, number];
    [k: string]: unknown;
  };

  // ===== 事件类型 =====
  type Listener = (a: any) => any;

  type MapEvent = { type: string; target: Map; originalEvent?: unknown };

  type MapMouseEvent = MapEvent & {
    lngLat: LngLat;
    point: Point;
    preventDefault(): void;
    originalEvent: MouseEvent;
  };

  type MapLayerMouseEvent = MapMouseEvent & { features?: MapGeoJSONFeature[]; featureIndex?: number };

  type MapTouchEvent = MapEvent & {
    lngLat: LngLat;
    point: Point;
    points: Point[];
    preventDefault(): void;
    originalEvent: TouchEvent;
  };

  type MapWheelEvent = MapEvent & { preventDefault(): void; originalEvent: WheelEvent };

  type MapDataEvent = MapEvent & { dataType: 'source' | 'style' };

  type MapSourceDataEvent = MapEvent & {
    dataType: 'source';
    sourceId: string;
    sourceDataType: 'metadata' | 'content' | 'visibility' | 'idle';
    tile?: unknown;
    source?: Source;
  };

  type MapStyleDataEvent = MapEvent & { dataType: 'style' };

  type MapStyleImageMissingEvent = MapEvent & { id: string };

  type MapGeoJSONFeature = {
    type: 'Feature';
    id?: string | number;
    geometry: { type: string; coordinates: unknown };
    properties: { [k: string]: any };
    layer: LayerSpecification;
    source: string;
    sourceLayer?: string;
    state: { [k: string]: any };
  };

  type MapEventType = {
    resize: MapEvent;
    remove: MapEvent;
    load: MapEvent;
    idle: MapEvent;
    render: MapEvent;
    error: ErrorEvent;
    mousedown: MapMouseEvent;
    mouseup: MapMouseEvent;
    click: MapMouseEvent;
    dblclick: MapMouseEvent;
    mousemove: MapMouseEvent;
    mouseover: MapMouseEvent;
    mouseenter: MapMouseEvent;
    mouseleave: MapMouseEvent;
    mouseout: MapMouseEvent;
    contextmenu: MapMouseEvent;
    wheel: MapWheelEvent;
    touchstart: MapTouchEvent;
    touchend: MapTouchEvent;
    touchmove: MapTouchEvent;
    touchcancel: MapTouchEvent;
    move: MapEvent;
    movestart: MapEvent;
    moveend: MapEvent;
    zoom: MapEvent;
    zoomstart: MapEvent;
    zoomend: MapEvent;
    rotate: MapEvent;
    rotatestart: MapEvent;
    rotateend: MapEvent;
    pitch: MapEvent;
    pitchstart: MapEvent;
    pitchend: MapEvent;
    boxzoomstart: MapEvent;
    boxzoomend: MapEvent;
    boxzoomcancel: MapEvent;
    dragstart: MapEvent;
    drag: MapEvent;
    dragend: MapEvent;
    dataloading: MapDataEvent;
    data: MapDataEvent;
    sourcedataloading: MapSourceDataEvent;
    sourcedata: MapSourceDataEvent;
    styledataloading: MapStyleDataEvent;
    styledata: MapStyleDataEvent;
    styleimagemissing: MapStyleImageMissingEvent;
  };

  // ===== 相机类型 =====
  type CameraOptions = {
    center?: LngLatLike;
    zoom?: number;
    bearing?: number;
    pitch?: number;
    around?: LngLatLike;
    padding?: PaddingOptions;
  };

  type AroundCenterOptions = { around?: 'center' | LngLatLike };

  type FitBoundsOptions = CameraOptions & {
    linear?: boolean;
    easing?: (t: number) => number;
    padding?: number | PaddingOptions;
    offset?: PointLike;
    maxZoom?: number;
    maxDuration?: number;
    essential?: boolean;
  };

  /** 动画选项（官方原版 AnimationOptions） */
  type AnimationOptions = {
    /** 动画时长（毫秒） */
    duration?: number;
    /** 缓动函数，入参 0..1，返回值 0 为初始状态、1 为结束状态 */
    easing?: (_: number) => number;
    /** 目标中心相对真实地图容器中心在动画结束时的偏移 */
    offset?: PointLike;
    /** 为 false 时不播放动画 */
    animate?: boolean;
    /** 为 true 时视为关键动画，不受 prefers-reduced-motion 影响 */
    essential?: boolean;
  };

  type FlyToOptions = AnimationOptions & CameraOptions & {
    speed?: number;
    curve?: number;
    minZoom?: number;
    screenSpeed?: number;
    maxDuration?: number;
    padding?: number | PaddingOptions;
  };

  type StyleSetterOptions = { diff?: boolean; transformStyle?: unknown };

  class Evented {
    on(type: string, listener: Listener): this;
    on(type: string, layerId: string, listener: Listener): this;
    off(type: string, listener: Listener): this;
    off(type: string, layerId: string, listener: Listener): this;
    once(type: string, listener?: Listener): this | Promise<any>;
    fire(type: string, properties?: unknown): this;
    fire(type: string, properties?: unknown): this;
    listenTo(target: Evented, type: string, listener: (...args: unknown[]) => void): this;
    stopListening(target?: Evented, type?: string, listener?: (...args: unknown[]) => void): this;
  }

  // ===== 超图增强：CRS 自定义坐标系 =====
  class CRS {
    lngLatExtent: [number, number, number, number];
    constructor(crsType: string, properties?: Record<string, unknown>);
    getOrigin(): [number, number] | null;
    getLngLatExtent(): [number, number, number, number];
  }

  // ===== MapOptions / Map =====
  type MapOptions = {
    container: HTMLElement | string;
    style?: StyleSpecification | string;
    center?: LngLatLike;
    zoom?: number;
    minZoom?: number | null;
    maxZoom?: number | null;
    minPitch?: number | null;
    maxPitch?: number | null;
    bearing?: number;
    pitch?: number;
    hash?: boolean | string;
    interactive?: boolean;
    bearingSnap?: number;
    attributionControl?: false | AttributionControlOptions;
    maplibreLogo?: boolean;
    logoPosition?: ControlPosition;
    failIfMajorPerformanceCaveat?: boolean;
    preserveDrawingBuffer?: boolean;
    antialias?: boolean;
    refreshExpiredTiles?: boolean;
    maxBounds?: LngLatBoundsLike;
    scrollZoom?: boolean | AroundCenterOptions;
    boxZoom?: boolean;
    dragRotate?: boolean;
    dragPan?: boolean | { linearity?: number; easing?: (t: number) => number; deceleration?: number; maxSpeed?: number };
    keyboard?: boolean;
    doubleClickZoom?: boolean;
    touchZoomRotate?: boolean | AroundCenterOptions;
    touchPitch?: boolean | AroundCenterOptions;
    cooperativeGestures?: boolean;
    trackResize?: boolean;
    fadeDuration?: number;
    localIdeographFontFamily?: string;
    transformRequest?: (
      url: string,
      resourceType?: string,
    ) => { url: string; headers?: Record<string, string>; credentials?: 'same-origin' | 'include' } | undefined;
    /**
     * 超图增强：自定义坐标系
     * 支持 CRS 实例（new maplibregl.CRS('EPSG:4490')）或 EPSG 字符串（如 'EPSG:4490'）
     */
    crs?: CRS | string;
    [k: string]: unknown;
  };

  class Map extends Evented {
    constructor(options: MapOptions);

    // 控件
    addControl(control: IControl, position?: ControlPosition): this;
    removeControl(control: IControl): this;
    hasControl(control: IControl): boolean;

    // source / layer
    addSource(id: string, source: SourceSpecification, options?: StyleSetterOptions): this;
    removeSource(id: string): this;
    getSource<T extends Source = Source>(id: string): T | undefined;
    addLayer(layer: LayerSpecification, beforeId?: string, sourceLayer?: string): this;
    moveLayer(id: string, beforeId?: string): this;
    removeLayer(id: string): this;
    setFeatureState(target: { source: string; sourceLayer?: string; id?: string | number }, state: { [key: string]: unknown }): this;
    getFeatureState(target: { source: string; sourceLayer?: string; id?: string | number }): { [key: string]: unknown };
    getLayer(id: string): LayerSpecification | undefined;
    setLayerZoomRange(layerId: string, minzoom: number, maxzoom: number): this;
    setLayoutProperty(layerId: string, name: string, value: unknown, options?: StyleSetterOptions): this;
    getLayoutProperty(layerId: string, name: string): unknown;
    setPaintProperty(layerId: string, name: string, value: unknown, options?: StyleSetterOptions): this;
    getPaintProperty(layerId: string, name: string): unknown;
    setFilter(layerId: string, filter: unknown, options?: StyleSetterOptions): this;
    getFilter(layerId: string): unknown;
    queryRenderedFeatures(
      geometry?: PointLike | [PointLike, PointLike],
      options?: { layers?: string[]; filter?: unknown; validate?: boolean },
    ): MapGeoJSONFeature[];
    querySourceFeatures(
      sourceId: string,
      parameters?: { sourceLayer?: string; filter?: unknown; validate?: boolean },
    ): MapGeoJSONFeature[];

    // style
    setStyle(style: StyleSpecification | string | null, options?: StyleSetterOptions): this;
    getStyle(): StyleSpecification | undefined;
    isStyleLoaded(): boolean;
    getStyleLayers(): LayerSpecification[];

    // 相机
    setCenter(center: LngLatLike, eventData?: unknown): this;
    getCenter(): LngLat;
    setZoom(zoom: number, eventData?: unknown): this;
    getZoom(): number;
    zoomIn(options?: { duration?: number; easing?: (t: number) => number }, eventData?: unknown): this;
    zoomOut(options?: { duration?: number; easing?: (t: number) => number }, eventData?: unknown): this;
    setMinZoom(minZoom: number | null): this;
    getMinZoom(): number;
    setMaxZoom(maxZoom: number | null): this;
    getMaxZoom(): number;
    setPitch(pitch: number, eventData?: unknown): this;
    getPitch(): number;
    setBearing(bearing: number, eventData?: unknown): this;
    getBearing(): number;
    setPadding(padding: PaddingOptions, eventData?: unknown): this;
    getPadding(): PaddingOptions;
    fitBounds(bounds: LngLatBoundsLike, options?: FitBoundsOptions, eventData?: unknown): this;
    fitScreenCoordinates(p0: PointLike, p1: PointLike, bearing: number, options?: CameraOptions, eventData?: unknown): this;
    jumpTo(options: CameraOptions, eventData?: unknown): this;
    easeTo(options: AnimationOptions & CameraOptions, eventData?: unknown): this;
    flyTo(options: FlyToOptions, eventData?: unknown): this;
    zoomTo(zoom: number, options?: AnimationOptions | null, eventData?: unknown): this;
    zoomIn(options?: AnimationOptions, eventData?: unknown): this;
    zoomOut(options?: AnimationOptions, eventData?: unknown): this;
    resetNorthPitch(options?: AnimationOptions, eventData?: unknown): this;
    stop(): this;
    getBounds(): LngLatBounds;
    getMaxBounds(): LngLatBounds | null;
    setMaxBounds(bounds: LngLatBoundsLike | null): this;
    cameraForBounds(bounds: LngLatBoundsLike, options?: CameraOptions): CameraOptions | undefined;
    cameraForBox(bounds: [PointLike, PointLike], options?: CameraOptions): CameraOptions | undefined;

    // 投影 / DOM
    project(lnglat: LngLatLike): Point;
    unproject(point: PointLike): LngLat;
    getContainer(): HTMLElement;
    getCanvasContainer(): HTMLElement;
    getCanvas(): HTMLCanvasElement;
    resize(eventData?: unknown): this;
    setProjection(projection: ProjectionSpecification | string): this;
    getProjection(): ProjectionSpecification;
    isMoving(): boolean;
    remove(): void;

    // 事件（具名类型安全 + 字符串兜底）
    on<T extends keyof MapEventType>(type: T, listener: (ev: MapEventType[T]) => void): this;
    on(type: string, listener: Listener): this;
    once<T extends keyof MapEventType>(type: T, listener?: (ev: MapEventType[T]) => void): this | Promise<MapEventType[T]>;
    once(type: string, listener?: Listener): this | Promise<any>;
    off<T extends keyof MapEventType>(type: T, listener: (ev: MapEventType[T]) => void): this;
    off(type: string, listener?: Listener): this;
  }

  // ===== 控件 =====
  interface IControl {
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getDefaultPosition?: () => ControlPosition;
  }

  type AttributionControlOptions = { compact?: boolean; customAttribution?: string | string[] };

  class AttributionControl implements IControl {
    constructor(options?: AttributionControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type NavigationControlOptions = { showCompass?: boolean; showZoom?: boolean; visualizePitch?: boolean };

  class NavigationControl implements IControl {
    constructor(options?: NavigationControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type GeolocateControlOptions = {
    positionOptions?: PositionOptions;
    fitBoundsOptions?: FitBoundsOptions;
    trackUserLocation?: boolean;
    showAccuracyCircle?: boolean;
    showUserLocation?: boolean;
    showUserHeading?: boolean;
  };

  class GeolocateControl extends Evented implements IControl {
    constructor(options?: GeolocateControlOptions);
    trigger(): boolean;
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type FullscreenControlOptions = { container?: HTMLElement | null };

  class FullscreenControl extends Evented implements IControl {
    constructor(options?: FullscreenControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type ScaleControlOptions = { maxWidth?: number; unit?: 'imperial' | 'metric' | 'nautical' };

  class ScaleControl implements IControl {
    constructor(options?: ScaleControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type LogoControlOptions = { compact?: boolean };

  class LogoControl implements IControl {
    constructor(options?: LogoControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  type TerrainControlOptions = { source: string; exaggeration?: number };

  class TerrainControl implements IControl {
    constructor(options: TerrainControlOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  // ===== Source 类 =====
  class Source {
    id: string;
    type: string;
    minzoom: number;
    maxzoom: number;
    attribution?: string;
    setAttribution(attribution: string | null): this;
    onAdd(map: Map): void;
    onRemove(map: Map): void;
    load(): void;
    loaded(): boolean;
    hasTransition(): boolean;
    serialize(): SourceSpecification;
    [k: string]: any;
  }

  class GeoJSONSource extends Source {
    constructor(options: GeoJSONSourceSpecification);
    setData(data: object | string): this;
    getClusterExpansionZoom(clusterId: number): Promise<number>;
    getClusterChildren(clusterId: number): Promise<MapGeoJSONFeature[]>;
    getClusterLeaves(clusterId: number, limit: number, offset: number): Promise<MapGeoJSONFeature[]>;
  }

  class ImageSource extends Source {
    constructor(options: ImageSourceSpecification);
    setCoordinates(coordinates: ImageSourceSpecification['coordinates']): this;
    updateImage(options: { url: string; coordinates?: ImageSourceSpecification['coordinates'] }): this;
    setURL(url: string): this;
    serialize(): ImageSourceSpecification;
  }

  class VideoSource extends Source {
    constructor(options: VideoSourceSpecification);
    setCoordinates(coordinates: VideoSourceSpecification['coordinates']): this;
    getVideo(): HTMLVideoElement;
    serialize(): VideoSourceSpecification;
  }

  class CanvasSource extends Source {
    constructor(options: CanvasSourceSpecification);
    play(): void;
    pause(): void;
    setCoordinates(coordinates: CanvasSourceSpecification['coordinates']): this;
    getCanvas(): HTMLCanvasElement;
    serialize(): CanvasSourceSpecification;
  }

  class RasterTileSource extends Source {
    constructor(options: RasterSourceSpecification);
    serialize(): RasterSourceSpecification;
  }

  class VectorTileSource extends Source {
    constructor(options: VectorSourceSpecification);
    setTiles(tiles: string[]): void;
    serialize(): VectorSourceSpecification;
  }

  class RasterDEMTileSource extends RasterTileSource {
    constructor(options: RasterDEMSourceSpecification);
  }

  // ===== Marker / Popup =====
  type MarkerOptions = {
    element?: HTMLElement;
    offset?: PointLike;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color?: string;
    scale?: number;
    draggable?: boolean;
    clickTolerance?: number;
    rotation?: number;
    rotationAlignment?: 'map' | 'viewport' | 'auto';
    pitchAlignment?: 'map' | 'viewport' | 'auto';
    occludedOpacity?: number;
    subtitle?: string | HTMLElement;
  };

  class Marker extends Evented {
    constructor(options?: MarkerOptions);
    setLngLat(lnglat: LngLatLike): this;
    getLngLat(): LngLat;
    setOffset(offset: PointLike): this;
    addTo(map: Map): this;
    remove(): this;
    setPopup(popup?: Popup | null): this;
    getPopup(): Popup | undefined;
    setDraggable(draggable: boolean): this;
    isDraggable(): boolean;
    setRotation(rotation: number): this;
    getElement(): HTMLElement;
  }

  type PopupOptions = {
    offset?: number | PointLike | { [k in 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right']?: PointLike };
    anchor?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    closeButton?: boolean;
    closeOnClick?: boolean;
    maxWidth?: string;
    className?: string;
    focusAfterOpen?: boolean;
    subpixelPositioning?: boolean;
    subtitle?: string | HTMLElement;
  };

  class Popup extends Evented {
    constructor(options?: PopupOptions);
    setLngLat(lnglat: LngLatLike): this;
    getLngLat(): LngLat;
    setHTML(html: string): this;
    setText(text: string): this;
    setDOMContent(htmlNode: Node): this;
    addTo(map: Map): this;
    remove(): this;
    setMaxWidth(maxWidth: string): this;
    setOffset(offset: number | PointLike | { [k in 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right']?: PointLike }): this;
    isOpen(): boolean;
    getElement(): HTMLElement;
  }

  // ===== 工具函数与常量 =====
  type ResourceType =
    | 'Unknown'
    | 'Style'
    | 'Source'
    | 'Tile'
    | 'Glyphs'
    | 'SpriteImage'
    | 'SpriteJSON'
    | 'Image'
    | 'Model';

  type RequestTransformFunction = (
    url: string,
    resourceType?: ResourceType,
  ) => { url: string; headers?: Record<string, string>; credentials?: 'same-origin' | 'include' } | undefined;

  type AddProtocolAction = (
    params: { url: string; type: ResourceType; signal?: AbortSignal },
    abortController?: AbortController,
  ) => Promise<{ data: ArrayBuffer; cacheControl?: string; expires?: string }>;

  function addProtocol(protocol: string, loadFn: AddProtocolAction): void;
  function removeProtocol(protocol: string): void;
  function addSourceType(name: string, SourceType: { new (id: string, options: unknown): Source }): Promise<void>;
  function setWorkerUrl(url: string): void;
  function getWorkerUrl(): string;
  function getWorkerCount(): number;
  function setWorkerCount(count: number): void;
  function importScriptInWorkers(script: string): void;
  function getVersion(): string;
  function setRTLTextPlugin(pluginURL: string, callback: (error?: Error) => void, deferred?: boolean): void;
  function getRTLTextPluginStatus(): 'unavailable' | 'loading' | 'loaded' | 'error';
  function prewarm(): void;
  function clearPrewarmedResources(): void;
  function setMaxParallelImageRequests(num: number): void;
  function getMaxParallelImageRequests(): number;

  type Config = {
    MAX_PARALLEL_IMAGE_REQUESTS: number;
    MAX_TILE_CACHE_ZOOM_LEVELS: number;
    REGISTERED_PROTOCOLS: Record<string, boolean>;
    WORKER_URL: string;
  };

  const config: Config;
  /** 超图增强：Mapbox GL 兼容引用 */
  const mapbox: unknown;
}

// ===== npm 包兼容：让依赖 maplibre-gl 的库 Typescript 类型解析到全局 maplibregl =====
// 项目未安装 maplibre-gl npm 包，通过此声明让 `import maplibregl from 'maplibre-gl'` 获得完整类型
// 同时声明命名导出（import { type Map } from 'maplibre-gl'）供第三方组件使用
declare module 'maplibre-gl' {
  // 默认导出 — `import maplibregl from 'maplibre-gl'`
  export = maplibregl;

  // 命名类型导出 — `import { type Map } from 'maplibre-gl'`
  // （export = namespace 默认不支持命名导出，但 declare module 中可叠加声明类型别名）
  export type Map = maplibregl.Map;
  export type Marker = maplibregl.Marker;
  export type Popup = maplibregl.Popup;
  export type LngLat = maplibregl.LngLat;
  export type LngLatBounds = maplibregl.LngLatBounds;
  export type GeoJSONSource = maplibregl.GeoJSONSource;
  export type NavigationControl = maplibregl.NavigationControl;
  export type GeolocateControl = maplibregl.GeolocateControl;
  export type MapGeoJSONFeature = maplibregl.MapGeoJSONFeature;
  export type MapLayerEventType = maplibregl.MapLayerEventType;
  export type MapMouseEvent = maplibregl.MapMouseEvent;
  export type MapTouchEvent = maplibregl.MapTouchEvent;
  export type MapLayerMouseEvent = maplibregl.MapLayerMouseEvent;
  export type MarkerOptions = maplibregl.MarkerOptions;
  export type PopupOptions = maplibregl.PopupOptions;
  export type LineLayerSpecification = maplibregl.LineLayerSpecification;
  export type ProjectionSpecification = maplibregl.ProjectionSpecification;
}
