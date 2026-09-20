<!--
  填报页区块二：片区体检情况（对齐设计稿）

  三个清单字段（均必填，一行一条、可添加/删除多行）：
   - 问题整治清单 problemList / 发展机遇清单 opportunityList / 更新诉求清单 demandList。
  清单经 schema slot（ListEditor 行编辑器）挂进 BasicForm：
   - 输入即时把「去空行」后的数组同步回 formModel（setFieldsValueSilently），
     必填校验（type: array）与保存取值、Excel 导出复用统一接口。
  每个清单下方另有图片上传位（jpg/png，≤5 张，真实上传 MinIO），值为并列的
  文件对象数组字段 problemImages / opportunityImages / demandImages（不在
  schema 内，经下方 defineExpose 覆写并入取值；导出按清单各追加一行文件名）。
-->
<template>
  <BasicForm @register="registerForm">
    <template #problemList>
      <div class="flex flex-col gap-8px">
        <ListEditor v-model:value="problemRows" :disabled="disabled" @change="(v) => syncList('problemList', v)" />
        <Upload
          :file-list="problemImages.fileList.value"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="5"
          :disabled="disabled"
          :show-upload-list="{ showRemoveIcon: !disabled, showDownloadIcon: true }"
          :before-upload="problemImages.beforeUpload"
          @preview="onPreview"
          @download="onDownload"
          @change="problemImages.onChange"
        >
          <div
            v-if="problemImages.fileList.value.length < 5"
            class="flex flex-col items-center justify-center gap-2px text-gray-400"
          >
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="text-12px text-gray-400">上传图片（最多5张），支持jpg、png格式</div>
      </div>
    </template>
    <template #opportunityList>
      <div class="flex flex-col gap-8px">
        <ListEditor
          v-model:value="opportunityRows"
          :disabled="disabled"
          @change="(v) => syncList('opportunityList', v)"
        />
        <Upload
          :file-list="opportunityImages.fileList.value"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="5"
          :disabled="disabled"
          :show-upload-list="{ showRemoveIcon: !disabled, showDownloadIcon: true }"
          :before-upload="opportunityImages.beforeUpload"
          @preview="onPreview"
          @download="onDownload"
          @change="opportunityImages.onChange"
        >
          <div
            v-if="opportunityImages.fileList.value.length < 5"
            class="flex flex-col items-center justify-center gap-2px text-gray-400"
          >
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="text-12px text-gray-400">上传图片（最多5张），支持jpg、png格式</div>
      </div>
    </template>
    <template #demandList>
      <div class="flex flex-col gap-8px">
        <ListEditor v-model:value="demandRows" :disabled="disabled" @change="(v) => syncList('demandList', v)" />
        <Upload
          :file-list="demandImages.fileList.value"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="5"
          :disabled="disabled"
          :show-upload-list="{ showRemoveIcon: !disabled, showDownloadIcon: true }"
          :before-upload="demandImages.beforeUpload"
          @preview="onPreview"
          @download="onDownload"
          @change="demandImages.onChange"
        >
          <div
            v-if="demandImages.fileList.value.length < 5"
            class="flex flex-col items-center justify-center gap-2px text-gray-400"
          >
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="text-12px text-gray-400">上传图片（最多5张），支持jpg、png格式</div>
      </div>
    </template>
  </BasicForm>
  <!-- 缩略图点击预览弹层（替代 antd 新开页面默认行为） -->
  <ImagePreview :url="previewUrl" @close="previewUrl = ''" />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionHealthCheck">
  import { ref, watch, type Ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import ImagePreview from './image-preview.vue';
  import { downloadEspFile } from './file-display';
  import { useEspFileList, type EspUploadFile } from './use-esp-file-list';
  import { useSectionForm } from './use-section-form';
  import ListEditor from './list-editor.vue';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 缩略图点击预览：拦截 Upload 默认新开页面，转弹窗展示 */
  const previewUrl = ref('');
  function onPreview(file: UploadFile) {
    previewUrl.value = (file.url as string) || '';
  }

  /** 缩略卡下载图标（antd 内置，仅 done 态显示）：统一走 blob 下载，跨域回退新窗打开 */
  function onDownload(file: UploadFile) {
    void downloadEspFile(file);
  }

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  const inputFormSchemas: FormSchema[] = [
    {
      label: '问题整治清单',
      field: 'problemList',
      component: 'Input',
      slot: 'problemList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加问题整治清单' }],
    },
    {
      label: '发展机遇清单',
      field: 'opportunityList',
      component: 'Input',
      slot: 'opportunityList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加发展机遇清单' }],
    },
    {
      label: '更新诉求清单',
      field: 'demandList',
      component: 'Input',
      slot: 'demandList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加更新诉求清单' }],
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

  /** 行初值：记录里有数组用之，否则按一行空行展示 */
  function initRows(v: unknown): string[] {
    const arr = Array.isArray(v) ? v.map(String) : [];
    return arr.length ? arr : [''];
  }

  const problemRows = ref(initRows(props.data?.problemList));
  const opportunityRows = ref(initRows(props.data?.opportunityList));
  const demandRows = ref(initRows(props.data?.demandList));

  /** 行编辑回调：去空行后同步进 formModel（空数组会触发必填校验失败） */
  function syncList(field: string, rows: string[]) {
    exposed.setFieldsValueSilently({ [field]: rows.map((r) => String(r).trim()).filter(Boolean) });
  }

  /** 三个清单的图片上传位（真实上传 MinIO；初值=回显文件对象数组） */
  const problemImages = useEspFileList(props.data?.problemImages);
  const opportunityImages = useEspFileList(props.data?.opportunityImages);
  const demandImages = useEspFileList(props.data?.demandImages);

  /** 图片列表任何变化（antd 入列/上传回填/移除）→ 文件对象数组同步进 formModel */
  function watchImages(files: ReturnType<typeof useEspFileList>, field: string) {
    watch(files.fileList as Ref<EspUploadFile[]>, () => exposed.setFieldsValueSilently({ [field]: files.espFiles() }), {
      deep: true,
    });
  }
  watchImages(problemImages, 'problemImages');
  watchImages(opportunityImages, 'opportunityImages');
  watchImages(demandImages, 'demandImages');

  /** 图片字段不在 schema 内（清单 slot 内渲染），覆写取值并入；导出每个清单各追加一行图片文件名 */
  defineExpose({
    ...exposed,
    getFieldsValue: () => ({
      ...exposed.getFieldsValue(),
      problemImages: problemImages.espFiles(),
      opportunityImages: opportunityImages.espFiles(),
      demandImages: demandImages.espFiles(),
    }),
    exportRows: (): [string, string][] => {
      const rows: [string, string][] = [];
      const imageLine = (files: ReturnType<typeof useEspFileList>): string =>
        (files.fileList.value as EspUploadFile[]).map((f) => f.name).join('、');
      for (const [label, value] of exposed.exportRows()) {
        rows.push([label, value]);
        if (label === '问题整治清单') rows.push(['　└ 图片', imageLine(problemImages) || '（无）']);
        if (label === '发展机遇清单') rows.push(['　└ 图片', imageLine(opportunityImages) || '（无）']);
        if (label === '更新诉求清单') rows.push(['　└ 图片', imageLine(demandImages) || '（无）']);
      }
      return rows;
    },
  });
</script>
