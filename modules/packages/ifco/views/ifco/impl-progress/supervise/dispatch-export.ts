/*
  ifco —— 提示/督办单据导出（市级列表「导出单据」）· docx 真文档

  版式照 2026-09-23 单据模板：右上角编号（=下发编号）→ 居中大标题（督办单/
  工作提示单，按单据类型）→ 主送机关（{行政区}人民政府）→ 巡查引语（巡查
  月份）→ 逐项目问题行（{片区}的{项目}推进滞后，{具体问题}，来自下发对象
  勾选与逐项目具体问题）→ 类型固定的督办/提示段落（含回告截止=处理截止日期）
  → 联系人行 → 右下落款（市城市更新工作专班 + 下发日期；待下发未落日期取
  当天）。正文三号仿宋、标题二号宋体加粗、固定行距，A4 页。下载走 file-saver。
*/
import { AlignmentType, Document, LineRuleType, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import type { SuperviseItem } from '@jeesite/ifco/api/ifco/impl-progress';

const BODY_FONT = '仿宋_GB2312';
const TITLE_FONT = '宋体';
/** 公文口径：三号字（16pt）、固定行距 28pt、首行缩进两字（32pt） */
const BODY_SIZE = 32;
const LINE = { line: 560, lineRule: LineRuleType.EXACT };
const FIRST_LINE_INDENT = 640;

/** 日期 YYYY-MM-DD → 2026年4月29日（空值取当天） */
function cnDate(value: string): string {
  const now = new Date();
  const source = value || `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const [year, month, day] = source.split('-');
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

/** 巡查月份 YYYY-MM → N月份（空值留模板占位） */
function cnMonth(period: string): string {
  const month = Number(period.split('-')[1]);
  return month ? `${month}月份` : 'X月份';
}

/** 回告截止 YYYY-MM-DD → N月N日前（空值留模板占位） */
function cnMonthDay(value: string): string {
  const [, month, day] = value.split('-');
  return month && day ? `${Number(month)}月${Number(day)}日前` : 'X月X日前';
}

/** 正文段（默认首行缩进两字） */
function body(text: string, indent = true): Paragraph {
  return new Paragraph({
    spacing: LINE,
    indent: indent ? { firstLine: FIRST_LINE_INDENT } : undefined,
    children: [new TextRun({ text })],
  });
}

/**
 * 导出提示/督办单据 docx：单据类型与固定段落按督办/工作提示两套模板区分，
 * 编号、行政区、巡查月份、问题行、回告截止、联系人、落款日期取单据实际值。
 */
export async function exportDispatchDocx(item: SuperviseItem): Promise<void> {
  const isSupervise = item.superviseType === '督办';
  const deadlineText = cnMonthDay(item.deadline);
  const problemLines = item.areaItems.flatMap((area) =>
    area.projects.map((project) =>
      body(`${area.area}的${project.projectName}推进滞后${project.problem ? `，${project.problem}` : ''}。`),
    ),
  );

  const children = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: LINE,
      children: [new TextRun({ text: `编号：${item.dispatchNo}` })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 360, ...LINE },
      children: [new TextRun({ text: isSupervise ? '督办单' : '工作提示单', bold: true, size: 44, font: TITLE_FONT })],
    }),
    body(`${item.district}人民政府：`, false),
    body(`市工作专班对你区“五改四好”城市更新片区开展${cnMonth(item.inspectMonth)}巡查，发现存在问题如下：`),
    // 未勾选片区项目时保留模板占位行，维持单据结构
    ...(problemLines.length ? problemLines : [body('XX片的XX项目推进滞后，……（描述具体问题）……。')]),
    isSupervise
      ? body(
          `上述片区项目未达到《武汉市实施“五改四好”加快推进高质量城市更新行动方案（2025—2027年）》（武办文〔2025〕34号）的目标要求。请高度重视，抓紧研判进度滞后的原因，提出切实可行的举措，加快推进相关工作。相关推进情况请于${deadlineText}回告市工作专班。`,
        )
      : body(
          `请你区高度重视，组织相关单位和人员研究工作措施，按照项目进度安排表持续推进，相关工作措施和落实情况请于${deadlineText}回告市城市更新工作专班。`,
        ),
    body(`联系人：${item.contactPerson || '/'}，联系方式：${item.contactPhone || '/'}。`),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 480, ...LINE },
      children: [new TextRun({ text: '市城市更新工作专班' })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: LINE,
      children: [new TextRun({ text: cnDate(item.dispatchDate) })],
    }),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: BODY_FONT, size: BODY_SIZE } } } },
    sections: [{ children }],
  });
  saveAs(await Packer.toBlob(doc), `${item.dispatchNo}.docx`);
}
