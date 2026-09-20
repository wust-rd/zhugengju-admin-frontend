<!--
  市住更局 —— 策划方案填报 · 待审查片区版（Tab② 待审查片区填报的 新增/查看/编辑 表单）

  由列表页（list.vue）按 Tab② 打开（component :is 切换，不新增路由）。
  与已批准版（form-approved.vue）整体一致，仅两处不同：
   - 片区基本信息用 sections-reviewing/ 版（「申报年份」，无片区批次）；
   - 附件材料用 sections-reviewing/ 版（9 位：策划方案/规划图表/体检报告/市政府批准
     认定材料/专家论证情况/区级联合审查意见/市级审查意见/市政府批准材料/其他附件，
     对齐 2026-09-18 设计稿；已批准版仍为 5 位）。
  权限与审批流后端暂未建设，先保证填报可用（角色/审查流转见下文状态口径）。
  提交状态口径（业务约定，详见 ../shared/review-mock.ts）：
   暂存 → 片区状态「未提交」（可继续编辑）；提交 → 「审核中」（填报单位只能查看，
   主审单位在 …/scheme-review/list 审查列表可见）。暂存不校验必填，提交校验必填；
   后端暂无状态列，状态先写前端假数据层。
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
  必填校验：**提交时逐区块校验**（暂存不校验，草稿允许留空），规则在各区块 schema 的
  rules 里（红星即必填，申报年份必填）；校验不过定位到第一个问题区块并 toast。
-->
<template>
  <div class="flex flex-col gap-16px" :style="{ '--section-scroll-mt': `${sectionScrollMt}px` }">
    <!-- 头部：返回 + 标题 + 导出 / 暂存 / 提交（查看模式隐藏两个按钮），滚动时吸顶 -->
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
      <!-- 暂存：宽校验、状态=未提交（可继续编辑）；提交：校验必填、提交后状态=审核中，
           填报单位转为只读（列表不再给编辑入口），主审单位在审查列表可见 -->
      <a-button v-if="!isView" :loading="saving" @click="handleSave('draft')">暂存</a-button>
      <Popconfirm
        v-if="!isView"
        title="提交后片区进入审核中，填报单位不可再编辑，是否确认提交？"
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
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillReviewingForm">
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
  import { setReviewStatus } from '../shared/review-mock';
  // 两处差异化区块取待审查版（申报年份 / 9 位附件材料）；其余六个区块共用 components/
  import SectionBasicInfo from './sections-reviewing/section-basic-info.vue';
  import SectionAttachment from './sections-reviewing/section-attachment.vue';
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
  const isNewRecord = record.isNewRecord ?? record.id == null;

  const title = computed(() => (isView ? '查看片区填报' : isNewRecord ? '新增片区填报' : '编辑片区填报'));
  const saving = ref(false);

  /**
   * 详情数据（编辑/查看按 id 拉取；新增直接空对象）。拉取完成才渲染区块：
   * 各区块经 useSectionForm 在 onMounted 一次性回填初值，晚到的数据不会生效。
   */
  const formData = ref<Recordable>();

  onMounted(async () => {
    if (!record.id) {
      formData.value = { isApprove: '2' }; // 新增：待审查片区（is_approve=2 落 Tab② 列表）;
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
   * 暂存 / 提交（两态，业务口径见 ../shared/review-mock.ts）：
   *  - 暂存（draft）：跳过区块必填校验（草稿允许留空）→ 落库 → 状态=未提交，仍可编辑；
   *  - 提交（submit）：逐区块校验（首个未通过的区块滚动定位）→ 落库 → 状态=审核中，
   *    填报单位转为只读、主审单位在 …/scheme-review/list 可见。
   * 状态后端暂无字段，写前端假数据层（按接口返回的 id 记录），接口就绪后改由后端返回。
   */
  async function handleSave(mode: 'draft' | 'submit') {
    const values: Recordable = {};
    let firstErrorId = '';
    for (const sec of SECTIONS) {
      const inst = sectionRefs.get(sec.id);
      if (!inst) continue;
      if (mode === 'submit') {
        try {
          await inst.validate();
        } catch {
          if (!firstErrorId) {
            firstErrorId = sec.id;
          }
          continue;
        }
      }
      Object.assign(values, inst.getFieldsValue());
    }
    if (firstErrorId) {
      showMessage('存在未完善的必填项，已定位到对应区块');
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    saving.value = true;
    try {
      // projects 行回显带后端生成的 id，保存契约无此键，提交前剥离；
      // funcTypes / projects[].fundSources 为多选 Select，归一为数组（见 toStrList）
      const payload = {
        ...values,
        id: record.id ? String(record.id) : '',
        funcTypes: toStrList(values.funcTypes),
        projects: (values.projects ?? []).map(({ id: _projectId, fundSources, ...rest }: Recordable) => ({
          ...rest,
          fundSources: toStrList(fundSources),
        })),
      } as EspSchemeFill;
      const saved = await schemeFillSave(payload);
      setReviewStatus(saved.id, mode === 'draft' ? 'unsubmitted' : 'reviewing');
      showMessage(mode === 'draft' ? '已暂存，状态：未提交' : '提交成功，已提交审核');
      emit('success', { ...saved, isNewRecord });
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
