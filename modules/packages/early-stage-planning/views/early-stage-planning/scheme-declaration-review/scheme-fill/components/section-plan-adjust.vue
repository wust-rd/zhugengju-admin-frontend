<!--
  填报页区块：片区规划调整（对齐设计稿图2）

  字段（均选填）：调整内容（≤300 字）/ 调整前图纸（jpg/png，1 张）/
  调整后图纸（jpg/png，1 张）。
  值结构（经 defineExpose 并入保存值）：adjustContent 字符串 +
  adjustBeforeFile / adjustAfterFile 单文件对象（null=未传）。
-->
<template>
  <div class="flex flex-col gap-12px">
    <div>
      <div class="mb-6px text-14px text-gray-700">调整内容</div>
      <TextArea
        v-model:value="adjustContent"
        :maxlength="300"
        :rows="4"
        show-count
        :disabled="disabled"
        placeholder="300字以内"
      />
    </div>
    <div class="grid grid-cols-1 items-start gap-x-24px gap-y-12px lg:grid-cols-2">
      <div>
        <div class="mb-6px text-14px text-gray-700">调整前图纸</div>
        <Upload
          :file-list="beforeFiles.fileList.value"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          :max-count="1"
          :disabled="disabled"
          :show-upload-list="disabled ? { showRemoveIcon: false } : true"
          :before-upload="beforeFiles.beforeUpload"
          @preview="onPreview"
          @change="beforeFiles.onChange"
        >
          <div
            v-if="!beforeFiles.fileList.value.length"
            class="flex flex-col items-center justify-center gap-2px text-gray-400"
          >
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片，支持jpg、png格式，1个</div>
      </div>
      <div>
        <div class="mb-6px text-14px text-gray-700">调整后图纸</div>
        <Upload
          :file-list="afterFiles.fileList.value"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          :max-count="1"
          :disabled="disabled"
          :show-upload-list="disabled ? { showRemoveIcon: false } : true"
          :before-upload="afterFiles.beforeUpload"
          @preview="onPreview"
          @change="afterFiles.onChange"
        >
          <div
            v-if="!afterFiles.fileList.value.length"
            class="flex flex-col items-center justify-center gap-2px text-gray-400"
          >
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片，支持jpg、png格式，1个</div>
      </div>
    </div>
    <!-- 缩略图点击预览弹层（替代 antd 新开页面默认行为） -->
    <ImagePreview :url="previewUrl" @close="previewUrl = ''" />
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionPlanAdjust">
  import { ref } from 'vue';
  import { TextArea, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import ImagePreview from './image-preview.vue';
  import { useEspFileList } from './use-esp-file-list';
  import type { SectionFormExposed } from './use-section-form';
  import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 缩略图点击预览：拦截 Upload 默认新开页面，转弹窗展示 */
  const previewUrl = ref('');
  function onPreview(file: UploadFile) {
    previewUrl.value = (file.url as string) || '';
  }

  /** 调整内容（≤300 字） */
  const adjustContent = ref(String(props.data?.adjustContent ?? ''));

  /** 调整前/后图纸（各 1 张；回显初值=后端单文件对象） */
  const beforeFiles = useEspFileList(
    (props.data?.adjustBeforeFile as EspSchemeFile | null | undefined)
      ? [props.data?.adjustBeforeFile as EspSchemeFile]
      : undefined,
  );
  const afterFiles = useEspFileList(
    (props.data?.adjustAfterFile as EspSchemeFile | null | undefined)
      ? [props.data?.adjustAfterFile as EspSchemeFile]
      : undefined,
  );

  /** 单文件位当前文件（无= null） */
  function singleFile(files: ReturnType<typeof useEspFileList>): EspSchemeFile | null {
    return files.espFiles()[0] ?? null;
  }

  defineExpose({
    validate: async () => {},
    getFieldsValue: () => ({
      adjustContent: adjustContent.value.trim(),
      adjustBeforeFile: singleFile(beforeFiles),
      adjustAfterFile: singleFile(afterFiles),
    }),
    exportRows: (): [string, string][] => [
      ['调整内容', adjustContent.value.trim()],
      ['调整前图纸', beforeFiles.fileList.value.map((f) => f.name).join('、') || '（无）'],
      ['调整后图纸', afterFiles.fileList.value.map((f) => f.name).join('、') || '（无）'],
    ],
    setFieldsValueSilently: async () => {},
  } satisfies SectionFormExposed);
</script>
