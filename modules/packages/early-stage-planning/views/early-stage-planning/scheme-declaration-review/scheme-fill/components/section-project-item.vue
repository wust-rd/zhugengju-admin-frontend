<!--
  片区项目情况 · 单个项目表单（由 section-project-info.vue 按 tab 挂载，每个项目一个实例）

  - 初值取自 props.value（项目对象），保存时由父级经 expose 的统一接口取值/校验；
  - 字段对齐设计稿：项目名称* / 改造类别* / 实施主体 / 项目总投资估算（亿元）/
    项目资金来源（可多选，选项=片区资金来源 14 项清单）/ 本年度计划完成投资（亿元）/
    计划开工时间（月份）/ 计划竣工时间（月份）/ 主要建设内容* / 实施方案（附件，选填）；
  - 已对接后端（modules/esp）：实施方案真实上传 MinIO（use-esp-file-list，
    值=文件对象数组，已传文件名带直链）；项目矢量图斑走 GeoField
    （上传解析/地图绘制，值为自包含 TopoJSON 字符串，经下方取值并入；
    导出不落原始 TopoJSON，以已绘制标识）。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 实施方案：附件上传（选填），拖拽上传区 + 自定义附件清单 -->
    <template #planFiles>
      <Upload.Dragger
        :file-list="planFileList"
        :show-upload-list="false"
        multiple
        :disabled="disabled"
        :before-upload="planBeforeUpload"
        @change="onPlanChange"
      >
        <div class="flex flex-col items-center justify-center">
          <span class="i-ant-design:cloud-upload-outlined text-30px text-[#3A8EF6]"></span>
          <div class="mt-8px text-14px text-gray-600">点击或拖拽文件到此处上传</div>
          <div class="mt-4px text-12px text-gray-400">支持多选，可上传实施方案等文档</div>
        </div>
      </Upload.Dragger>

      <!-- 已上传实施方案清单：文件图标 + 名称 + 大小 + 移除 -->
      <div v-if="planFileList.length" class="mt-12px space-y-8px">
        <div
          v-for="f in planFileList"
          :key="f.uid"
          class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-10px transition-colors hover:bg-[#EEF4FB]"
        >
          <span class="i-ant-design:file-text-outlined shrink-0 text-18px" :style="{ color: fileColor(f.name) }"></span>

          <!-- 有直链的文件（已上传）点击新窗打开（pdf/word 即外链预览），未完成的仅展示名称 -->
          <a
            v-if="f.url"
            class="min-w-0 flex-1 truncate text-14px text-gray-700 hover:text-[#3A8EF6]!"
            :title="f.name"
            :href="f.url"
            target="_blank"
            rel="noopener"
          >
            {{ f.name }}
          </a>
          <span v-else class="min-w-0 flex-1 truncate text-14px text-gray-700" :title="f.name">{{ f.name }}</span>

          <span v-if="fileSizeText(f)" class="shrink-0 text-12px text-gray-400">{{ fileSizeText(f) }}</span>

          <!-- 下载（查看模式也可用） -->
          <span
            v-if="f.url"
            class="flex h-22px w-22px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-blue-50 hover:text-[#3A8EF6]"
            title="下载"
            @click.stop="downloadEspFile(f)"
          >
            <span class="i-ant-design:download-outlined"></span>
          </span>

          <span
            v-if="!disabled"
            class="flex h-22px w-22px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="removePlanFile(f)"
          >
            <span class="i-ant-design:close-outlined"></span>
          </span>
        </div>
      </div>
    </template>
    <!-- 项目矢量图斑：GeoField（上传解析/地图绘制，TopoJSON 存储；查看态只读） -->
    <template #mapSpot>
      <GeoField v-model:value="mapSpot" :disabled="disabled" />
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionProjectItem">
  import { ref, watch } from 'vue';
  import { Upload } from 'antdv-next';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import GeoField from './geo-field.vue';
  import { fileColor, fileSizeText, downloadEspFile } from './file-display';
  import { FUND_SOURCES } from './fund-sources';
  import { useEspFileList, type EspUploadFile } from './use-esp-file-list';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ value?: Recordable; disabled?: boolean }>();
  const emit = defineEmits<{
    /** 项目名称输入实时回传（父级 tab 标题展示用） */
    (e: 'nameChange', name: string): void;
  }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  /** 改造类别（对齐设计稿 5 类，去除「其他」） */
  const CATEGORY_OPTIONS = ['既有建筑改造', '老旧小区改造', '老旧街区改造', '老旧厂区改造', '城中村改造'].map((c) => ({
    label: c,
    value: c,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '项目名称',
      field: 'name',
      component: 'Input',
      componentProps: {
        maxlength: 150,
        placeholder: '请输入',
        // 输入实时上抛：父级 tab 标题随名称联动展示
        onChange: (e: unknown) =>
          emit('nameChange', String((e as { target?: { value?: string } })?.target?.value ?? '')),
      },
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
      // 选项与片区资金方案的圈选清单一致（fund-sources.ts 共用 14 项）
      componentProps: {
        options: FUND_SOURCES.map((s) => ({ label: s, value: s })),
        placeholder: '可多选',
        mode: 'multiple',
        allowClear: true,
      },
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

  /** 实施方案附件上传位（真实上传 MinIO；初值=回显文件对象数组） */
  const {
    fileList: planFileList,
    onChange: onPlanChange,
    beforeUpload: planBeforeUpload,
    remove: removePlanFile,
    espFiles: planFiles,
  } = useEspFileList(props.value?.planFiles);

  /** 上传列表任何变化（antd 入列/上传回填/自绘移除）→ 文件对象数组同步进表单字段 planFiles */
  watch(planFileList, () => exposed.setFieldsValueSilently({ planFiles: planFiles() }), { deep: true });

  /** 项目矢量图斑：自包含 TopoJSON 字符串（GeoField 维护，保存时经下方取值并入） */
  const mapSpot = ref<string | null | undefined>(props.value?.mapSpot as string | null | undefined);

  /** 矢量图斑不在 schema 内（slot 渲染 GeoField），覆写取值并入；导出不落原始 TopoJSON（过长），以已绘制标识 */
  defineExpose({
    ...exposed,
    getFieldsValue: () => ({
      ...exposed.getFieldsValue(),
      mapSpot: mapSpot.value,
    }),
    exportRows: (): [string, string][] =>
      exposed
        .exportRows()
        .map(([label, value]) => (label === '项目矢量图斑' ? [label, mapSpot.value ? '已绘制' : ''] : [label, value])),
  });
</script>
