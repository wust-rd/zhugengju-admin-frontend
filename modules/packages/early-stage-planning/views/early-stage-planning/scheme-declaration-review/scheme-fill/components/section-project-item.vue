<!--
  片区项目情况 · 单个项目表单（由 section-project-info.vue 按 tab 挂载，每个项目一个实例）

  - 初值取自 props.value（项目对象），保存时由父级经 expose 的统一接口取值/校验；
  - 字段对齐设计稿：项目名称* / 改造类别* / 实施主体 / 项目总投资估算（亿元）/
    项目资金来源（可多选）/ 本年度计划完成投资（亿元）/ 计划开工时间（月份）/
    计划竣工时间（月份）/ 主要建设内容* / 实施方案（附件，选填）；
  - 项目矢量图斑：先留空待建设（上传 dwg/shp/json、2000 坐标 + 地图绘制）。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 实施方案：附件上传（选填），拖拽上传区 + 自定义附件清单 -->
    <template #planFiles>
      <Upload.Dragger
        v-model:file-list="fileList"
        :show-upload-list="false"
        multiple
        :disabled="disabled"
        :before-upload="beforeUpload"
        @change="onPlanChange"
      >
        <div class="flex flex-col items-center justify-center">
          <span class="i-ant-design:cloud-upload-outlined text-30px text-[#3A8EF6]"></span>
          <div class="mt-8px text-14px text-gray-600">点击或拖拽文件到此处上传</div>
          <div class="mt-4px text-12px text-gray-400">支持多选，可上传实施方案等文档（演示：仅保留在页面内存）</div>
        </div>
      </Upload.Dragger>

      <!-- 已上传实施方案清单：文件图标 + 名称 + 大小 + 移除 -->
      <div v-if="fileList.length" class="mt-12px space-y-8px">
        <div
          v-for="f in fileList"
          :key="f.uid"
          class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-10px transition-colors hover:bg-[#EEF4FB]"
        >
          <span class="i-ant-design:file-text-outlined shrink-0 text-18px" :style="{ color: fileColor(f.name) }"></span>

          <span class="min-w-0 flex-1 truncate text-14px text-gray-700" :title="f.name">{{ f.name }}</span>

          <span v-if="fileSizeText(f)" class="shrink-0 text-12px text-gray-400">{{ fileSizeText(f) }}</span>

          <span
            v-if="!disabled"
            class="flex h-22px w-22px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="removeFile(f)"
          >
            <span class="i-ant-design:close-outlined"></span>
          </span>
        </div>
      </div>
    </template>
    <!-- 项目矢量图斑：先留空待建设 -->
    <template #mapSpot>
      <div
        class="flex h-88px flex-col items-center justify-center rd-8px text-13px text-gray-400"
        style="border: 1px dashed #d9d9d9; background: #fafafa"
      >
        <span>范围线上传（dwg / shp / json，2000 坐标）与地图绘制</span>
        <span class="mt-4px text-12px">待建设</span>
      </div>
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionProjectItem">
  import { ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { fileColor, fileSizeText } from './file-display';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ value?: Recordable; disabled?: boolean }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  /** 改造类别 / 资金来源选项（占位字典，接口就绪后改为字典接口） */
  const CATEGORY_OPTIONS = ['老旧小区改造', '老旧厂区改造', '老旧街区改造', '城中村改造', '其他'].map((c) => ({
    label: c,
    value: c,
  }));
  const FUND_OPTIONS = ['财政资金', '专项债券', '社会资本', '银行贷款', '其他'].map((f) => ({ label: f, value: f }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '项目名称',
      field: 'name',
      component: 'Input',
      componentProps: { maxlength: 150, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入项目名称' }],
    },
    {
      label: '改造类别',
      field: 'category',
      component: 'Select',
      componentProps: { options: CATEGORY_OPTIONS, placeholder: '请选择', allowClear: true },
      rules: [{ required: true, message: '请选择改造类别' }],
    },
    {
      label: '实施主体',
      field: 'implOrg',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入' },
    },
    {
      label: '项目总投资估算（亿元）',
      field: 'investEstimate',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, style: 'width: 100%', placeholder: '请输入' },
    },
    {
      label: '项目资金来源',
      field: 'fundSources',
      component: 'Select',
      componentProps: { options: FUND_OPTIONS, placeholder: '可多选', mode: 'multiple', allowClear: true },
    },
    {
      label: '本年度计划完成投资（亿元）',
      field: 'yearInvest',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, style: 'width: 100%', placeholder: '请输入' },
    },
    {
      label: '计划开工时间',
      field: 'startDate',
      component: 'DatePicker',
      componentProps: { picker: 'month', placeholder: '2026-10', valueFormat: 'YYYY-MM', style: 'width: 100%' },
    },
    {
      label: '计划竣工时间',
      field: 'endDate',
      component: 'DatePicker',
      componentProps: { picker: 'month', placeholder: '请输入', valueFormat: 'YYYY-MM', style: 'width: 100%' },
    },
    {
      label: '主要建设内容',
      field: 'content',
      component: 'InputTextArea',
      colProps: FULL_COL,
      componentProps: { maxlength: 500, rows: 4, showCount: true, placeholder: '请输入主要建设内容' },
      rules: [{ required: true, message: '请输入主要建设内容' }],
    },
    {
      label: '实施方案',
      field: 'planFiles',
      component: 'Upload',
      slot: 'planFiles',
      colProps: FULL_COL,
    },
    {
      label: '项目矢量图斑',
      field: 'mapSpot',
      component: 'Input',
      slot: 'mapSpot',
      colProps: FULL_COL,
    },
  ];

  const { registerForm, exposed } = useSectionForm({
    data: props.value,
    disabled: props.disabled,
    layout: 'vertical',
    rowProps: { gutter: 24 },
    baseColProps: { md: 24, lg: 12 },
    schemas: inputFormSchemas,
  });

  /** 实施方案附件（演示阶段不做真实上传） */
  const fileList = ref<UploadFile[]>(
    (props.value?.planFiles ?? []).map((name: string, i: number) => ({ uid: `plan-${i}`, name }) as UploadFile),
  );

  function beforeUpload(): boolean {
    return false;
  }

  function onPlanChange(info: { fileList: UploadFile[] }) {
    fileList.value = info.fileList;
    exposed.setFieldsValueSilently({ planFiles: info.fileList.map((f) => f.name) });
  }

  /** 移除某个附件并同步表单值 */
  function removeFile(f: UploadFile) {
    fileList.value = fileList.value.filter((item) => item.uid !== f.uid);
    exposed.setFieldsValueSilently({ planFiles: fileList.value.map((item) => item.name) });
  }

  defineExpose(exposed);
</script>
