<!--
  市住更局 —— 策划方案填报 · 已批准片区版（Tab① 已批准片区填报的 查看/编辑 表单）

  由列表页（list.vue）按 Tab① 打开（component :is 切换，不新增路由）。
  与待审查版（form-reviewing.vue）整体一致，仅两处不同：
   - 片区基本信息用 sections-approved/ 版（含「片区批次」）；
   - 附件材料第 4 位为「审批材料」。
  后端已对接（modules/esp），本页为现役功能，谨慎改动。
  长表单拆为 6 个区块（各区块自持 BasicForm，见 components/section-*.vue）：
    1 片区基本信息 / 2 片区体检情况 / 3 片区功能策划 / 4 片区项目情况 /
    5 片区资金方案 / 6 附件材料 —— 顺序与内容见下方 SECTIONS 注册表。
  右侧悬浮锚点导航（anchor-nav.vue）：点击定位 + 滚动高亮当前区块。
  头部操作栏滚动时吸附在布局固定头（头部 + 页签）下方：sticky + 动态 top
  （运行时测量 .jeesite-layout-multiple-header 的底沿，页签显隐自动适配）；
  该 sticky 依赖 index.vue 的 contentClass 覆盖了 PageWrapper 容器的
  overflow-y:auto（祖先 overflow 非 visible 会使 sticky 失效）。
  后端已对接（modules/esp）：进入按 id 拉 GET /schemeFill/form 回显（新增
  传空对象）；保存 POST /schemeFill/save 全量提交（projects 行剥离后端生成
  的 id），失败展示后端 msg 并停留；导出为「打印版式」PDF（export-form-pdf.ts：
  按各区块 exportRows 数据重排紧凑版式——两列字段表+图片网格+地图快照，
  多 tab 内容全量渲染，A4 避让分页图片不跨页）。
  暂存/提交都落库（必填校验同口径），差异只在是否退出：暂存留在页面继续编辑、
  提交退出回列表（列表刷新）。已批准存量片区不参与审批流转（两种保存都不改状态，
  submitType 由后端忽略）。
