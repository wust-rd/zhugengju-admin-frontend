<!--
  市住更局 —— 策划方案填报（查看 / 新增 / 编辑 整页表单 · 编排骨架）

  由列表页（index.vue）以组件方式切换显示（不新增路由，菜单无需变更）。
  长表单拆为 6 个区块（各区块自持 BasicForm，见 components/section-*.vue）：
    1 片区基本信息 / 2 片区体检情况 / 3 片区功能策划 / 4 片区项目情况 /
    5 片区资金方案 / 6 附件材料 —— 顺序与内容见下方 SECTIONS 注册表。
  右侧悬浮锚点导航（anchor-nav.vue）：点击定位 + 滚动高亮当前区块。
  头部操作栏滚动时吸附在布局固定头（头部 + 页签）下方：sticky + 动态 top
  （运行时测量 .jeesite-layout-multiple-header 的底沿，页签显隐自动适配）；
  该 sticky 依赖 index.vue 的 contentClass 覆盖了 PageWrapper 容器的
  overflow-y:auto（祖先 overflow 非 visible 会使 sticky 失效）。
  头部操作：返回 / 导出（aoaToSheetXlsx 平铺导出全部区块）/ 保存
  （逐区块校验，首个未通过区块自动滚动定位；通过后 emit 由父级落内存副本。
  当前必填校验暂关闭——红星仅表示字段重要性，见 use-section-form 的 VALIDATE_ENABLED）。
  各区块字段为占位结构，待设计稿/接口文档确定后调整；后端尚未介入：
  接口对接说明见同目录 api.md（供后端直接阅读）。
