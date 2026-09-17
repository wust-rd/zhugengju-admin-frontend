import { defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import { Upload } from 'antdv-next';
import { Button } from '@jeesite/core/components/Button';
import { useMessage } from '@jeesite/core/hooks/web/useMessage';
import { GeoJsonMap } from './geo-json-map';
import { GeoEditModal } from './geo-edit-modal';
import type { GeometryType } from './geo-edit-modal';

/**
 * 地理数据区块（表单「地理数据」分区的通用内容）
 *
 * - 上传：选择 .shp/.dwg → 调 parseFile 解析（由使用方注入）→
 *   返回 GeoJSON 渲染到下方地图；再次上传覆盖重渲；解析抛错则提示且不动已有数据；
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
    /** 上传可选择的文件类型（透传 Upload accept；按后端解析能力配置） */
    accept: { type: String, default: '.shp,.dwg' },
    /** 上传按钮文案 */
    uploadText: { type: String, default: '上传 shp / dwg 文件' },
  },
  emits: ['update:geoJson', 'update:fileName'],
  setup(props, { emit, slots }) {
    const parsing = ref(false);
    const editOpen = ref(false);
    const { showMessage } = useMessage();

    async function handleSelectFile(file: File) {
      parsing.value = true;
      try {
        const geoJson = await props.parseFile(file);
        emit('update:geoJson', geoJson);
        emit('update:fileName', file.name);
      } catch (error) {
        // 解析失败：提示后端信息，已有地图数据不动
        showMessage(error instanceof Error ? error.message : '文件解析失败');
      } finally {
        parsing.value = false;
      }
      return false;
    }

    /**
     * 程序化打开文件选择框（uploadButton 插槽模式用：插槽触发元素自行决定何时选择，
     * 如「hover 选坐标系 → 点 item 打开文件框」）。动态 input 用完即弃，每次重选同文件也生效。
     */
    function selectFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = props.accept;
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          void handleSelectFile(file);
        }
      };
      input.click();
    }

    return () => (
      <div>
        <div class="mb-8px flex items-center justify-between">
          <span class="truncate text-14px text-gray-500">
            {props.fileName ? `源文件：${props.fileName}` : '尚未上传地理数据源文件'}
          </span>
          <div class="flex shrink-0 gap-8px">
            {!props.disabled && (
              <>
                {/* uploadButton 插槽：完全自管上传触发（不经 antd Upload），作用域提供
                    parsing（解析中）与 selectFile（打开文件选择框）；无插槽走默认 Upload */}
                {slots.uploadButton
                  ? slots.uploadButton({ parsing: parsing.value, selectFile })
                  : (() => (
                      <Upload
                        before-upload={handleSelectFile}
                        accept={props.accept}
                        showUploadList={false}
                        maxCount={1}
                      >
                        <Button preIcon="i-ant-design:upload-outlined" class="rounded-none" loading={parsing.value}>
                          {props.uploadText}
                        </Button>
                      </Upload>
                    ))()}
              </>
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
