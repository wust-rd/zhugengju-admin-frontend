<!--
  填报页区块三：片区功能策划（对齐设计稿）

  字段（均必填、通栏）：
   - 片区功能定位（可多选）：TOD/EOD/IOD/SOD/COD/HOD/其他；
   - 功能策划：多行文本；
   - 策划图册：图片上传（jpg/png，最多 5 张，picture-card 缩略格），
     经 schema slot 挂进 BasicForm（必填校验 + 取值/导出统一接口），
     beforeUpload 返回 false 不做真实上传，后端接入后改走文件服务。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 策划图册：缩略卡上传（≤5 张），文件名数组同步进表单字段 atlas -->
    <template #atlas>
      <div>
        <Upload
          :file-list="fileList"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="5"
          :disabled="disabled"
          :before-upload="beforeUpload"
          @change="onAtlasChange"
        >
          <div v-if="fileList.length < 5" class="flex flex-col items-center justify-center gap-2px text-gray-400">
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片，支持jpg、png格式，最多5张（演示：仅保留在页面内存）</div>
      </div>
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionFunctionPlan">
  import { ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  /** 功能定位选项（对齐设计稿） */
  const FUNC_OPTIONS = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD', '其他'].map((f) => ({ label: f, value: f }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '片区功能定位（可多选）',
      field: 'funcTypes',
      component: 'Select',
      colProps: FULL_COL,
      componentProps: {
        options: FUNC_OPTIONS,
        placeholder: '请选择（可多选）',
        mode: 'multiple',
        allowClear: true,
        maxTagCount: 'responsive',
      },
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

  /** 已选图册（演示阶段不做真实上传） */
  const fileList = ref<UploadFile[]>(
    (props.data?.atlas ?? []).map((name: string, i: number) => ({ uid: `atlas-${i}`, name }) as UploadFile),
  );

  /** 演示阶段不做真实上传：一律阻止（类型/张数限制交给 accept + maxCount） */
  function beforeUpload(): boolean {
    return false;
  }

  /** 上传列表变化 → 文件名数组同步进表单字段 atlas（参与必填校验/保存/导出） */
  function onAtlasChange(info: { fileList: UploadFile[] }) {
    fileList.value = info.fileList;
    exposed.setFieldsValueSilently({ atlas: info.fileList.map((f) => f.name) });
  }

  defineExpose(exposed);
</script>
