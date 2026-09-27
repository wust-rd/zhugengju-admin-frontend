<!--
  片区更新后评估 —— 生成评估报告页

  入口：评估列表行操作「生成评估报告」。
  报告是**一次性**的：每次进入都按当前最新数据现生成；**四段正文可编辑（生成的模板/数据只是初始值），
  但编辑不保存**，只用于本次导出（PDF / Word）；因此本功能不需要任何后端改动。
  顶部：「编辑文字 / 完成编辑」切换编辑态、「下载 PDF」（截图合成 A4）、「导出 Word」（.docx，
  图表 PNG 内嵌，文字可继续编辑）。

  版式（按业务要求定的字号，二者换算已对齐 A4）：
  - 版心固定 1200px（PDF 按 210mm 宽等比缩放 → 1px≈0.44pt），因此：
    主标题 36px（≈三号 16pt）/ 章节标题 32px（≈四号 14pt）/ 正文与图注 27px（≈小四 12pt）/
    元信息 22px / 表格 24px（≈五号 10.5pt）；Word 导出直接在 HTML 里写 pt，与上面同口径。
  - 统计图一排两个（2 列网格），导出时横着排满版心。

  报告结构（四段正文 + 图1~图6 + 表1/表2）：
   一、片区更新概况：取片区档案的「片区概况」字段；取不到则留空；
   二、成效指标对比：固定模板 + 填报数据（缺数据处显示 XX）；后接
       图1 片区项目进度 / 图2 片区更新后直接经济效益 / 图3 片区更新后间接经济效益 / 图4 片区更新后社会效益
       （项目进度与直接经济效益的「更新前」本期不填，这两张图只画「更新后」）+ 表1 成效指标对比表；
   三、片区更新后评估满意度分析：固定模板 + 填报数据（缺数据 XX）；后接
       图5 一级维度更新后提升成效（柱状）/ 图6 二级维度更新后提升成效（雷达）+ 表2 满意度分析表；
   四、更新后评估结论：取评估页填的结论。

  元信息行「功能定位」显示的是**编码**（COD / TOD…），与设计稿一致；编码取片区档案 funcTypes，
  取不到时回退评估记录里存的功能定位中文名。

  数据（全部走已有接口，无新增后端接口/字段）：
   - 评估明细 GET /a/esp/postEval/detail?id=xxx（片区快照 + 指标/满意度 + 结论 + 效果图）；
   - 片区档案 GET /a/esp/schemeFill/form（登录即可）：先 page 按片区名称定位拿记录 id，再 form 取
     overview（片区概况）与 funcTypes（功能定位编码）。
  导出：export-report.ts（PDF）/ export-word.ts（Word）。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- 顶部操作条（不进导出） -->
    <div class="flex flex-wrap items-center gap-16px bg-white rd-8px px-24px py-14px shadow-sm">
      <a-button @click="emit('back')">返回</a-button>
      <span class="text-16px font-500 text-gray-800">生成评估报告</span>
      <span class="text-14px text-gray-500">文字可编辑，编辑仅用于本次导出（不保存）</span>
      <div class="ml-auto flex gap-8px">
        <a-button :disabled="!loaded" @click="handleToggleEdit">{{ editingText ? '完成编辑' : '编辑文字' }}</a-button>
        <a-button :loading="downloading" :disabled="!loaded" @click="handleDownloadPdf">下载 PDF</a-button>
        <a-button type="primary" :loading="exportingWord" :disabled="!loaded" @click="handleDownloadWord">
          导出 Word
        </a-button>
      </div>
    </div>

    <Spin :spinning="loading">
      <!-- 版心固定宽度，窄屏时横向滚动（保证导出与屏幕所见一致） -->
      <div class="report-scroll">
        <div ref="reportRef" class="report-paper">
          <h1 class="report-title">{{ reportTitle }}</h1>

          <!-- 元信息（来自评估记录的片区快照 + 片区档案的功能定位编码） -->
          <div class="report-meta">
            <span>评估年份：{{ meta.evalYear }}</span>
            <span>行政区：{{ meta.dist }}</span>
            <span>片区批次：{{ meta.batch }}</span>
            <span>片区规模：{{ meta.areaHa }}</span>
            <span>功能定位：{{ meta.funcType }}</span>
          </div>

          <!-- 一、片区更新概况 -->
          <h2 class="report-h2">一、片区更新概况</h2>
          <TextArea v-if="editingText" v-model:value="texts.overview" :rows="5" class="mb-16px" />
          <p v-else class="report-p">{{ texts.overview }}</p>

          <!-- 二、成效指标对比 -->
          <h2 class="report-h2">二、成效指标对比</h2>
          <TextArea v-if="editingText" v-model:value="texts.indicator" :rows="6" class="mb-16px" />
          <p v-else class="report-p">{{ texts.indicator }}</p>
          <div class="report-chart-grid">
            <div v-for="chart in indicatorCharts" :key="chart.caption">
              <PostEvalRadar
                :labels="chart.series.labels"
                :before="chart.series.before"
                :after="chart.series.after"
                :hide-before="chart.hideBefore"
                :height="320"
              />
              <div class="report-caption">{{ chart.caption }}</div>
            </div>
          </div>
          <div class="report-caption report-table-caption">表1 片区更新后评估成效指标对比表</div>
          <IndicatorTable :rows="indicators" readonly :show-filter="false" auto-width />

          <!-- 三、片区更新后评估满意度分析 -->
          <h2 class="report-h2">三、片区更新后评估满意度分析</h2>
          <TextArea v-if="editingText" v-model:value="texts.satisfaction" :rows="7" class="mb-16px" />
          <p v-else class="report-p">{{ texts.satisfaction }}</p>
          <div class="report-chart-grid">
            <div>
              <PostEvalBar :groups="barGroups" :before="barBefore" :after="barAfter" :height="320" />
              <div class="report-caption">图5 一级维度更新后提升成效</div>
            </div>
            <div>
              <PostEvalRadar
                :labels="satisfactionChart.labels"
                :before="satisfactionChart.before"
                :after="satisfactionChart.after"
                :height="320"
              />
              <div class="report-caption">图6 二级维度更新后提升成效</div>
            </div>
          </div>
          <div class="report-caption report-table-caption">表2 片区更新后评估满意度分析表</div>
          <SatisfactionTable :rows="satisfactions" readonly :show-filter="false" auto-width />

          <!-- 四、更新后评估结论 -->
          <h2 class="report-h2">四、更新后评估结论</h2>
          <TextArea v-if="editingText" v-model:value="texts.conclusion" :rows="4" class="mb-16px" />
          <p v-else class="report-p">{{ texts.conclusion }}</p>
        </div>
      </div>
    </Spin>
  </div>
