import { computed, defineComponent, ref, shallowRef } from 'vue';
import type { PropType } from 'vue';
import { Button, Modal } from 'antdv-next';
import { VMap, VMapControls, useMap, useMapLayer, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { createGeomanInstance } from '@geoman-io/maplibre-geoman-free';
import type { Geoman } from '@geoman-io/maplibre-geoman-free';
import { match } from 'ts-pattern';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';

/**
 * 地理数据编辑弹窗（geoman 免费版）
 *
 * Modal 内 VMap + geoman（@geoman-io/maplibre-geoman-free）：
 * - 关闭插件自带英文工具栏（useControlsUi: false），用自建中文按钮触发其 API，
 *   规避 i18n 问题（画点/画线/画多边形/编辑顶点/拖拽/删除/清空，互斥切换）；
 * - geometryTypes 约束可绘制的几何类型（point/line/polygon 任意组合，不传=五种
 *   绘制全部开放）：point=画点；line=画线；polygon=画多边形/画矩形/画圆
 *   （矩形/圆产出的也是多边形）；编辑顶点/拖拽/删除/清空不受约束；
 * - 打开时按 initialGeoJson 导入已有图形（无则空白绘制）；
 * - 确定导出最新 GeoJSON（features.exportGeoJson）回传父级，取消丢弃。
 * destroyOnClose：每次打开重建地图与 geoman，保证导入最新数据。
 */

/** geoman 初始化子组件（useMap 只能在 VMap 插槽子组件内调用；setup 须同步返回清理函数） */
const GeoEditController = defineComponent({
  name: 'GeoEditController',
  props: {
    initialGeoJson: { type: String as PropType<string | undefined>, default: undefined },
  },
  emits: { ready: (_gm: Geoman) => true },
  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    useMapLayer(map, isLoaded, (mapInstance) => {
      let disposed = false;
      let cleanup: (() => void) | undefined;
      void createGeomanInstance(mapInstance as never, {
        settings: { useControlsUi: false },
      }).then(async (geoman) => {
        if (disposed) {
          if (!geoman.destroyed) geoman.destroy();
          return;
        }
        if (props.initialGeoJson) {
          try {
            await geoman.features.importGeoJson(JSON.parse(props.initialGeoJson));
          } catch {
            // 解析失败按空白处理，不阻断编辑
          }
        }
        emit('ready', geoman);
        cleanup = () => {
          if (!geoman.destroyed) geoman.destroy();
        };
      });
      return () => {
        disposed = true;
        cleanup?.();
      };
    });

    return () => null;
  },
});

/** 允许绘制的几何类型（GeoJSON 口径），三者任意组合 */
export type GeometryType = 'point' | 'line' | 'polygon';

/** 中文绘制按钮（mode 与 geoman API 对应；按 geometryTypes 过滤展示） */
const DRAW_BUTTONS = [
  { mode: 'marker', label: '画点' },
  { mode: 'line', label: '画线' },
  { mode: 'polygon', label: '画多边形' },
  { mode: 'rectangle', label: '画矩形' },
  { mode: 'circle', label: '画圆' },
] as const;

/** 中文编辑按钮（与绘制类型无关，恒可用） */
const EDIT_BUTTONS = [
  { mode: 'edit', label: '编辑顶点' },
  { mode: 'drag', label: '拖拽' },
  { mode: 'remove', label: '删除' },
] as const;

type DrawMode = (typeof DRAW_BUTTONS)[number]['mode'];
type EditMode = (typeof EDIT_BUTTONS)[number]['mode'];
type GeoEditMode = DrawMode | EditMode | '';

/** 几何类型 → 允许的绘制模式（rectangle/circle 产出的也是多边形，归 polygon 组） */
const GEOMETRY_DRAW_MODES: Record<GeometryType, readonly DrawMode[]> = {
  point: ['marker'],
  line: ['line'],
  polygon: ['polygon', 'rectangle', 'circle'],
};

export const GeoEditModal = defineComponent({
  name: 'GeoEditModal',
  props: {
    open: { type: Boolean, default: false },
    initialGeoJson: { type: String as PropType<string | undefined>, default: undefined },
    /** 允许绘制的几何类型组合；不传=五种绘制全部开放 */
    geometryTypes: { type: Array as PropType<GeometryType[] | undefined>, default: undefined },
  },
  emits: ['update:open', 'confirm'],
  setup(props, { emit }) {
    const geoman = shallowRef<Geoman | null>(null);
    const activeMode = ref<GeoEditMode>('');

    /** 工具栏按钮：绘制类按 geometryTypes 过滤，编辑类恒可用 */
    const visibleButtons = computed(() => {
      const types = props.geometryTypes;
      const draws = types
        ? DRAW_BUTTONS.filter((btn) => types.some((t) => GEOMETRY_DRAW_MODES[t].includes(btn.mode)))
        : DRAW_BUTTONS;
      return [...draws, ...EDIT_BUTTONS];
    });

    async function toggleMode(mode: Exclude<GeoEditMode, ''>) {
      const gm = geoman.value;
      if (!gm) return;
      if (activeMode.value === mode) {
        await gm.disableAllModes();
        activeMode.value = '';
        return;
      }
      await gm.disableAllModes();
      // 模式 → geoman API 分发（exhaustive：新增绘制/编辑模式漏接入时编译报错）
      await match(mode)
        .with('marker', 'line', 'polygon', 'rectangle', 'circle', (drawMode) => gm.enableDraw(drawMode))
        .with('edit', () => gm.enableGlobalEditMode())
        .with('drag', () => gm.enableGlobalDragMode())
        .with('remove', () => gm.enableGlobalRemovalMode())
        .exhaustive();
      activeMode.value = mode;
    }

    async function clearAll() {
      await geoman.value?.features.deleteAll();
      activeMode.value = '';
    }

    function handleClose() {
      emit('update:open', false);
    }

    function handleOk() {
      const gm = geoman.value;
      if (gm && !gm.destroyed) {
        emit('confirm', JSON.stringify(gm.features.exportGeoJson()));
      }
      emit('update:open', false);
    }

    return () => (
      <Modal
        open={props.open}
        title="编辑地理数据"
        width="80%"
        okText="确定"
        cancelText="取消"
        destroyOnClose
        onCancel={handleClose}
        onOk={handleOk}
      >
        {/* 中文工具栏：自建按钮触发 geoman API（插件内置工具栏已关闭，规避英文 UI） */}
        <div class="mb-8px flex flex-wrap items-center gap-8px">
          {visibleButtons.value.map((item) => (
            <Button
              key={item.mode}
              type={activeMode.value === item.mode ? 'primary' : 'default'}
              class="rounded-none"
              onClick={() => toggleMode(item.mode)}
            >
              {item.label}
            </Button>
          ))}
          <Button class="rounded-none" onClick={clearAll}>
            清空
          </Button>
        </div>
        <div style={{ height: '420px' }} class="w-full overflow-hidden rd-4px">
          <VMap style={basemapStyle} options={basemapMapOptions}>
            <GeoEditController initialGeoJson={props.initialGeoJson} onReady={(gm: Geoman) => (geoman.value = gm)} />
          </VMap>
        </div>
        <div class="mt-8px text-12px text-gray-400">
          提示：选择绘制工具后在地图上落点；「编辑顶点」可拖拽修改，「确定」保存并回填，「取消」丢弃本次编辑。
        </div>
      </Modal>
    );
  },
});
