<!--
  填报页区块一：片区基本信息（对齐设计稿）

  布局：垂直标签（label 在上）+ 两列栅格，概况/图片/范围/范围线通栏。
  字段：片区名称* / 片区批次* / 行政区* / 片区规模（公顷）* / 起始时间（月份）/
  统筹主体 / 片区概况*（150字）/ 片区概况图片*（1-3张）/ 片区范围*（东至西至…）/
  片区范围线（GeoDataSection：上传 shp/dwg 解析渲染 + 地图绘制编辑）。
  图片上传经 schema slot 挂进 BasicForm（参与必填校验与取值/导出）；
  beforeUpload 返回 false 阻止真实上传，文件仅留在页面内存，后端接入后改走文件服务。
  片区范围线同样经 slot 挂入，GeoJSON 与源文件名由组件维护，
  保存/导出经下方 defineExpose 覆写并入（导出不落原始 GeoJSON）。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 片区概况图片：缩略卡上传（1-3 张），值同步进表单字段 overviewImages -->
    <template #overviewImages>
      <div>
        <Upload
          :file-list="fileList"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="3"
          :disabled="disabled"
          :before-upload="beforeUpload"
          @change="onImagesChange"
        >
          <div v-if="fileList.length < 3" class="flex flex-col items-center justify-center gap-2px text-gray-400">
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片（1-3张），支持常见图片格式（演示：仅保留在页面内存）</div>
      </div>
    </template>
    <!-- 片区范围线：GeoDataSection（上传 shp/dwg 解析渲染 + 地图绘制编辑；查看态只读） -->
    <template #scopeLine>
      <GeoDataSection
        v-model:geo-json="scopeLineGeoJson"
        v-model:file-name="scopeLineFileName"
        :parse-file="parseGeoFile"
        :geometry-types="['polygon']"
        :disabled="disabled"
      />
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionBasicInfo">
  import { ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { GeoDataSection } from '@jeesite/shared/components/geo-data-section';
  import { parseGeoFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 下拉选项（与列表页筛选一致；接口就绪后改为字典接口） */
  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));
  const BATCH_OPTIONS = ['第一批', '第二批'].map((b) => ({ label: b, value: b }));

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  const inputFormSchemas: FormSchema[] = [
    {
      label: '片区名称',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入片区名称' }],
    },
    {
      label: '片区批次',
      field: 'batch',
      component: 'Select',
      componentProps: { options: BATCH_OPTIONS, placeholder: '请选择', allowClear: true },
      rules: [{ required: true, message: '请选择片区批次' }],
    },
    {
      label: '行政区',
      field: 'district',
      component: 'Select',
      componentProps: { options: DISTRICT_OPTIONS, placeholder: '请选择', allowClear: true },
      rules: [{ required: true, message: '请选择行政区' }],
    },
    {
      label: '片区规模（公顷）',
      field: 'areaHa',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 1, style: 'width: 100%', placeholder: '请输入' },
      rules: [{ required: true, message: '请输入片区规模' }],
    },
    {
      label: '起始时间',
      field: 'startTime',
      component: 'DatePicker',
      componentProps: { picker: 'month', placeholder: '具体月份', valueFormat: 'YYYY-MM', style: 'width: 100%' },
    },
    {
      label: '统筹主体',
      field: 'overallOrg',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入' },
    },
    {
      label: '片区概况',
      field: 'overview',
      component: 'InputTextArea',
      colProps: FULL_COL,
      componentProps: { maxlength: 150, rows: 3, showCount: true, placeholder: '不超过150字' },
      rules: [{ required: true, message: '请输入片区概况' }],
    },
    {
      label: '片区概况图片',
      field: 'overviewImages',
      component: 'Upload',
      slot: 'overviewImages',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请上传片区概况图片（1-3张）' }],
    },
    {
      label: '片区范围',
      field: 'scopeDesc',
      component: 'InputTextArea',
      colProps: FULL_COL,
      componentProps: {
        maxlength: 300,
        rows: 3,
        placeholder: '东至xxx，西至xxx，北至xxx，南至xxx。',
      },
      rules: [{ required: true, message: '请输入片区范围' }],
    },
    {
      label: '片区范围线',
      field: 'scopeLine',
      component: 'Input',
      slot: 'scopeLine',
      colProps: FULL_COL,
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

  /** 已选图片（beforeUpload 返回 false，不做真实上传） */
  const fileList = ref<UploadFile[]>(
    (props.data?.overviewImages ?? []).map((name: string, i: number) => ({ uid: `img-${i}`, name }) as UploadFile),
  );

  /** 演示阶段不做真实上传：一律阻止（图片类型限制交给 accept + maxCount） */
  function beforeUpload(): boolean {
    return false;
  }

  /** 上传列表变化 → 文件名数组同步进表单字段 overviewImages（参与必填校验/保存/导出） */
  function onImagesChange(info: { fileList: UploadFile[] }) {
    fileList.value = info.fileList;
    exposed.setFieldsValueSilently({ overviewImages: info.fileList.map((f) => f.name) });
  }

  /** 片区范围线：GeoJSON 字符串 + 源文件名（GeoDataSection 维护；保存时经下方取值并入） */
  const scopeLineGeoJson = ref<string | undefined>(props.data?.scopeLine as string | undefined);
  const scopeLineFileName = ref<string | undefined>(props.data?.scopeLineFileName as string | undefined);

  /** 范围线两值不在 schema 内（不渲染表单项），覆写取值并入；导出不落原始 GeoJSON（过长），以源文件名/已绘制标识 */
  defineExpose({
    ...exposed,
    getFieldsValue: () => ({
      ...exposed.getFieldsValue(),
      scopeLine: scopeLineGeoJson.value,
      scopeLineFileName: scopeLineFileName.value,
    }),
    exportRows: (): [string, string][] =>
      exposed
        .exportRows()
        .map(([label, value]) =>
          label === '片区范围线'
            ? [label, scopeLineFileName.value || (scopeLineGeoJson.value ? '已绘制' : '')]
            : [label, value],
        ),
  });
</script>
