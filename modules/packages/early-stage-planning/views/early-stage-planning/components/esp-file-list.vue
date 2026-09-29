<!--
  前期谋划 · 附件上传/展示公用组件（EspFileList）

  统一"真上传 + pdf/图片可预览 + 其他类型下载"的附件交互（此前 scheme-fill 各区块与
  ure 模块各写一份，现抽公用；scheme-fill 存量用法暂不迁移避免回归，新功能一律用本组件）：
  - 上传走既有 POST /a/esp/file/upload（MinIO 永久直链），上传中显示占位，失败自动移除并提示；
  - 文件条目：类型色图标 + 文件名 + 大小；pdf/图片显示「预览」（新窗直链），有直链显示「下载」
    （fetch 转 blob 落盘，文件名保真，跨域失败回退新窗打开）；
  - 历史数据仅文件名（无 url）时正常展示，无预览/下载按钮。

  用法：
    <EspFileList v-model:value="files" accept=".pdf,.doc,.docx" multiple />
    <EspFileList :value="files" readonly />              // 只读展示（详情/意见卡片）
  文件对象：{ name, url?, objectKey?, size? }（兼容 uploading 内部标记）。
-->
<template>
  <div class="flex flex-col gap-8px">
    <Upload
      v-if="uploadable && !readonly"
      :show-upload-list="false"
      :before-upload="handleUpload"
      :multiple="multiple"
      :accept="accept"
    >
      <slot name="upload-trigger">
        <a-button>
          <span class="inline-flex items-center gap-4px">
            <span class="i-ant-design:upload-outlined"></span> 上传附件
          </span>
        </a-button>
      </slot>
    </Upload>

    <div v-for="(f, i) in files" :key="i" class="flex items-center gap-8px text-13px text-gray-600">
      <span class="i-ant-design:file-text-outlined shrink-0" :style="{ color: fileColor(f.name) }"></span>
      <span class="min-w-0 flex-1 truncate" :title="f.name">{{ f.name }}</span>
      <span v-if="f.uploading" class="shrink-0 text-12px text-gray-400">上传中…</span>
      <span v-else-if="f.size" class="shrink-0 text-12px text-gray-400">{{ sizeText(f.size) }}</span>
      <template v-if="!f.uploading">
        <a-button v-if="canPreview(f)" type="link" size="small" @click="openEspFile(f)">预览</a-button>
        <a-button v-if="f.url" type="link" size="small" @click="downloadEspFile(f)">下载</a-button>
      </template>
      <span
        v-if="deletable && !readonly && !f.uploading"
        class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 hover:text-red-500"
        @click="removeAt(i)"
      >
        <span class="i-ant-design:close-outlined"></span>
      </span>
    </div>

    <div v-if="files.length === 0 && emptyText" class="text-13px text-gray-400">{{ emptyText }}</div>
  </div>
</template>
<script lang="ts" setup name="EspFileList">
  import { computed } from 'vue';
  import { Upload, message } from 'antdv-next';
  import { espFileUpload } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import {
    canPreview,
    downloadEspFile,
    fileColor,
    openEspFile,
  } from '../scheme-declaration-review/scheme-fill/components/file-display';

  /** 附件文件对象（与后端保存契约一致；uploading 为组件内部上传中标记） */
  type EspFileItem = { name: string; url?: string; objectKey?: string; size?: number; uploading?: boolean };

  const props = withDefaults(
    defineProps<{
      /** 文件列表（v-model:value） */
      value?: EspFileItem[];
      /** 接受的文件类型（上传选择器过滤） */
      accept?: string;
      /** 多选 */
      multiple?: boolean;
      /** 只读（无上传/删除，仅预览下载） */
      readonly?: boolean;
      /** 是否显示上传入口（默认 true；readonly 时强制隐藏） */
      uploadable?: boolean;
      /** 是否可删除（默认跟随非 readonly） */
      deletable?: boolean;
      /** 空列表占位文案（默认无） */
      emptyText?: string;
    }>(),
    {
      value: () => [],
      accept: '.pdf,.doc,.docx',
      multiple: true,
      readonly: false,
      uploadable: true,
      deletable: undefined,
      emptyText: '',
    },
  );

  const emit = defineEmits<{ (e: 'update:value', files: EspFileItem[]): void }>();

  const files = computed(() => props.value ?? []);
  const deletable = computed(() => props.deletable ?? !props.readonly);

  /** 上传：走真实上传接口，完成后回填文件对象（本地列表为浅拷贝，避免直接改 props） */
  async function handleUpload(file: File) {
    const entry: EspFileItem = { name: file.name, uploading: true };
    emit('update:value', [...files.value, entry]);
    try {
      const uploaded = await espFileUpload(file);
      Object.assign(entry, uploaded, { uploading: false });
      emit('update:value', [...files.value]);
    } catch (e) {
      emit('update:value', files.value.filter((f) => f !== entry));
      message.error(`「${file.name}」上传失败：${(e as Error)?.message || '请重试'}`);
    }
    return false;
  }

  function removeAt(index: number) {
    const next = [...files.value];
    next.splice(index, 1);
    emit('update:value', next);
  }

  /** 附件大小文案 */
  function sizeText(size?: number): string {
    if (!size) return '';
    return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  defineExpose({
    /** 是否有上传中的文件（提交前校验用） */
    hasUploading: () => files.value.some((f) => f.uploading),
    /** 取干净的保存契约（剥离 uploading 标记与未完成条目） */
    cleanValue: (): EspFileItem[] => files.value.filter((f) => !f.uploading).map(({ uploading: _u, ...rest }) => rest),
  });
</script>
