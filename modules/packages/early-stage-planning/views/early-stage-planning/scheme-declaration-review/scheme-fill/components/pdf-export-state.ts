/*
  PDF 导出进行中标记（scheme-fill 填报页共享）

  导出工具（export-form-pdf.ts）截图期间置 true：项目情况/城市设计等多 tab
  区块以 v-show 隐藏非激活面板，导出时须全部展开（v-show="激活 || pdfExporting"），
  否则 PDF 里只有当前 tab 的内容。
*/
import { ref } from 'vue';

export const pdfExporting = ref(false);
