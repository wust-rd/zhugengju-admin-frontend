<!--
  填报页区块三：片区功能策划（对齐设计稿）

  字段（均必填、通栏）：
   - 总体目标（≤200 字）；
   - 片区功能定位（可多选）：后端字典 area_func_type 的值（TOD/COD…，下拉显示
     编码本身，经 shared/use-scheme-dict 拉取，失败回退内置清单）；
   - 功能策划：多行文本；
   - 策划图册：图片上传（jpg/png，最多 5 张，picture-card 缩略格），
     经 schema slot 挂进 BasicForm（必填校验 + 取值/导出统一接口）；
     已对接后端（modules/esp）：真实上传 MinIO，值为文件对象数组（use-esp-file-list）。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 策划图册：缩略卡上传（≤5 张，真实上传），值同步进表单字段 atlas -->
    <template #atlas>
      <div>
        <Upload
          :file-list="atlasFileList"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="5"
          :disabled="disabled"
          :show-upload-list="{ showRemoveIcon: !disabled, showDownloadIcon: true }"
          :before-upload="atlasBeforeUpload"
          @preview="onPreview"
          @download="onDownload"
          @change="onAtlasChange"
        >
          <div v-if="atlasFileList.length < 5" class="flex flex-col items-center justify-center gap-2px text-gray-400">
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片，支持jpg、png格式，最多5张</div>
      </div>
    </template>
  </BasicForm>
  <!-- 缩略图点击预览弹层（替代 antd 新开页面默认行为） -->
  <ImagePreview :url="previewUrl" @close="previewUrl = ''" />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionFunctionPlan">
  import { ref, watch } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import ImagePreview from './image-preview.vue';
  import { downloadEspFile } from './file-display';
  import { useEspFileList } from './use-esp-file-list';
  import { useSectionForm } from './use-section-form';
  import { useSchemeDict } from '../../shared/use-scheme-dict';

  /** 缩略图点击预览：拦截 Upload 默认新开页面，转弹窗展示 */
  const previewUrl = ref('');
  function onPreview(file: UploadFile) {
    previewUrl.value = (file.url as string) || '';
  }

  /** 缩略卡下载图标（antd 内置，仅 done 态显示）：统一走 blob 下载，跨域回退新窗打开 */
  function onDownload(file: UploadFile) {
    void downloadEspFile(file);
  }

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  /** 功能定位选项（后端字典 area_func_type 的值，失败回退内置清单） */
  const { funcTypeOptions } = useSchemeDict();

  const inputFormSchemas: FormSchema[] = [
    {
      label: '总体目标',
      field: 'overallGoal',
      component: 'InputTextArea',
      colProps: FULL_COL,
      componentProps: { maxlength: 200, rows: 3, showCount: true, placeholder: '不超过200字' },
      rules: [{ required: true, message: '请输入总体目标' }],
    },
    {
      label: '片区功能定位（可多选）',
      field: 'funcTypes',
      component: 'Select',
      colProps: FULL_COL,
      // 函数式 componentProps：字典后到也能刷新选项（FormItem computed 依赖）
      componentProps: () => ({
        options: funcTypeOptions.value,
        placeholder: '请选择（可多选）',
        mode: 'multiple',
        allowClear: true,
        maxTagCount: 'responsive',
      }),
      rules: [{ required: true, type: 'array', message: '请选择片区功能定位' }],
    },
    {
      label: '功能策划',
      field: 'funcPlan',
      component: 'InputTextArea',
      colProps: FULL_COL,
      componentProps: { maxlength: 500, rows: 4, showCount: true, placeholder: '请输入功能策划' },
      rules: [{ required: true, message: '请输入功能策划' }],
    },
    {
      label: '策划图册',
      field: 'atlas',
      component: 'Upload',
      slot: 'atlas',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请上传策划图册' }],
    },
  ];

  const { registerForm, exposed } = useSectionForm({
    data: props.data,
    disabled: props.disabled,
    layout: 'vertical',
    rowProps: { gutter: 24 },
    baseColProps: { md: 24, lg: 12 },
    schemas: inputFormSchemas,
  });

  /** 策划图册上传位（真实上传 MinIO；初值=回显文件对象数组） */
  const {
    fileList: atlasFileList,
    onChange: onAtlasChange,
    beforeUpload: atlasBeforeUpload,
    espFiles: atlasFiles,
  } = useEspFileList(props.data?.atlas);

  /** 上传列表任何变化 → 文件对象数组同步进表单字段 atlas（参与必填校验/保存/导出） */
  watch(atlasFileList, () => exposed.setFieldsValueSilently({ atlas: atlasFiles() }), { deep: true });

  defineExpose(exposed);
</script>
