<!--
  填报页区块：片区城市设计（对齐设计稿图1）

  tab 多设计填报：6 个固定类别（人居环境/产业发展/历史文化保护/基础设施建设/
  生态环境整治/交通影响评价）——添加时从「未使用的类别」下拉选择（不可重复），
  删除删除当前激活 tab；每个 tab 填 主要内容（≤300 字）+ 设计图片（jpg/png 多张）。
  值结构：cityDesigns = [{type, content, images: 文件对象数组}]（经 defineExpose
  并入保存值；导出按类别平铺）。
  实现注意：每条目的上传状态机（含 ref）存放在非响应式 Map（fileCtls），条目本身
  只存纯数据 —— 避免 reactive 深层解包 ref 造成的类型/运行时不一致；
  Dropdown/Menu/TextArea 非全局注册组件，须显式导入。
-->
<template>
  <div class="flex flex-col gap-12px">
    <!-- tab 条：左 tab（6 类，激活高亮），右 添加（剩余类别下拉）/删除 -->
    <div class="flex items-center justify-between">
      <div class="flex flex-1 gap-4px overflow-x-auto border-b border-gray-100">
        <div
          v-for="(d, i) in designs"
          :key="d.uid"
          class="cursor-pointer whitespace-nowrap rd-4px border px-16px py-6px text-14px transition-colors"
          :class="
            i === activeIdx
              ? 'border-[#1677ff] font-500 text-[#1677ff]'
              : 'border-gray-200 text-gray-600 hover:border-[#1677ff] hover:text-[#1677ff]'
          "
          @click="activeIdx = i"
        >
          {{ d.type }}
        </div>
      </div>
      <div v-if="!disabled" class="mb-6px ml-12px flex flex-none gap-8px">
        <Dropdown :trigger="['click']" :menu="{ items: menuItems, onClick: onAddClick }">
          <a-button type="primary" :disabled="!remainingTypes.length">
            <span class="inline-flex items-center gap-4px"><span class="i-fluent:add-12-filled"></span> 添加</span>
          </a-button>
        </Dropdown>
        <a-button danger :disabled="!designs.length" @click="removeDesign">删除</a-button>
      </div>
    </div>

    <!-- 空态 -->
    <div
      v-if="!designs.length"
      class="flex h-88px items-center justify-center rd-8px bg-[#fafbfd] text-13px text-gray-400"
    >
      暂无城市设计，点击「添加」从六类中选择新增
    </div>

    <!-- 激活 tab 内容：主要内容 + 设计图片 -->
    <template v-else v-for="(d, i) in designs" :key="d.uid">
      <!-- PDF 导出中全部展开（pdfExporting），截图覆盖每个类别的内容与图片 -->
      <div v-show="i === activeIdx || pdfExporting" class="flex flex-col gap-12px">
        <div>
          <div class="mb-6px text-14px text-gray-700">主要内容</div>
          <TextArea
            v-model:value="d.content"
            :maxlength="300"
            :rows="4"
            show-count
            :disabled="disabled"
            placeholder="300字以内"
          />
        </div>
        <div>
          <div class="mb-6px text-14px text-gray-700">设计图片</div>
          <Upload
            :file-list="ctlOf(d.uid).fileList.value"
            accept=".jpg,.jpeg,.png"
            list-type="picture-card"
            multiple
            :disabled="disabled"
            :show-upload-list="{ showRemoveIcon: !disabled, showDownloadIcon: true }"
            :before-upload="ctlOf(d.uid).beforeUpload"
            @preview="onPreview"
            @download="onDownload"
            @change="ctlOf(d.uid).onChange"
          >
            <div class="flex flex-col items-center justify-center gap-2px text-gray-400">
              <span class="text-20px leading-none">+</span>
              <span class="text-12px">上传图片</span>
            </div>
          </Upload>
          <div class="mt-4px text-12px text-gray-400">上传图片，支持jpg、png格式，可传多个</div>
        </div>
      </div>
    </template>
    <!-- 缩略图点击预览弹层（替代 antd 新开页面默认行为） -->
    <ImagePreview :url="previewUrl" @close="previewUrl = ''" />
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionCityDesign">
  import { computed, reactive, ref } from 'vue';
  import { Dropdown, TextArea, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import type { SectionFormExposed } from './use-section-form';
  import ImagePreview from './image-preview.vue';
  import { downloadEspFile } from './file-display';
  import { pdfExporting } from './pdf-export-state';
  import { useEspFileList } from './use-esp-file-list';
  import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

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

  /** 城市设计类别（对齐设计稿 6 类，不可重复；接口字典化后替换） */
  const DESIGN_TYPES = ['人居环境', '产业发展', '历史文化保护', '基础设施建设', '生态环境整治', '交通影响评价'];

  /** 单个设计条目（纯数据；uid 作 tab key 与上传状态机关联） */
  type DesignEntry = { uid: number; type: string; content: string };

  let uidSeq = 0;
  const nextUid = () => ++uidSeq;

  /** 各条目独立的上传状态机（非响应式容器；惰性创建） */
  const fileCtls = new Map<number, ReturnType<typeof useEspFileList>>();

  function ctlOf(uid: number): ReturnType<typeof useEspFileList> {
    let ctl = fileCtls.get(uid);
    if (!ctl) {
      ctl = useEspFileList();
      fileCtls.set(uid, ctl);
    }
    return ctl;
  }

  /** 初值：回显 cityDesigns（后端键 type/content/images） */
  const designs = reactive<DesignEntry[]>(
    ((props.data?.cityDesigns as Recordable[]) ?? []).map((d) => {
      const uid = nextUid();
      fileCtls.set(uid, useEspFileList((d.images as EspSchemeFile[]) ?? undefined));
      return { uid, type: String(d.type ?? ''), content: String(d.content ?? '') };
    }),
  );

  const activeIdx = ref(0);

  /** 尚未使用的类别（添加下拉选项；为空时禁用添加） */
  const remainingTypes = computed(() => DESIGN_TYPES.filter((t) => !designs.some((d) => d.type === t)));

  /** Dropdown menu prop 项（key/label=类别名） */
  const menuItems = computed(() => remainingTypes.value.map((t) => ({ key: t, label: t })));

  function onAddClick({ key }: { key: string | number }) {
    designs.push({ uid: nextUid(), type: String(key), content: '' });
    activeIdx.value = designs.length - 1;
  }

  /** 删除当前激活 tab（全部删空后归零指针；顺带清理上传状态机） */
  function removeDesign() {
    const [removed] = designs.splice(activeIdx.value, 1);
    if (removed) {
      fileCtls.delete(removed.uid);
    }
    activeIdx.value = Math.max(0, Math.min(activeIdx.value, designs.length - 1));
  }

  defineExpose({
    validate: async () => {},
    getFieldsValue: () => ({
      cityDesigns: designs.map((d) => ({
        type: d.type,
        content: d.content.trim(),
        images: ctlOf(d.uid).espFiles(),
      })),
    }),
    exportRows: (): [string, string][] =>
      designs.map((d) => [
        d.type,
        [
          d.content.trim() || '（未填主要内容）',
          `图片：${
            ctlOf(d.uid)
              .fileList.value.map((f) => f.name)
              .join('、') || '（无）'
          }`,
        ].join('；'),
      ]),
    setFieldsValueSilently: async () => {},
  } satisfies SectionFormExposed);
</script>
