import { defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import { Upload } from 'antdv-next';
import { Button } from '@jeesite/core/components/Button';
import { parseGeoLocationFile } from '@jeesite/ifco/api/ifco/project-library';
import { GeoJsonMap } from './geo-json-map';
import { GeoEditModal } from './geo-edit-modal';

/**
 * ifco —— 在库项目管理 · 地理数据区块（审查文件页签 FormGroup「地理数据」内容）
 *
 * - 上传：选择 .shp/.dwg → 调后端解析（假数据阶段 parseGeoLocationFile 模拟）→
 *   返回 GeoJSON 渲染到下方地图；再次上传覆盖重渲；
 * - 编辑：地图旁「编辑地图」打开 geoman 编辑弹窗，确定后回传最新 GeoJSON 重新渲染；
 * - 查看态（disabled）：无上传/编辑按钮，仅只读渲染地图。
 */
export const GeoDataSection = defineComponent({
  name: 'IfcoProjectLibraryGeoDataSection',
  props: {
    geoJson: { type: String as PropType<string | undefined>, default: undefined },
    fileName: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:geoJson', 'update:fileName'],
  setup(props, { emit }) {
    const parsing = ref(false);
    const editOpen = ref(false);

    async function handleSelectFile(file: File) {
      parsing.value = true;
      try {
        const geoJson = await parseGeoLocationFile(file);
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
          onUpdate:open={(value: boolean) => (editOpen.value = value)}
          onConfirm={(geoJson: string) => emit('update:geoJson', geoJson)}
        />
      </div>
    );
  },
});

export default GeoDataSection;
