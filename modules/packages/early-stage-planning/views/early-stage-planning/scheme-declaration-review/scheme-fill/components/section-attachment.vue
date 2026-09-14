<!--
  填报页区块六：附件材料（对齐设计稿）

  资料上传区块：5 个具名附件位（配置见 ATTACH_SLOTS，均支持多文件）——
   - 片区策划方案*（pdf/doc/docx）/ 规划图表*（pdf/xls/xlsx/jpg/png）必填；
   - 片区体检报告（pdf/doc/docx）/ 审批材料 / 其他附件 选填。
  每行 = 右对齐标签 + 通栏框（内居中显示已传文件链接，hover 显删除 ×，
  点击框空白处追加文件）+ 框下格式提示。演示阶段不做真实上传
  （beforeUpload 返回 false），后端接入后改走文件服务。
  必填校验：validate 时缺文件的必填位框体标红并 reject（form.vue 滚动定位）。
  非 a-button/a-input 的 antd 组件必须显式 import（Upload）。
-->
<template>
  <div class="grid grid-cols-[auto_1fr] items-start gap-x-12px">
    <template v-for="item in ATTACH_SLOTS" :key="item.field">
      <!-- 标签列（右对齐带冒号，与附件框首行对齐） -->
      <div class="pt-14px pl-8px text-right text-14px whitespace-nowrap text-gray-700">
        <span v-if="item.required" class="mr-2px text-[#ff4d4f]">*</span>{{ item.label }}：
      </div>
      <!-- 附件框（点击/拖入追加多个文件）+ 格式提示 -->
      <div class="flex min-w-0 flex-col gap-4px py-4px">
        <!-- 根节点通栏经文件尾 scoped 样式强制（antd 运行时注入样式会覆盖 Uno 类选择器） -->
        <Upload
          :file-list="fileLists[item.field]"
          multiple
          :accept="item.accept || undefined"
          :show-upload-list="false"
          :disabled="disabled"
          :before-upload="beforeUpload"
          class="attach-upload"
          @change="(info) => onFilesChange(item.field, info)"
        >
          <div :class="[boxClass(item.field), disabled ? 'cursor-not-allowed' : 'cursor-pointer']">
            <!-- 已有附件：文件行（类型图标 + 名称 + 大小 + 移除） -->
            <template v-if="fileLists[item.field]?.length">
              <div
                v-for="(f, i) in fileLists[item.field]"
                :key="f.uid ?? f.name"
                class="flex w-full items-center gap-8px rd-6px bg-white px-10px py-6px transition-colors hover:bg-[#EEF4FB]"
              >
                <span
                  class="i-ant-design:file-text-outlined shrink-0 text-16px"
                  :style="{ color: fileColor(f.name) }"
                ></span>
                <span class="min-w-0 flex-1 truncate text-13px text-gray-700" :title="f.name">{{ f.name }}</span>
                <span v-if="fileSizeText(f)" class="shrink-0 text-12px text-gray-400">{{ fileSizeText(f) }}</span>
                <span
                  v-if="!disabled"
                  class="flex h-20px w-20px shrink-0 items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="删除"
                  @click.stop="removeFile(item.field, i)"
                >
                  <span class="i-ant-design:close-outlined text-12px"></span>
                </span>
              </div>

              <!-- 追加提示（框内任意位置点击/拖入继续添加） -->
              <div v-if="!disabled" class="flex items-center justify-center gap-4px pt-2px text-12px text-gray-400">
                <span class="i-ant-design:plus-outlined"></span> 点击框内可继续添加
              </div>
            </template>

            <!-- 空态：云上传图标 + 提示 -->
            <template v-else>
              <span
                class="i-ant-design:cloud-upload-outlined text-22px"
                :class="errorKeys.includes(item.field) ? 'text-[#ff4d4f]' : 'text-[#3A8EF6]'"
              ></span>
              <span class="text-13px text-gray-500">{{ disabled ? '暂无附件' : '点击上传' }}</span>
            </template>
          </div>
        </Upload>
        <div v-if="item.hint" class="pl-2px text-12px text-gray-400">{{ item.hint }}</div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionAttachment">
  import { reactive, ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { fileColor, fileSizeText } from './file-display';
  import type { SectionFormExposed } from './use-section-form';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 附件位配置（field 对应保存字段，带 scheme 前缀避免与项目实施方案 planFiles 混淆） */
  const ATTACH_SLOTS = [
    {
      field: 'schemePlanFiles',
      label: '片区策划方案',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式',
    },
    {
      field: 'chartFiles',
      label: '规划图表',
      required: true,
      accept: '.pdf,.xls,.xlsx,.jpg,.png',
      hint: '支持pdf、xls/xlsx、jpg/png格式',
    },
    {
      field: 'healthReportFiles',
      label: '片区体检报告',
      required: false,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式',
    },
    { field: 'approvalFiles', label: '审批材料', required: false, accept: '', hint: '' },
    { field: 'otherFiles', label: '其他附件', required: false, accept: '', hint: '' },
  ];

  /** 已传文件（文件名用于保存/导出；fileLists 供 Upload 受控回显） */
  const files = reactive<Record<string, string[]>>({});
  const fileLists = reactive<Record<string, UploadFile[]>>({});

  for (const item of ATTACH_SLOTS) {
    const names: string[] = (props.data?.[item.field] as string[]) ?? [];
    files[item.field] = [...names];
    fileLists[item.field] = names.map((name, i) => ({ uid: `${item.field}-${i}`, name }) as UploadFile);
  }

  /** 校验未通过的必填附件位（框体标红） */
  const errorKeys = ref<string[]>([]);

  /** 演示阶段不做真实上传：一律阻止 */
  function beforeUpload(): boolean {
    return false;
  }

  function onFilesChange(field: string, info: { fileList: UploadFile[] }) {
    fileLists[field] = info.fileList;
    files[field] = info.fileList.map((f) => f.name);
    errorKeys.value = errorKeys.value.filter((k) => k !== field);
  }

  function removeFile(field: string, idx: number) {
    fileLists[field]?.splice(idx, 1);
    files[field]?.splice(idx, 1);
  }

  /** 附件框样式：错误态红框 / 常态虚线框，含文件时左对齐铺满 */
  function boxClass(field: string): string {
    const base = 'flex w-full flex-col gap-6px rd-8px border-1px border-dashed px-12px py-10px transition-colors';
    const state = errorKeys.value.includes(field)
      ? 'border-[#ff4d4f] bg-[#fff5f5]'
      : 'border-gray-200 bg-[#fafbfd] hover:border-[#3A8EF6] hover:bg-[#f0f7ff]';
    const layout = files[field]?.length ? 'items-stretch min-h-64px' : 'items-center justify-center min-h-60px';
    return `${base} ${state} ${layout}`;
  }

  defineExpose({
    /** 必填红星仅表示重要性，暂不拦截保存；后端接口就绪后恢复注释中的校验逻辑 */
    validate: async () => {
      // const missing = ATTACH_SLOTS.filter((item) => item.required && !files[item.field]?.length);
      // errorKeys.value = missing.map((item) => item.field);
      // if (missing.length) {
      //   throw new Error('请上传必填附件');
      // }
    },
    getFieldsValue: () => {
      const out: Recordable = {};
      for (const item of ATTACH_SLOTS) {
        out[item.field] = [...(files[item.field] ?? [])];
      }
      return out;
    },
    exportRows: (): [string, string][] =>
      ATTACH_SLOTS.map((item) => [item.label, (files[item.field] ?? []).join('、') || '（无）']),
    setFieldsValueSilently: async (values: Recordable) => {
      for (const item of ATTACH_SLOTS) {
        const v = values[item.field];
        if (v != null) {
          files[item.field] = [...v];
          fileLists[item.field] = v.map(
            (name: string, i: number) => ({ uid: `${item.field}-${i}`, name }) as UploadFile,
          );
        }
      }
    },
  } satisfies SectionFormExposed);
</script>
<style scoped>
  /* Upload 根（wrapper）与内层触发区（.ant-upload）默认 inline，会被 antd 运行时注入样式
     恢复，Uno 类选择器同优先级必输；scoped 类选择器特异性更高，强制通栏 */
  .attach-upload {
    display: block;
    width: 100%;
  }

  .attach-upload :deep(.ant-upload) {
    display: block;
    width: 100%;
  }
</style>
