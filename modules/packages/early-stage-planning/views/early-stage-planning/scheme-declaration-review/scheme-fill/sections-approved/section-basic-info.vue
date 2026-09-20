<!--
  填报页区块一 · 已批准片区版（Tab① 已批准片区填报，isApprove=1 专用）

  与待审查片区版的唯一字段差异：本版含「片区批次」（第一批/第二批，必填），
  待审查版为「申报年份」（见 ../sections-reviewing/section-basic-info.vue）；
  其余字段完全一致，为方便对照阅读刻意两份独立维护，不走复用分支。

  布局：垂直标签（label 在上）+ 两列栅格，概况/图片/范围/范围线通栏。
  字段：片区名称* / 片区批次* / 行政区* / 片区规模（公顷）* / 起止时间（年月区间）/
  统筹主体 / 片区概况*（150字）/ 片区概况图片（1张）/ 片区范围*（东至西至…）/
  片区范围线（GeoField：上传解析/地图绘制，WKT 存储）。
  起止时间：RangePicker 月份区间，经 fieldMapToTime 与 startTime/endTime 两个
  保存字段互转（回显自动组装区间，保存自动拆两键）。
  图片经 use-esp-file-list 真实上传 MinIO，值为文件对象数组；范围线值经
  GeoField 双向换算为 WKT 字符串，两值经下方 defineExpose 覆写并入取值
  （导出不落原始 WKT）。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 片区概况图片：缩略卡上传（真实上传），值同步进表单字段 overviewImages -->
    <template #overviewImages>
      <div>
        <Upload
          :file-list="imageFileList"
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
          multiple
          :max-count="1"
          :disabled="disabled"
          :show-upload-list="disabled ? { showRemoveIcon: false } : true"
          :before-upload="imageBeforeUpload"
          @preview="onPreview"
          @change="onImagesChange"
        >
          <div v-if="!imageFileList.length" class="flex flex-col items-center justify-center gap-2px text-gray-400">
            <span class="text-20px leading-none">+</span>
            <span class="text-12px">上传图片</span>
          </div>
        </Upload>
        <div class="mt-4px text-12px text-gray-400">上传图片（1张），支持常见图片格式</div>
      </div>
    </template>
    <!-- 片区范围线：GeoField（上传解析/地图绘制，WKT 存储；查看态只读） -->
    <template #scopeLine>
      <GeoField v-model:value="scopeLine" :disabled="disabled" />
    </template>
  </BasicForm>
  <!-- 缩略图点击预览弹层（替代 antd 新开页面默认行为） -->
  <ImagePreview :url="previewUrl" @close="previewUrl = ''" />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillApprovedSectionBasicInfo">
  import { ref, watch } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import GeoField from '../components/geo-field.vue';
  import ImagePreview from '../components/image-preview.vue';
  import { useEspFileList } from '../components/use-esp-file-list';
  import { useSectionForm } from '../components/use-section-form';

  /** 缩略图点击预览：拦截 Upload 默认新开页面，转弹窗展示 */
  const previewUrl = ref('');
  function onPreview(file: UploadFile) {
    previewUrl.value = (file.url as string) || '';
  }

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
      label: '起止时间',
      field: 'startTimeRange',
      component: 'RangePicker',
      componentProps: { picker: 'month', style: 'width: 100%' },
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
      rules: [{ required: true, type: 'array', message: '请上传片区概况图片' }],
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
    // 起止时间区间 ↔ startTime/endTime 两个保存字段（回显组装/保存拆分均由表单内核完成）
    fieldMapToTime: [['startTimeRange', ['startTime', 'endTime'], 'YYYY-MM']],
  });

  /** 概况图片上传位（真实上传 MinIO；初值=回显文件对象数组） */
  const {
    fileList: imageFileList,
    onChange: onImagesChange,
    beforeUpload: imageBeforeUpload,
    espFiles: imageFiles,
  } = useEspFileList(props.data?.overviewImages);

  /** 上传列表任何变化（antd 入列/上传回填/移除）→ 文件对象数组同步进表单字段 overviewImages */
  watch(imageFileList, () => exposed.setFieldsValueSilently({ overviewImages: imageFiles() }), { deep: true });

  /** 片区范围线：WKT 字符串（GeoField 维护，保存时经下方取值并入） */
  const scopeLine = ref<string | null | undefined>(props.data?.scopeLine as string | null | undefined);

  /**
   * 覆写取值/导出：
   *  - getFieldsValue 去掉 startTimeRange 中间键（fieldMapToTime 已拆出 startTime/endTime）；
   *  - 范围线并入保存值；导出不落原始 WKT（过长），以已绘制标识；起止时间两键拼接展示。
   */
  defineExpose({
    ...exposed,
    getFieldsValue: () => {
      const { startTimeRange: _range, startTime, endTime, ...rest } = exposed.getFieldsValue();
      return {
        ...rest,
        startTime,
        endTime,
        scopeLine: scopeLine.value,
      };
    },
    exportRows: (): [string, string][] => {
      const { startTime, endTime } = exposed.getFieldsValue();
      const rangeText = [startTime, endTime].filter(Boolean).join(' ~ ');
      const rows: [string, string][] = [];
      for (const [label, value] of exposed.exportRows()) {
        if (label === '起止时间') continue;
        // 起止时间行插在统筹主体（原起始时间的相邻位）之前
        if (label === '统筹主体' && rangeText) {
          rows.push(['起止时间', rangeText]);
        }
        rows.push([label, label === '片区范围线' ? (scopeLine.value ? '已绘制' : '') : value]);
      }
      return rows;
    },
  });
</script>
