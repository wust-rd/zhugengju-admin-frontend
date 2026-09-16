<!--
  填报页区块三：片区功能策划（对齐设计稿）

  字段（均必填、通栏）：
   - 总体目标（≤200 字）；
   - 片区功能定位（可多选）：TOD/EOD/IOD/SOD/COD/HOD/POD/其他（对齐后端 esp 字典）；
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
          :show-upload-list="disabled ? { showRemoveIcon: false } : true"
          :before-upload="atlasBeforeUpload"
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
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionFunctionPlan">
  import { watch } from 'vue';
  import { Upload } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { useEspFileList } from './use-esp-file-list';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  /** 功能定位选项（对齐设计稿 + 后端 POD 补充项） */
  const FUNC_OPTIONS = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD', 'POD', '其他'].map((f) => ({
    label: f,
    value: f,
  }));

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
