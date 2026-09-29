<!--
  市住更局 —— 城市更新专家管理 · 生成评估报告页（独立路由页，纯前端现生成、不存后端）

  从「项目评估」列表已完成项目的【生成评估报告】进入（query：code=项目业务编码）。
  页面结构（对齐设计图）：
  - 工具条：返回 + 「生成评估报告」标题 + 编辑/保存（仅"专家组评估意见"文本可改）+ 下载 PDF / 下载 Word；
  - A4 报告卡（导出截图目标 #ure-report）：
      居中标题「项目评估报告」→ 评估日期（项目开始评估日期）→ 分隔线 → 基本信息（2行3列）
      → 一、专家组构成（6 列表格，序号/姓名/单位/领域/职称/角色）
      → 二、专家组评估意见（=组长综合评估内容，可编辑）
      → 三、评估结论（综合评估结论 + 每位专家个人评估结论）。
  导出：PDF=html2canvas-pro 截图 + jsPDF A4 分页；Word=docx 库构建 .docx；file-saver 下载。
  数据源：ureProjectDetail（项目+专家+综合评估）+ ureProjectEvals（个人评估结论，权限=创建人/组长/运维）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 工具条 -->
    <div class="flex flex-wrap items-center gap-12px shrink-0">
      <a-button @click="goBack">
        <span class="inline-flex items-center gap-4px">
          <span class="i-ant-design:arrow-left-outlined"></span> 返回
        </span>
      </a-button>
      <span class="text-16px font-500 text-gray-800">生成评估报告</span>
      <span v-if="projectName" class="text-14px text-gray-500">- {{ projectName }}</span>
      <div class="ml-auto flex items-center gap-12px">
        <span v-if="editing" class="text-13px text-orange-500">编辑中：修改后点「保存」结束编辑，再下载</span>
        <a-button :type="editing ? 'primary' : 'default'" :disabled="!detail" @click="toggleEdit">
          {{ editing ? '保存' : '编辑' }}
        </a-button>
        <a-button type="primary" :loading="exporting === 'pdf'" :disabled="editing || !detail" @click="exportPdf">
          下载 PDF
        </a-button>
        <a-button type="primary" :loading="exporting === 'word'" :disabled="editing || !detail" @click="exportWord">
          下载 Word
        </a-button>
      </div>
    </div>

    <div v-if="loading" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      报告数据加载中…
    </div>
    <div v-else-if="!detail" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      {{ loadError || '缺少项目参数' }}
    </div>

    <!-- A4 报告卡（导出目标） -->
    <div v-else id="ure-report" class="mx-auto w-full max-w-794px bg-white rd-12px b-1 b-solid b-gray-100 p-48px shadow-sm">
      <!-- 标题 + 评估日期 -->
      <div class="text-center text-24px font-600 text-gray-900">项目评估报告</div>
      <div class="mt-12px text-center text-14px text-gray-600">评估日期：{{ evalDateText }}</div>

      <div class="my-20px border-t border-solid b-gray-400"></div>

      <!-- 基本信息（2 行 3 列） -->
      <div class="grid grid-cols-3 gap-y-14px text-14px text-gray-900">
        <div><span class="text-gray-500">项目名称：</span>{{ detail.name || '—' }}</div>
        <div><span class="text-gray-500">片区名称：</span>{{ detail.district || '—' }}</div>
        <div><span class="text-gray-500">评估模式：</span>{{ detail.reviewMode || '—' }}</div>
        <div><span class="text-gray-500">实施主体：</span>{{ detail.implementOrg || '—' }}</div>
        <div><span class="text-gray-500">统筹主体：</span>{{ detail.coordinator || '—' }}</div>
        <div><span class="text-gray-500">责任部门：</span>{{ detail.dept || '—' }}</div>
      </div>

      <div class="my-20px border-t border-solid b-gray-400"></div>

      <!-- 一、专家组构成 -->
      <div class="text-16px font-600 text-gray-900">一、专家组构成</div>
      <table class="mt-12px w-full text-14px" style="border-collapse: collapse">
        <thead>
          <tr class="bg-[#F5F7FA]">
            <th class="report-cell">序号</th>
            <th class="report-cell">专家姓名</th>
            <th class="report-cell">单位名称</th>
            <th class="report-cell">专业领域</th>
            <th class="report-cell">职称</th>
            <th class="report-cell">角色</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(expert, i) in detail.experts ?? []" :key="expert.id">
            <td class="report-cell text-center">{{ i + 1 }}</td>
            <td class="report-cell text-center">{{ expert.name }}</td>
            <td class="report-cell">{{ expert.org || '—' }}</td>
            <td class="report-cell text-center">{{ expert.field || '—' }}</td>
            <td class="report-cell text-center">{{ expert.title || '—' }}</td>
            <td class="report-cell text-center">{{ expert.isLeader ? '组长' : '组员' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 二、专家组评估意见（组长的综合评估，可编辑） -->
      <div class="mt-24px text-16px font-600 text-gray-900">二、专家组评估意见</div>
      <textarea
        v-if="editing"
        v-model="opinionText"
        class="mt-12px w-full rounded-6px b-1 b-solid b-gray-300 p-12px text-14px leading-28px outline-none focus:border-[#3A8EF6]"
        :rows="10"
        placeholder="请输入专家组评估意见"
      />
      <div v-else class="mt-12px whitespace-pre-wrap text-14px leading-28px text-gray-800">{{ opinionText || '—' }}</div>

      <!-- 三、评估结论 -->
      <div class="mt-24px text-16px font-600 text-gray-900">三、评估结论</div>
      <div class="mt-12px text-14px leading-28px text-gray-800">
        <p>综合评估结论：{{ detail.evalResult || '—' }}</p>
        <p>个人评估结论：{{ memberConclusionText || '—' }}</p>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluationReport">
  import { computed, onMounted, ref, unref } from 'vue';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useRoute } from 'vue-router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { saveAs } from 'file-saver';
  import html2canvas from 'html2canvas-pro';
  import { jsPDF } from 'jspdf';
  import {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } from 'docx';
  import { ureProjectDetail, ureProjectEvals } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import type {
    UreMemberEval,
    UreProjectDetail,
    UreProjectEvals,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';

  const { showMessage } = useMessage();
  const route = useRoute();
  const go = useGo();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';

  /** 路由参数：?code={项目业务编码} */
  const projectCode = String(unref(route.query).code ?? '');

  const detail = ref<UreProjectDetail | null>(null);
  const loading = ref(true);
  const loadError = ref('');
  const projectName = computed(() => detail.value?.name ?? '');

  /** 专家组评估意见（初始=组长综合评估内容；可编辑，仅本次导出生效，不存后端） */
  const opinionText = ref('');
  const editing = ref(false);
  const exporting = ref<'' | 'pdf' | 'word'>('');

  /** 评估日期（项目进入评估的日期，yyyy年M月d日） */
  const evalDateText = computed(() => {
    const raw = detail.value?.startDate ?? '';
    const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : raw || '—';
  });

  /** 个人评估结论："张三 通过；李四 不通过；…"（全部参与专家含组长） */
  const memberConclusionText = computed(() =>
    memberEvals.value.map((r) => `${r.name} ${r.evalResult}`).join('；'),
  );

  /** 个人评估结论数据（evals 接口：创建人/组长/运维可见；失败降级为空） */
  const memberEvals = ref<UreMemberEval[]>([]);

  onMounted(async () => {
    if (!projectCode) {
      loading.value = false;
      return;
    }
    try {
      const [d, evals] = await Promise.all([
        ureProjectDetail(projectCode),
        ureProjectEvals(projectCode).catch(() => null as UreProjectEvals | null),
      ]);
      detail.value = d;
      opinionText.value = d.evalOpinion ?? '';
      memberEvals.value = evals?.memberEvals ?? [];
    } catch (e) {
      loadError.value = (e as Error)?.message || '报告数据加载失败';
      showMessage(loadError.value);
    } finally {
      loading.value = false;
    }
  });

  function toggleEdit() {
    if (editing.value && !opinionText.value.trim()) {
      showMessage('评估意见不能为空');
      return;
    }
    editing.value = !editing.value;
  }

  /** 导出文件名（项目名 + 项目评估报告） */
  const exportFilename = computed(() => `${(detail.value?.name ?? '项目').replace(/[\\/:*?"<>|]/g, '')}项目评估报告`);

  /** 导出 PDF：报告卡截图 → jsPDF A4 分页 */
  async function exportPdf() {
    const el = document.getElementById('ure-report');
    if (!el) return;
    exporting.value = 'pdf';
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      let rendered = 0;
      while (rendered < imgH) {
        if (rendered > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, -rendered, pageW, imgH);
        rendered += pageH;
      }
      pdf.save(`${exportFilename.value}.pdf`);
    } catch (e) {
      showMessage((e as Error)?.message || 'PDF 导出失败');
    } finally {
      exporting.value = '';
    }
  }

  // ── Word 导出（docx 构建） ────────────────────────────────────────

  /** docx 单元格 */
  function cell(text: string, opts: { bold?: boolean; center?: boolean; width?: number } = {}) {
    return new TableCell({
      borders: reportBorders,
      width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
      children: [
        new Paragraph({
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text, bold: opts.bold, size: 21, font: '宋体' })],
        }),
      ],
    });
  }

  const reportBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
  };

  const tableBorders = {
    ...reportBorders,
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
  };

  /** 导出 Word：docx 构建 .docx（结构与页面报告一致） */
  async function exportWord() {
    if (!detail.value) return;
    exporting.value = 'word';
    try {
      const d = detail.value;
      const infoRow = (cells: [string, string][]) =>
        new TableRow({ children: cells.map(([label, value]) => cell(`${label}：${value || '—'}`, { width: 33 })) });

      const expertHeader = new TableRow({
        tableHeader: true,
        children: [
          cell('序号', { bold: true, center: true, width: 8 }),
          cell('专家姓名', { bold: true, center: true, width: 16 }),
          cell('单位名称', { bold: true, center: true, width: 30 }),
          cell('专业领域', { bold: true, center: true, width: 16 }),
          cell('职称', { bold: true, center: true, width: 15 }),
          cell('角色', { bold: true, center: true, width: 15 }),
        ],
      });
      const expertRows = (d.experts ?? []).map(
        (e, i) =>
          new TableRow({
            children: [
              cell(String(i + 1), { center: true }),
              cell(e.name ?? '', { center: true }),
              cell(e.org ?? '—'),
              cell(e.field ?? '—', { center: true }),
              cell(e.title ?? '—', { center: true }),
              cell(e.isLeader ? '组长' : '组员', { center: true }),
            ],
          }),
      );

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '项目评估报告', bold: true, size: 44, font: '黑体' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [new TextRun({ text: `评估日期：${evalDateText.value}`, size: 21, font: '宋体' })],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: tableBorders,
                rows: [
                  infoRow([
                    ['项目名称', d.name],
                    ['片区名称', d.district],
                    ['评估模式', d.reviewMode],
                  ]),
                  infoRow([
                    ['实施主体', d.implementOrg],
                    ['统筹主体', d.coordinator],
                    ['责任部门', d.dept],
                  ]),
                ],
              }),
              new Paragraph({
                spacing: { before: 300, after: 120 },
                children: [new TextRun({ text: '一、专家组构成', bold: true, size: 28, font: '黑体' })],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: tableBorders,
                rows: [expertHeader, ...expertRows],
              }),
              new Paragraph({
                spacing: { before: 300, after: 120 },
                children: [new TextRun({ text: '二、专家组评估意见', bold: true, size: 28, font: '黑体' })],
              }),
              ...opinionText.value
                .split('\n')
                .map(
                  (line) =>
                    new Paragraph({
                      spacing: { line: 360, after: 60 },
                      children: [new TextRun({ text: line || ' ', size: 24, font: '宋体' })],
                    }),
                ),
              new Paragraph({
                spacing: { before: 300, after: 120 },
                children: [new TextRun({ text: '三、评估结论', bold: true, size: 28, font: '黑体' })],
              }),
              new Paragraph({
                spacing: { line: 360 },
                children: [new TextRun({ text: `综合评估结论：${d.evalResult || '—'}`, size: 24, font: '宋体' })],
              }),
              new Paragraph({
                spacing: { line: 360 },
                children: [new TextRun({ text: `个人评估结论：${memberConclusionText.value || '—'}`, size: 24, font: '宋体' })],
              }),
            ],
          },
        ],
      });

      saveAs(await Packer.toBlob(doc), `${exportFilename.value}.docx`);
    } catch (e) {
      showMessage((e as Error)?.message || 'Word 导出失败');
    } finally {
      exporting.value = '';
    }
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>

<style scoped>
  .report-cell {
    border: 1px solid #999999;
    padding: 8px 10px;
  }
</style>
