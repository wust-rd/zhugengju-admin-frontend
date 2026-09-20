<!--
  填报页区块六 · 待审查片区版（Tab② 待审查片区填报·填报单位，isApprove=2 专用）

  与已批准片区版（../sections-approved/section-attachment.vue）的差异：本版按
  「新增填报片区」收件口径，共 9 个具名附件位（配置见 ATTACH_SLOTS，均支持多文件），
  对齐 2026-09-18 设计稿 ——
    片区策划方案* / 规划图表* / 片区体检报告* / 市政府批准认定材料* /
    专家论证情况* / 区级联合审查意见* / 市级审查意见* / 市政府批准材料* / 其他附件；
  已批准版仍为 5 位（片区策划方案/规划图表/片区体检报告/审批材料/其他附件），
  两份独立维护不走复用分支。两类片区互斥（is_approve 固定），互不影响。

  存储位（后端 ESP_FILE_URL 文件位）：
   - 前三位与第 8 位复用既有位：scheme_plan_files / chart_files /
     health_report_files / approval_files —— 其中 approvalFiles 就是已批准版
     「审批材料」的文件位，本版第 8 位「市政府批准材料」（示例文案「市政府批复材料」）
     语义与之相同，故继续复用（后端零改动）；
   - 「市政府批准认定材料 / 专家论证情况 / 区级联合审查意见 / 市级审查意见」为
     新增文件位（govCertFiles / expertArgumentFiles / districtJointReviewFiles /
     cityReviewFiles），后端 2026-09-20 已支持（ESP_FILE_URL 扩展 field_code，
     无 DDL），保存/回显均已打通，明细见《接口文档-片区策划申报审查.md》。

  每行 = 右对齐标签（红星=设计稿要求的必填位）+ 通栏框 + 框下格式/大小提示。
  框内：空态居中显示设计稿示例文案（placeholder）与上传图标，已传文件居中显示
  文件链接（hover 显删除 ×，点击框空白处追加文件）。
  已对接后端（modules/esp）：真实上传 MinIO（use-esp-file-list，值=文件对象
  数组，已传文件名带直链新窗打开——pdf/word 即外链预览；每行另有下载图标，
  查看模式也可用）；单文件 > 100MB 直接拦截不入列（设计稿限定）。
  必填校验：validate 时缺文件的必填位框体标红并 reject（form.vue 提交时滚动定位）——
  当前 validate 体仍为注释状态（红星仅表示重要性，附件不纳入提交校验，待确认项），
  需要卡附件时放开下方 validate 注释即可。
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
          :before-upload="(file) => beforeUploadWithLimit(s, file)"
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

            <!-- 空态：云上传图标 + 设计稿示例文案（查看模式回退「暂无附件」） -->
            <template v-else>
              <span
                class="i-ant-design:cloud-upload-outlined text-22px"
                :class="errorKeys.includes(s.item.field) ? 'text-[#ff4d4f]' : 'text-[#3A8EF6]'"
              ></span>
              <span
                class="text-13px"
                :class="disabled ? 'text-gray-500' : 'text-gray-400'"
                :title="disabled ? '' : '点击上传'"
              >
                {{ disabled ? '暂无附件' : s.item.placeholder }}
              </span>
            </template>
          </div>
        </Upload>
        <div v-if="s.item.hint" class="pl-2px text-12px text-gray-400">{{ s.item.hint }}</div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillReviewingSectionAttachment">
  import { reactive, ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { fileColor, fileSizeText, downloadEspFile } from '../components/file-display';
  import type { EspUploadFile } from '../components/use-esp-file-list';
  import { useEspFileList } from '../components/use-esp-file-list';
  import type { SectionFormExposed } from '../components/use-section-form';
  import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  const { showMessage } = useMessage();

  /** 单文件大小上限 100MB（设计稿固定文案：文件大小不超过100MB） */
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  /** 附件位配置（field 对应保存字段，带语义前缀避免与项目实施方案 planFiles 混淆） */
  const ATTACH_SLOTS = [
    {
      field: 'schemePlanFiles',
      label: '片区策划方案',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: 'xxx片更新策划方案',
    },
    {
      field: 'chartFiles',
      label: '规划图表',
      required: true,
      accept: '.pdf,.xls,.xlsx,.jpg,.png',
      hint: '支持pdf、xls/xlsx、jpg/png格式，文件大小不超过100MB',
      placeholder: 'xxx片规划图表',
    },
    {
      field: 'healthReportFiles',
      label: '片区体检报告',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: 'xxx片体检报告',
    },
    {
      field: 'govCertFiles',
      label: '市政府批准认定材料',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: '批准文件',
    },
    {
      field: 'expertArgumentFiles',
      label: '专家论证情况',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: 'xxx片专家评审意见表',
    },
    {
      field: 'districtJointReviewFiles',
      label: '区级联合审查意见',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: '区级联合审查意见表',
    },
    {
      field: 'cityReviewFiles',
      label: '市级审查意见',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: '市级审查意见表',
    },
    {
      // 复用已批准版「审批材料」文件位（后端 approval_files），后端零改动
      field: 'approvalFiles',
      label: '市政府批准材料',
      required: true,
      accept: '.pdf,.doc,.docx',
      hint: '支持pdf、doc、docx格式，文件大小不超过100MB',
      placeholder: '市政府批复材料',
    },
    {
      field: 'otherFiles',
      label: '其他附件',
      required: false,
      accept: '',
      hint: '',
      placeholder: 'XXXX',
    },
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

  /**
   * 选文件前置校验：超过 100MB 的文件不入列（LIST_IGNORE）并提示后端/前端同一口径，
   * 避免留下一条无直链的僵尸条目；合规文件交状态机正常上传（见 use-esp-file-list）。
   */
  function beforeUploadWithLimit(s: (typeof uploadSlots)[number], file: File): boolean | string {
    if (file.size > MAX_FILE_SIZE) {
      showMessage(`「${s.item.label}」文件大小不能超过 100MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
      return Upload.LIST_IGNORE;
    }
    return s.beforeUpload(file);
  }

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
