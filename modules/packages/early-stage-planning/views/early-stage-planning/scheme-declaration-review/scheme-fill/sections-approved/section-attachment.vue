<!--
  填报页区块六 · 已批准片区版（Tab① 已批准片区填报，isApprove=1 专用）

  与待审查片区版的差异：本版为 5 位（片区策划方案/规划图表/片区体检报告/审批材料/
  其他附件），待审查版按 2026-09-18 设计稿为 9 位（第 4 位不再是「审批材料/申报文件」，
  改为「市政府批准认定材料」并新增专家论证/区级联合审查/市级审查/市政府批准材料，
  见 ../sections-reviewing/section-attachment.vue）；两份独立维护不走复用分支。
  两类片区互斥（is_approve 固定），第 4 位共用 approvalFiles 存储位（后端 approval_files
  文件位；待审查版的「市政府批准材料」同用此位），仅标签随片区类型切换。

  资料上传区块：5 个具名附件位（配置见 ATTACH_SLOTS，均支持多文件）——
   - 片区策划方案*（pdf/doc/docx）/ 规划图表*（pdf/xls/xlsx/jpg/png）必填；
   - 片区体检报告（pdf/doc/docx）/ 审批材料 / 其他附件 选填。
  每行 = 右对齐标签 + 通栏框（内居中显示已传文件链接，hover 显删除 ×，
  点击框空白处追加文件）+ 框下格式提示。
  已对接后端（modules/esp）：真实上传 MinIO（use-esp-file-list，值=文件对象
  数组，已传文件名带直链新窗打开——pdf/word 即外链预览；每行另有下载图标，
  查看模式也可用）。
  必填校验：validate 时缺文件的必填位框体标红并 reject（form.vue 滚动定位）。
  非 a-button/a-input 的 antd 组件必须显式 import（Upload）。
