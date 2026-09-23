<!--
  市住更局 —— 名城保护 · 优保责任书上传统计

  对齐老系统「各区优保责任书上传情况统计报表」：左上角导出EXCEL + 居中标题 +
  序号/所属区/优保建筑数量/已上传/未上传 + 末行全市合计（加粗）。
  上传标记取主表 SFSCZRZ（是否上传责任书）；责任书原件上传/查看功能
  待文件存储表接入后再做，当前仅统计口径。
-->
<template>
  <PageWrapper>
    <div class="bg-white p-4">
      <div class="mb-4 flex items-center justify-center">
        <span class="text-lg font-bold">各区优保责任书上传情况统计报表</span>
      </div>
      <div class="mb-3">
        <a-button @click="handleExport"> <Icon icon="i-ant-design:download-outlined" /> 导出EXCEL </a-button>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        bordered
        size="small"
        :row-class-name="(_: Recordable, index: number) => (index === dataSource.length - 1 ? 'font-bold' : '')"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">{{ dataSource.indexOf(record) + 1 }}</template>
        </template>
      </a-table>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingCommitmentLetterList">
  import { onMounted, ref } from 'vue';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { fetchCommitmentStats, CommitmentRow } from '@jeesite/urban-protection/api/urban-protection/stats';
  import { exportBorderedSheet } from '../../shared/excel-export';
  import { fmtDate } from '../../shared/excellent-format';

  const loading = ref(false);
  const rows = ref<CommitmentRow[]>([]);
  const summary = ref<CommitmentRow | null>(null);

  const columns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 60, align: 'center' },
    { title: '所属区', dataIndex: 'qu', width: 160 },
    { title: '优保建筑数量', dataIndex: 'total', align: 'center' },
    { title: '已上传', dataIndex: 'uploaded', align: 'center' },
    { title: '未上传', dataIndex: 'missing', align: 'center' },
  ];

  const dataSource = ref<CommitmentRow[]>([]);

  async function load() {
    loading.value = true;
    try {
      const data = await fetchCommitmentStats();
      rows.value = data.rows;
      summary.value = data.summary;
      dataSource.value = summary.value ? [...rows.value, summary.value] : [...rows.value];
    } finally {
      loading.value = false;
    }
  }

  /** 导出EXCEL：标题行 + 表头 + 各区行 + 全市合计行（加粗） */
  function handleExport() {
    const tableRows: (string | number)[][] = [
      ['序号', '所属区', '优保建筑数量', '已上传', '未上传'],
      ...dataSource.value.map((row, index) => [index + 1, row.qu, row.total, row.uploaded, row.missing]),
    ];
    const lastRow = tableRows.length - 1;
    exportBorderedSheet(
      `优保责任书上传统计报表_${fmtDate(Date.now()).replaceAll('-', '')}.xlsx`,
      tableRows,
      [{ wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }],
      {
        title: '各区优保责任书上传情况统计报表',
        boldRows: [lastRow],
        rowHeights: { 0: 28 },
      },
    );
  }

  onMounted(load);
</script>