</template>
<script lang="ts" setup name="AreaPostEvalReport">
  import { computed, nextTick, onMounted, reactive, ref } from 'vue';
  import { Spin, TextArea } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type {
    EspPostEvalDetail,
    EspPostEvalIndicatorValue,
    EspPostEvalSatisfactionValue,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import { postEvalDetail } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import {
    schemeFillForm,
    schemeFillPage,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import IndicatorTable from './indicator-table.vue';
  import SatisfactionTable from './satisfaction-table.vue';
  import { PostEvalBar } from './components/post-eval-bar';
  import { PostEvalRadar } from './components/post-eval-radar';
  import { exportReportPdf } from './export-report';
  import { buildIndicatorTableData, buildSatisfactionTableData, exportReportWord } from './export-word';
  import {
    INDICATOR_PROGRESS_LV1,
    SATISFACTION_LV1_ORDER,
    buildIndicatorText,
    buildSatisfactionText,
    groupAverage,
    indicatorSeries,
    indicatorsOfLv1,
    isBeforeLocked,
    satisfactionSeries,
    satisfactionsOfLv1,
    type PostEvalTarget,
  } from './shared';

  const props = defineProps<{
    /** 评估对象（编辑/查看带 id） */
    record: PostEvalTarget;
  }>();

  const emit = defineEmits<{
    (e: 'back'): void;
  }>();

  const { showMessage } = useMessage();

  const loading = ref(false);
  const downloading = ref(false);
  const exportingWord = ref(false);
  const loaded = ref(false);
  const reportRef = ref<HTMLElement | null>(null);

  /** 评估明细：报告全部内容都由它现生成（不落库、不缓存） */
  const detail = ref<EspPostEvalDetail | null>(null);
  const indicators = computed<EspPostEvalIndicatorValue[]>(() => detail.value?.indicators ?? []);
  const satisfactions = computed<EspPostEvalSatisfactionValue[]>(() => detail.value?.satisfactions ?? []);

  /** 报告头信息（评估记录的片区快照 + 片区档案的功能定位编码） */
  const meta = reactive({ areaName: '', evalYear: '', dist: '', batch: '', areaHa: '', funcType: '' });

  /**
   * 四段正文的当前值：初始 = 模板/数据生成值，用户可在页面上直接改（改的是这里的值，导出用它）
   *
   * 注意：编辑**不保存**（每次进入都按最新数据重新生成初始值），所以这里只是页面级状态。
   */
  const texts = reactive({ overview: '', indicator: '', satisfaction: '', conclusion: '' });
  /** 四段正文是否处于可编辑态（纯前端开关，与保存无关） */
  const editingText = ref(false);

  const reportTitle = computed(() => `${meta.areaName || props.record.areaName || ''}更新后评估报告`);

  /** 图1~图4：四个一级维度的雷达图（锁定维度只画「更新后」） */
  const indicatorCharts = computed(() => {
    const charts: { lv1: string; caption: string }[] = [
      { lv1: INDICATOR_PROGRESS_LV1, caption: '图1 片区项目进度' },
      { lv1: '直接经济效益', caption: '图2 片区更新后直接经济效益' },
      { lv1: '间接经济效益', caption: '图3 片区更新后间接经济效益' },
      { lv1: '社会效益', caption: '图4 片区更新后社会效益' },
    ];
    return charts.map((chart) => ({
      caption: chart.caption,
      hideBefore: isBeforeLocked(chart.lv1),
      series: indicatorSeries(indicatorsOfLv1(indicators.value, chart.lv1)),
    }));
  });

  /** 图5：一级维度提升成效（分组均值）；图6：二级维度提升成效（全部维度雷达） */
  const barGroups = computed(() =>
    SATISFACTION_LV1_ORDER.filter((lv1) => satisfactions.value.some((row) => row.lv1 === lv1)),
  );
  const barBefore = computed(() =>
    barGroups.value.map((lv1) =>
      groupAverage(satisfactionsOfLv1(satisfactions.value, lv1).map((row) => row.beforeScore)),
    ),
  );
  const barAfter = computed(() =>
    barGroups.value.map((lv1) =>
      groupAverage(satisfactionsOfLv1(satisfactions.value, lv1).map((row) => row.afterScore)),
    ),
  );
  const satisfactionChart = computed(() => satisfactionSeries(satisfactions.value));

  onMounted(load);

  /** 拉评估明细 + 片区档案信息（一次性读取，不落库） */
  async function load() {
    if (!props.record.id) {
      showMessage('评估记录不存在，无法生成报告');
      return;
    }
    loading.value = true;
    try {
      const data = await postEvalDetail(props.record.id);
      detail.value = data;
      meta.areaName = data.areaName ?? props.record.areaName ?? '';
      meta.evalYear = data.evalYear ? `${data.evalYear}年` : '';
      meta.dist = data.dist ?? '';
      meta.batch = data.batch ?? '';
      meta.areaHa = data.areaHa === null || data.areaHa === undefined ? '' : `${data.areaHa}公顷`;

      // 片区档案：片区概况（第一段初始值）+ 功能定位编码（元信息行用 COD/TOD 这种编码展示）
      const areaInfo = await loadAreaInfo(data.aUid, data.areaName);
      meta.funcType = areaInfo.funcTypes.length ? areaInfo.funcTypes.join(' ') : (data.funcTypeName ?? '');

      // 四段正文初始值：一 = 片区概况，二/三 = 模板 + 填报数据，四 = 评估页结论
      texts.overview = areaInfo.overview;
      texts.indicator = buildIndicatorText(data.indicators ?? [], data.evalYear ?? '');
      texts.satisfaction = buildSatisfactionText(data.satisfactions ?? []);
      texts.conclusion = data.conclusion ?? '';
      loaded.value = true;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '报告数据加载失败');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 片区档案信息：走既有方案填报接口（登录即可）
   *
   * page 按片区名称模糊定位记录 → 用 aUid 精确匹配 → form 取 overview / funcTypes；
   * 任何一步失败都只是第一段与功能定位编码留空（功能定位回退中文名），不影响报告其余内容。
   */
  async function loadAreaInfo(aUid?: string, areaName?: string): Promise<{ overview: string; funcTypes: string[] }> {
    if (!aUid) return { overview: '', funcTypes: [] };
    try {
      const page = await schemeFillPage({ name: areaName ?? '', isApprove: '1', pageNum: 1, pageSize: 50 });
      const row = (page.list ?? []).find((item) => item.aUid === aUid);
      if (!row?.id) return { overview: '', funcTypes: [] };
      const fill = await schemeFillForm(row.id);
      return { overview: fill.overview ?? '', funcTypes: fill.funcTypes ?? [] };
    } catch (error) {
      console.warn('[post-eval-report] 片区档案信息获取失败（第一段与功能定位编码留空）：', error);
      return { overview: '', funcTypes: [] };
    }
  }

  /** 切换四段正文的可编辑态（纯页面开关：编辑只为本次导出，不保存） */
  function handleToggleEdit() {
    editingText.value = !editingText.value;
  }

  /** 导出前统一切回展示态：PDF 截图 / Word 转换拿到的都是报告版式（不是输入框样子） */
  async function withViewMode<T>(task: () => Promise<T> | T): Promise<T> {
    const wasEditing = editingText.value;
    if (wasEditing) {
      editingText.value = false;
      await nextTick();
    }
    try {
      return await task();
    } finally {
      if (wasEditing) {
        editingText.value = true;
      }
    }
  }

  /** 下载 PDF（报告正文 → A4 多页） */
  async function handleDownloadPdf() {
    if (!reportRef.value) return;
    downloading.value = true;
    try {
      await withViewMode(() => exportReportPdf(reportRef.value as HTMLElement, reportTitle.value));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '下载失败');
    } finally {
      downloading.value = false;
    }
  }

  /** 导出 Word（报告正文 → .docx：图表 PNG 内嵌、文字可继续编辑；Word/WPS 均稳定） */
  async function handleDownloadWord() {
    if (!reportRef.value) return;
    exportingWord.value = true;
    try {
      const metaItems = [
        meta.evalYear && `评估年份：${meta.evalYear}`,
        meta.dist && `行政区：${meta.dist}`,
        meta.batch && `片区批次：${meta.batch}`,
        meta.areaHa && `片区规模：${meta.areaHa}`,
        meta.funcType && `功能定位：${meta.funcType}`,
      ].filter((item): item is string => !!item);
      await withViewMode(() =>
        exportReportWord(
          reportRef.value as HTMLElement,
          {
            title: reportTitle.value,
            metaItems,
            sections: [
              { heading: '一、片区更新概况', text: texts.overview },
              {
                heading: '二、成效指标对比',
                text: texts.indicator,
                chartCaptions: indicatorCharts.value.map((chart) => chart.caption),
                table: buildIndicatorTableData(indicators.value),
              },
              {
                heading: '三、片区更新后评估满意度分析',
                text: texts.satisfaction,
                chartCaptions: ['图5 一级维度更新后提升成效', '图6 二级维度更新后提升成效'],
                table: buildSatisfactionTableData(satisfactions.value),
              },
              { heading: '四、更新后评估结论', text: texts.conclusion },
            ],
          },
          reportTitle.value,
        ),
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      exportingWord.value = false;
    }
  }
</script>
<style lang="less" scoped>
  .report-scroll {
    overflow-x: auto;
  }

  /* 版心：固定 1200px（PDF 等比缩到 A4 宽度 → 1px ≈ 0.44pt，故正文 27px ≈ 小四 12pt） */
  .report-paper {
    width: 1200px;
    margin: 0 auto;
    padding: 40px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
    color: #1f1f1f;
    font-family: '宋体', SimSun, serif;
    font-size: 27px;
    line-height: 1.7;
  }

  /* 主标题 ≈ 三号（16pt，黑体），章节标题 = 四号（14pt，黑体），正文 = 小四（12pt，宋体） */
  .report-title {
    margin-bottom: 28px;
    font-family: '黑体', SimHei, sans-serif;
    text-align: center;
    font-size: 36px;
    font-weight: 700;
  }

  .report-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px 16px;
    margin-bottom: 20px;
    font-size: 24px;
  }

  .report-h2 {
    margin: 28px 0 12px;
    font-family: '黑体', SimHei, sans-serif;
    font-size: 32px;
    font-weight: 700;
  }

  .report-p {
    margin-bottom: 16px;
    text-indent: 2em;
    font-size: 27px;
    line-height: 1.8;
  }

  /* 统计图一排两个，铺满版心 */
  .report-chart-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  /* 图名 / 表名 = 五号（≈24px），与表格、元信息同号 */
  .report-caption {
    margin-top: 8px;
    text-align: center;
    font-size: 24px;
    font-weight: 600;
  }

  .report-table-caption {
    margin: 24px 0 12px;
  }

  /* 报告内表格：字号五号（≈24px）、宋体，单元格留白放大一档 */
  .report-paper :deep(.ant-table) {
    font-family: '宋体', SimSun, serif;
    font-size: 24px;
  }

  .report-paper :deep(.ant-table-thead > tr > th),
  .report-paper :deep(.ant-table-tbody > tr > td) {
    padding: 10px 12px;
  }

  /* 编辑态输入框字号/字体与正文一致 */
  .report-paper :deep(textarea.ant-input) {
    font-family: '宋体', SimSun, serif;
    font-size: 27px;
    line-height: 1.8;
  }
</style>