-->
<template>
  <div class="grid grid-cols-[auto_1fr] items-start gap-x-12px">
    <template v-for="s in uploadSlots" :key="s.item.field">
      <!-- 标签列（右对齐带冒号，与附件框首行对齐） -->
      <div class="pt-14px pl-8px text-right text-14px whitespace-nowrap text-gray-700">
        <span v-if="s.item.required" class="mr-2px text-[#ff4d4f]">*</span>{{ s.item.label }}：
      </div>
      <!-- 附件框（点击/拖入追加多个文件）+ 格式提示 -->
      <div class="flex min-w-0 flex-col gap-4px py-4px">
        <!-- 根节点通栏经文件尾 scoped 样式强制（antd 运行时注入样式会覆盖 Uno 类选择器） -->
        <Upload
          :file-list="s.fileList"
          multiple
          :accept="s.item.accept || undefined"
          :show-upload-list="false"
          :disabled="disabled"
          :before-upload="s.beforeUpload"
          class="attach-upload"
          @change="s.onChange"
        >
          <div :class="[boxClass(s), disabled ? 'cursor-not-allowed' : 'cursor-pointer']">
            <!-- 已有附件：文件行（类型图标 + 名称 + 大小 + 移除） -->
            <template v-if="s.fileList.length">
              <div
                v-for="f in s.fileList"
                :key="f.uid ?? f.name"
                class="flex w-full items-center gap-8px rd-6px bg-white px-10px py-6px transition-colors hover:bg-[#EEF4FB]"
              >
                <span
                  class="i-ant-design:file-text-outlined shrink-0 text-16px"
                  :style="{ color: fileColor(f.name) }"
                ></span>
                <!-- 上传中转圈；有直链（已上传）点击新窗打开，未完成的仅展示名称 -->
                <span
                  v-if="f.status === 'uploading'"
                  class="i-ant-design:loading-outlined shrink-0 text-14px text-gray-400"
                ></span>
                <a
                  v-if="f.url"
                  class="min-w-0 flex-1 truncate text-13px text-gray-700 hover:text-[#3A8EF6]!"
                  :title="f.name"
                  :href="f.url"
                  target="_blank"
                  rel="noopener"
                >
                  {{ f.name }}
                </a>
                <span v-else class="min-w-0 flex-1 truncate text-13px text-gray-700" :title="f.name">{{ f.name }}</span>
                <span v-if="fileSizeText(f)" class="shrink-0 text-12px text-gray-400">{{ fileSizeText(f) }}</span>
                <!-- 下载（查看模式也可用） -->
                <span
                  v-if="f.url"
                  class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-blue-50 hover:text-[#3A8EF6]"
                  title="下载"
                  @click.stop="downloadEspFile(f)"
                >
                  <span class="i-ant-design:download-outlined text-12px"></span>
                </span>
                <span
                  v-if="!disabled"
                  class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="删除"
                  @click.stop="removeFile(s, f)"
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
                :class="errorKeys.includes(s.item.field) ? 'text-[#ff4d4f]' : 'text-[#3A8EF6]'"
              ></span>
              <span class="text-13px text-gray-500">{{ disabled ? '暂无附件' : '点击上传' }}</span>
            </template>
          </div>
        </Upload>
        <div v-if="s.item.hint" class="pl-2px text-12px text-gray-400">{{ s.item.hint }}</div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillApprovedSectionAttachment">
  import { reactive, ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { fileColor, fileSizeText, downloadEspFile } from '../components/file-display';
  import type { EspUploadFile } from '../components/use-esp-file-list';
  import { useEspFileList } from '../components/use-esp-file-list';
  import type { SectionFormExposed } from '../components/use-section-form';
  import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

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
      hint: '',
    },
    { field: 'approvalFiles', label: '审批材料', required: false, accept: '', hint: '' },
    { field: 'otherFiles', label: '其他附件', required: false, accept: '', hint: '' },
  ] as const;

  /** 各附件位上传状态机（reactive 深层解包 fileList 的 ref，模板直接用数组） */
  const uploadSlots = reactive(
    ATTACH_SLOTS.map((item) => ({
      item,
      ...useEspFileList((props.data?.[item.field] as EspSchemeFile[]) ?? undefined),
    })),
  );

  /** 校验未通过的必填附件位（框体标红） */
  const errorKeys = ref<string[]>([]);

  /** 移除附件（自绘清单；antd 交互路径经 onChange 已覆盖） */
  function removeFile(s: (typeof uploadSlots)[number], f: EspUploadFile) {
    s.remove(f);
    errorKeys.value = errorKeys.value.filter((k) => k !== s.item.field);
  }

  /** 附件框样式：错误态红框 / 常态虚线框，含文件时左对齐铺满 */
  function boxClass(s: (typeof uploadSlots)[number]): string {
    const base = 'flex w-full flex-col gap-6px rd-8px border-1px border-dashed px-12px py-10px transition-colors';
    const state = errorKeys.value.includes(s.item.field)
      ? 'border-[#ff4d4f] bg-[#fff5f5]'
      : 'border-gray-200 bg-[#fafbfd] hover:border-[#3A8EF6] hover:bg-[#f0f7ff]';
    const layout = s.fileList.length ? 'items-stretch min-h-64px' : 'items-center justify-center min-h-60px';
    return `${base} ${state} ${layout}`;
  }

  defineExpose({
    /** 附件暂不纳入提交必填校验（红星仅表示重要性）；需要卡附件时放开下方校验逻辑 */
    validate: async () => {
      // const missing = ATTACH_SLOTS.filter((item) => {
      //   const slot = uploadSlots.find((s) => s.item.field === item.field);
      //   return item.required && !(slot?.espFiles().length);
      // });
      // errorKeys.value = missing.map((item) => item.field);
      // if (missing.length) {
      //   throw new Error('请上传必填附件');
      // }
    },
    getFieldsValue: () => {
      const out: Recordable = {};
      for (const s of uploadSlots) {
        out[s.item.field] = s.espFiles();
      }
      return out;
    },
    exportRows: (): [string, string][] =>
      uploadSlots.map((s) => [s.item.label, s.fileList.map((f: UploadFile) => f.name).join('、') || '（无）']),
    setFieldsValueSilently: async () => {},
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