-->
<template>
  <div class="flex flex-col gap-16px" :style="{ '--section-scroll-mt': `${sectionScrollMt}px` }">
    <!-- 头部：返回 + 标题 + 导出 / 提交（查看模式隐藏提交按钮），滚动时吸顶 -->
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
      <!-- 导出下拉：PDF（打印版式截图）/ Word（docx 真文档，图片可复制） -->
      <Dropdown :trigger="['click']" :menu="{ items: exportMenuItems, onClick: onExportMenu }">
        <a-button :loading="exporting">
          <span class="inline-flex items-center gap-4px"
            ><span class="i-fluent:arrow-export-ltr-16-regular"></span> 导出</span
          >
        </a-button>
      </Dropdown>
      <!-- 暂存：保存但留在页面继续编辑（存量片区不参与审批流转，保存不改状态） -->
      <a-button v-if="!isView" :loading="saving" @click="handleSave('draft')">暂存</a-button>
      <!-- 提交：二次确认后保存并退出回列表（已批准存量片区不参与审批流转，状态不变） -->
      <Popconfirm
        v-if="!isView"
        title="确认提交该片区填报信息？"
        ok-text="确认提交"
        cancel-text="取消"
        @confirm="handleSave('submit')"
      >
        <a-button type="primary" :loading="saving">提交</a-button>
      </Popconfirm>
    </div>

    <!-- 全部区块（详情拉取完成后渲染，保证各区块挂载回填初值完整；SECTIONS 驱动，xl 下右侧留出悬浮导航空间） -->
    <div v-if="formData" class="flex flex-col gap-16px xl:pr-160px">
      <FormSection v-for="sec in SECTIONS" :key="sec.id" :id="sec.id" :title="sec.title">
        <component :is="sec.component" :ref="(el) => setSectionRef(sec.id, el)" :data="formData" :disabled="isView" />
      </FormSection>
    </div>

    <!-- 右侧悬浮导航 -->
    <AnchorNav :sections="navSections" />
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillApprovedForm">
  import { computed, onActivated, onBeforeUnmount, onMounted, ref } from 'vue';
  import { Dropdown, Popconfirm } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    schemeFillForm,
    schemeFillSave,
    type EspSchemeFill,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import FormSection from './components/form-section.vue';
  import AnchorNav from './components/anchor-nav.vue';
  import { exportFormDocx, exportFormPdf } from './components/form-export';
  import type { SectionFormExposed } from './components/use-section-form';
  // 两处差异化区块取已批准版（批次/审批材料）；其余六个区块共用 components/
  import SectionBasicInfo from './sections-approved/section-basic-info.vue';
  import SectionAttachment from './sections-approved/section-attachment.vue';
  import SectionHealthCheck from './components/section-health-check.vue';
  import SectionFunctionPlan from './components/section-function-plan.vue';
  import SectionCityDesign from './components/section-city-design.vue';
  import SectionPlanAdjust from './components/section-plan-adjust.vue';
  import SectionProjectInfo from './components/section-project-info.vue';
  import SectionFundingPlan from './components/section-funding-plan.vue';

  const props = defineProps<{ record?: Recordable }>();
  const emit = defineEmits(['success', 'back']);

  const { showMessage } = useMessage();

  /** 进入时的记录快照（列表行：id + isView；新增无 id） */
  const record = { ...(props.record || {}) } as Recordable;
  const isView = !!record.isView;
  /** 新增标记（首次暂存落库后置 false，标题转「编辑」；仅极端兜底，存量片区本就有 id） */
  let isNewRecord = record.isNewRecord ?? record.id == null;

  const title = computed(() => (isView ? '查看片区填报' : isNewRecord ? '新增片区填报' : '编辑片区填报'));
  const saving = ref(false);

  /**
   * 详情数据（编辑/查看按 id 拉取；新增直接空对象）。拉取完成才渲染区块：
   * 各区块经 useSectionForm 在 onMounted 一次性回填初值，晚到的数据不会生效。
   */
  const formData = ref<Recordable>();

  onMounted(async () => {
    if (!record.id) {
      formData.value = {}; // 已批准片区无新增入口，此分支仅为兜底;
      return;
    }
    try {
      formData.value = (await schemeFillForm(String(record.id))) as Recordable;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载填报数据失败');
      emit('back');
    }
  });

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
    { id: 'sec-city-design', title: '片区城市设计', component: SectionCityDesign },
    { id: 'sec-plan-adjust', title: '片区规划调整', component: SectionPlanAdjust },
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

  /**
   * JeeSiteSelect 多选经 core useRuleFormItem 写回 formModel 的是逗号串（jeesite 平台
   * 约定，配套 String 列存储），后端 List<String> 契约要数组 —— 回显未改动时是数组、
   * 用户改动过后是逗号串，提交前统一归一
   */
  function toStrList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item) => item != null && item !== '');
    }
    return typeof value === 'string' && value ? value.split(',') : [];
  }

  /**
   * 暂存 / 提交（都逐区块校验并全量提交；存量片区状态不变，两键差异只在是否退出页面）：
   *  - 暂存（draft）：落库后留在页面继续编辑（回填 id/aUid，避免后续保存按新增重复建）；
   *  - 提交（submit）：落库后退出回列表（列表刷新）。
   */
  async function handleSave(mode: 'draft' | 'submit') {
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
      // projects 行回显带后端生成的 id，保存契约无此键，提交前剥离；
      // funcTypes / projects[].fundSources 为多选 Select，归一为数组（见 toStrList）；
      // 编辑按 aUid 定位（后端契约主条件，id 为兼容兜底），新增不传由后端 PQ 序列取号
      const wasNewRecord = isNewRecord;
      const aUid = String(record.aUid ?? formData.value?.aUid ?? '') || undefined;
      const payload = {
        ...values,
        ...(aUid ? { aUid } : {}),
        id: record.id ? String(record.id) : '',
        // 存量片区（isApprove=1）不受状态机约束，后端忽略此键；带上与待审查版口径一致
        submitType: mode,
        funcTypes: toStrList(values.funcTypes),
        projects: (values.projects ?? []).map(({ id: _projectId, fundSources, ...rest }: Recordable) => ({
          ...rest,
          fundSources: toStrList(fundSources),
        })),
      } as EspSchemeFill;
      const saved = await schemeFillSave(payload);
      // 首次保存即已落库：回填定位键，后续保存按编辑定位
      record.id = saved.id;
      record.aUid = saved.aUid;
      isNewRecord = false;
      if (mode === 'draft') {
        showMessage('已暂存，可继续编辑');
        return; // 暂存不退出页面
      }
      showMessage('提交成功');
      emit('success', { ...saved, isNewRecord: wasNewRecord });
    } catch (error) {
      // 后端轻校验（同名片区/字数/时间序）等业务错误：展示 msg 并停留在表单
      showMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      saving.value = false;
    }
  }

  const exporting = ref(false);

  /** 导出格式菜单（PDF 打印版式 / Word 真文档） */
  const exportMenuItems = [
    { key: 'pdf', label: '导出 PDF' },
    { key: 'docx', label: '导出 Word' },
  ];

  function onExportMenu({ key }: { key: string | number }) {
    void runExport(key === 'docx' ? 'docx' : 'pdf');
  }

  /** 导出：按数据重排版生成 PDF / Word（文字取各区块 exportRows，图片/地图从区块 DOM 提取），直接下载 */
  async function runExport(format: 'pdf' | 'docx') {
    if (!formData.value || exporting.value) {
      return;
    }
    exporting.value = true;
    try {
      const sections = SECTIONS.map((sec) => ({
        id: sec.id,
        title: sec.title,
        rows: sectionRefs.get(sec.id)?.exportRows() ?? [],
      }));
      const headerTitle = `${record.name || '片区'}策划方案填报`;
      if (format === 'docx') {
        await exportFormDocx(sections, headerTitle, `${record.name || '片区'}-策划方案填报.docx`);
      } else {
        await exportFormPdf(sections, headerTitle, `${record.name || '片区'}-策划方案填报.pdf`);
      }
      showMessage('导出成功');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      exporting.value = false;
    }
  }
</script>