-->
<template>
  <div class="flex flex-col gap-16px" :style="{ '--section-scroll-mt': `${sectionScrollMt}px` }">
    <!-- 头部：返回 + 标题 + 导出 / 保存（查看模式隐藏保存），滚动时吸顶 -->
    <div
      ref="barRef"
      class="sticky z-20 flex items-center gap-12px bg-white rd-8px px-16px py-12px shadow-sm"
      :style="{ top: `${stickyTop}px` }"
    >
      <a-button @click="emit('back')">
        <span class="inline-flex items-center gap-4px"><span class="i-fluent:arrow-left-12-filled"></span> 返回</span>
      </a-button>
      <span class="text-16px font-500">{{ title }}</span>
      <span class="flex-1"></span>
      <a-button @click="handleExport">
        <span class="inline-flex items-center gap-4px"
          ><span class="i-fluent:arrow-export-ltr-16-regular"></span> 导出</span
        >
      </a-button>
      <a-button v-if="!isView" type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </div>

    <!-- 六个区块（SECTIONS 驱动渲染，xl 下右侧留出悬浮导航空间） -->
    <div class="flex flex-col gap-16px xl:pr-160px">
      <FormSection v-for="sec in SECTIONS" :key="sec.id" :id="sec.id" :title="sec.title">
        <component :is="sec.component" :ref="(el) => setSectionRef(sec.id, el)" :data="record" :disabled="isView" />
      </FormSection>
    </div>

    <!-- 右侧悬浮导航 -->
    <AnchorNav :sections="navSections" />
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillForm">
  import { computed, onActivated, onBeforeUnmount, onMounted, ref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { aoaToSheetXlsx } from '@jeesite/core/components/Excel/src/Export2Excel';
  import FormSection from './components/form-section.vue';
  import AnchorNav from './components/anchor-nav.vue';
  import type { SectionFormExposed } from './components/use-section-form';
  import SectionBasicInfo from './components/section-basic-info.vue';
  import SectionHealthCheck from './components/section-health-check.vue';
  import SectionFunctionPlan from './components/section-function-plan.vue';
  import SectionProjectInfo from './components/section-project-info.vue';
  import SectionFundingPlan from './components/section-funding-plan.vue';
  import SectionAttachment from './components/section-attachment.vue';

  const props = defineProps<{ record?: Recordable }>();
  const emit = defineEmits(['success', 'back']);

  const { showMessage } = useMessage();

  /** 进入时的记录快照（父级每次传入新对象，各区块按 schema 字段各取所需） */
  const record = { ...(props.record || {}) } as Recordable;
  const isView = !!record.isView;
  const isNewRecord = record.isNewRecord ?? record.id == null;

  const title = computed(() => (isView ? '查看片区填报' : isNewRecord ? '新增片区填报' : '编辑片区填报'));
  const saving = ref(false);

  /**
   * 吸顶偏移 = 布局固定头（头部 + 多页签）的实际底沿。该元素为 fixed，
   * rect 与滚动位置无关；页签显隐（如仅剩一个页签）也会自动反映到 bottom。
   */
  const stickyTop = ref(0);
  const barRef = ref<HTMLElement | null>(null);

  /** 锚点滚动落点偏移：固定头 + 吸顶栏高 + 间距（经 CSS 变量供 form-section 的 scroll-mt 消费） */
  const sectionScrollMt = computed(() => stickyTop.value + (barRef.value?.offsetHeight ?? 0) + 16);

  function measureStickyTop() {
    stickyTop.value = document.querySelector('.jeesite-layout-multiple-header')?.getBoundingClientRect().bottom ?? 0;
  }

  onMounted(() => {
    measureStickyTop();
    window.addEventListener('resize', measureStickyTop);
  });
  // keep-alive 页面切回时页签数量可能变化，重测一次
  onActivated(measureStickyTop);
  onBeforeUnmount(() => window.removeEventListener('resize', measureStickyTop));

  /**
   * 区块注册表：模板渲染、锚点导航、保存校验与导出遍历共用（顺序即页面顺序）。
   * id 同时是锚点（FormSection 渲染到 section 元素上）与校验定位目标。
   */
  const SECTIONS = [
    { id: 'sec-basic', title: '片区基本信息', component: SectionBasicInfo },
    { id: 'sec-health', title: '片区体检情况', component: SectionHealthCheck },
    { id: 'sec-func', title: '片区功能策划', component: SectionFunctionPlan },
    { id: 'sec-project', title: '片区项目情况', component: SectionProjectInfo },
    { id: 'sec-fund', title: '片区资金方案', component: SectionFundingPlan },
    { id: 'sec-attach', title: '附件材料', component: SectionAttachment },
  ] as const;

  const navSections = SECTIONS.map(({ id, title: navTitle }) => ({ id, title: navTitle }));

  /** 各区块组件实例（统一暴露 validate / getFieldsValue / exportRows） */
  const sectionRefs = new Map<string, SectionFormExposed | null>();

  function setSectionRef(id: string, el: unknown) {
    const inst = (el as SectionFormExposed) ?? null;
    // 防御：区块漏 defineExpose(exposed) 时 validate 为 undefined，保存会被误判为校验失败
    if (inst && typeof inst.validate !== 'function') {
      console.warn(`[scheme-fill] 区块 ${id} 未暴露统一接口（缺 defineExpose(exposed)），请检查对应 section 组件`);
    }
    sectionRefs.set(id, inst);
  }

  /** 保存：逐区块校验并收集值；首个未通过的区块滚动定位 */
  async function handleSave() {
    const values: Recordable = {};
    let firstErrorId = '';
    for (const sec of SECTIONS) {
      const inst = sectionRefs.get(sec.id);
      if (!inst) continue;
      try {
        await inst.validate();
        Object.assign(values, inst.getFieldsValue());
      } catch {
        if (!firstErrorId) {
          firstErrorId = sec.id;
        }
      }
    }
    if (firstErrorId) {
      showMessage('存在未完善的必填项，已定位到对应区块');
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    saving.value = true;
    try {
      // TODO: 后端接入后在此调用保存接口（填报时间由后端记录）
      emit('success', { ...values, id: record.id, isNewRecord });
    } finally {
      saving.value = false;
    }
  }

  /** 导出：全部区块平铺为「区块标题 + 字段/值」两列 Excel（复用 core 的 xlsx 工具） */
  function handleExport() {
    const rows: string[][] = [];
    for (const sec of SECTIONS) {
      const inst = sectionRefs.get(sec.id);
      rows.push([sec.title]);
      for (const [label, value] of inst?.exportRows() ?? []) {
        rows.push([label, value]);
      }
      rows.push([]);
    }
    aoaToSheetXlsx({ data: rows, filename: `${record.name || '片区'}-策划方案填报.xlsx` });
    showMessage('导出成功（本地演示）');
  }
</script>
