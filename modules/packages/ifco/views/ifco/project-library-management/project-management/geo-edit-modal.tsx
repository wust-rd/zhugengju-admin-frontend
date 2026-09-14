import { defineComponent, ref, shallowRef } from 'vue';
import type { PropType } from 'vue';
import { Button, Modal } from 'antdv-next';
import { VMap, VMapControls, useMap, useMapLayer, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { createGeomanInstance } from '@geoman-io/maplibre-geoman-free';
import type { Geoman } from '@geoman-io/maplibre-geoman-free';
import { match } from 'ts-pattern';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';

/**
 * ifco —— 在库项目管理 · 地理数据编辑弹窗（geoman 免费版）
 *
 * Modal 内 VMap + geoman（@geoman-io/maplibre-geoman-free）：
 * - 关闭插件自带英文工具栏（useControlsUi: false），用自建中文按钮触发其 API，
 *   规避 i18n 问题（画点/画线/画多边形/编辑顶点/拖拽/删除/清空，互斥切换）；
 * - 打开时按 initialGeoJson 导入已有图形（无则空白绘制）；
 * - 确定导出最新 GeoJSON（features.exportGeoJson）回传父级，取消丢弃。
 * destroyOnClose：每次打开重建地图与 geoman，保证导入最新数据。
 */

/** geoman 初始化子组件（useMap 只能在 VMap 插槽子组件内调用；setup 须同步返回清理函数） */
const GeoEditController = defineComponent({
  name: 'IfcoProjectLibraryGeoEditController',
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

/** 中文工具按钮（mode 与 geoman API 对应；互斥切换，再点一次停用） */
const MODE_BUTTONS = [
  { mode: 'marker', label: '画点' },
  { mode: 'line', label: '画线' },
  { mode: 'polygon', label: '画多边形' },
  { mode: 'rectangle', label: '画矩形' },
  { mode: 'circle', label: '画圆' },
  { mode: 'edit', label: '编辑顶点' },
  { mode: 'drag', label: '拖拽' },
  { mode: 'remove', label: '删除' },
] as const;

type GeoEditMode = (typeof MODE_BUTTONS)[number]['mode'] | '';

export const GeoEditModal = defineComponent({
  name: 'IfcoProjectLibraryGeoEditModal',
  props: {
    open: { type: Boolean, default: false },
    initialGeoJson: { type: String as PropType<string | undefined>, default: undefined },
  },
  emits: ['update:open', 'confirm'],
  setup(props, { emit }) {
    const geoman = shallowRef<Geoman | null>(null);
    const activeMode = ref<GeoEditMode>('');

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
          {MODE_BUTTONS.map((item) => (
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
            <VMapControls />
            <GeoEditController
              initialGeoJson={props.initialGeoJson}
              onReady={(gm: Geoman) => (geoman.value = gm)}
            />
          </VMap>
        </div>
        <div class="mt-8px text-12px text-gray-400">
          提示：选择绘制工具后在地图上落点；「编辑顶点」可拖拽修改，「确定」保存并回填，「取消」丢弃本次编辑。
        </div>
      </Modal>
    );
  },
});

export default GeoEditModal;
