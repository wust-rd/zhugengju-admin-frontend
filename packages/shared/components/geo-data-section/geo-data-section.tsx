import { defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import { Upload } from 'antdv-next';
import { Button } from '@jeesite/core/components/Button';
import { GeoJsonMap } from './geo-json-map';
import { GeoEditModal } from './geo-edit-modal';
import type { GeometryType } from './geo-edit-modal';

/**
 * 地理数据区块（表单「地理数据」分区的通用内容）
 *
 * - 上传：选择 .shp/.dwg → 调 parseFile 解析（由使用方注入）→
 *   返回 GeoJSON 渲染到下方地图；再次上传覆盖重渲；
 * - 编辑：地图旁「编辑地图」打开 geoman 编辑弹窗，确定后回传最新 GeoJSON 重新渲染
 *   （geometryTypes 可约束弹窗内可绘制的几何类型）；
 * - 查看态（disabled）：无上传/编辑按钮，仅只读渲染地图。
 */
export const GeoDataSection = defineComponent({
  name: 'GeoDataSection',
  props: {
    geoJson: { type: String as PropType<string | undefined>, default: undefined },
    fileName: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
    /** 源文件解析器：上传 .shp/.dwg 后调用，返回 GeoJSON 字符串（如后端解析接口） */
    parseFile: {
      type: Function as PropType<(file: File) => Promise<string>>,
      required: true,
    },
    /** 编辑弹窗允许绘制的几何类型组合（透传 GeoEditModal）；不传=全部开放 */
    geometryTypes: { type: Array as PropType<GeometryType[] | undefined>, default: undefined },
  },
  emits: ['update:geoJson', 'update:fileName'],
  setup(props, { emit }) {
    const parsing = ref(false);
    const editOpen = ref(false);

    async function handleSelectFile(file: File) {
      parsing.value = true;
      try {
        const geoJson = await props.parseFile(file);
        emit('update:geoJson', geoJson);
        emit('update:fileName', file.name);
      } finally {
        parsing.value = false;
      }
      return false;
    }

    return () => (
      <div>
        <div class="mb-8px flex items-center justify-between">
          <span class="truncate text-14px text-gray-500">
            {props.fileName ? `源文件：${props.fileName}` : '尚未上传地理数据源文件'}
          </span>
          <div class="flex shrink-0 gap-8px">
            {!props.disabled && (
              <Upload before-upload={handleSelectFile} accept=".shp,.dwg" showUploadList={false} maxCount={1}>
                <Button preIcon="i-ant-design:upload-outlined" class="rounded-none" loading={parsing.value}>
                  上传 shp / dwg 文件
                </Button>
              </Upload>
            )}
            {!props.disabled && (
              <Button preIcon="i-ant-design:edit-outlined" class="rounded-none" onClick={() => (editOpen.value = true)}>
                编辑地图
              </Button>
            )}
          </div>
        </div>
        <GeoJsonMap geoJson={props.geoJson} />
        <GeoEditModal
          open={editOpen.value}
          initialGeoJson={props.geoJson}
          geometryTypes={props.geometryTypes}
          onUpdate:open={(value: boolean) => (editOpen.value = value)}
          onConfirm={(geoJson: string) => emit('update:geoJson', geoJson)}
        />
      </div>
    );
  },
});
