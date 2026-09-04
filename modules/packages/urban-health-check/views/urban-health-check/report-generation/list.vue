<!--
  市住更局 —— 报告生成（配置 + 已生成列表）

  页面结构:Card(体检年份 + 报告专题多选 + 生成报告按钮) → BasicTable(已生成记录)。
  点击「生成报告」按所选专题生成报告名称,插入一条「生成中」记录,模拟 2 秒后转为「已生成」。
  菜单注册(菜单名称「报告生成」):
   - 链接地址:/urban-health-check/report-generation/list
   - 组件位置:/urban-health-check/report-generation/list(与链接地址一致)
   - 是否可见:显示
  当前后端尚未介入，页面为纯 UI：不发起任何接口请求；
  字段与常量定义见 @jeesite/urban-health-check/api/urban-health-check/report-generation。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" title="报告生成配置">
      <div class="flex items-center">
        <span class="text-gray-500">体检年份</span>
        <Select v-model:value="year" :options="YEAR_OPTIONS" class="ml-2 w-32" />
        <span class="ml-6 text-gray-500">报告专题</span>
        <Select
          v-model:value="topics"
          mode="multiple"
          :options="topicOptions"
          placeholder="请选择报告专题(可多选)"
          class="ml-2 w-[420px]"
        />
        <a-button type="primary" class="ml-6" @click="handleGenerate"> 生成报告 </a-button>
      </div>
    </Card>

    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #topics="{ record }">
        {{ (record.topics || []).join('、') }}
      </template>
      <template #status="{ record }">
        <Tag
          :color="'blue'"
          :variant="record.status === REPORT_STATUS.DONE ? 'solid' : 'outlined'"
          style="border-radius: 10px"
        >
          {{ REPORT_STATUS_TEXT[record.status] || '-' }}
        </Tag>
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckReportGenerationList">
  import { ref, unref } from 'vue';
  import { Card, Select, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { dateUtil, formatToDateTime } from '@jeesite/core/utils/dateUtil';
  import { saveAs } from 'file-saver';
  import type { ReportRecord } from '@jeesite/urban-health-check/api/urban-health-check/report-generation';
  import {
    MOCK_LIST,
    PREVIEW_PDF_URL,
    REPORT_STATUS,
    REPORT_STATUS_TEXT,
    REPORT_TOPICS,
  } from '@jeesite/urban-health-check/api/urban-health-check/report-generation';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '已生成报告',
  };

  /** 报告专题下拉选项 */
  const topicOptions = REPORT_TOPICS.map((item) => ({ label: item, value: item }));

  /** 配置区:体检年份 / 报告专题(多选) */
  const year = ref<string>(YEAR_OPTIONS[0].value);
  const topics = ref<string[]>([]);

  /** 已生成记录(本地维护,后端接入后改为 api 拉取) */
  const records = ref<ReportRecord[]>([...MOCK_LIST]);
  let nextId = MOCK_LIST.length + 1;

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' as const },
    { title: '报告名称', dataIndex: 'reportName', width: 300 },
    { title: '包含专题', dataIndex: 'topics', slot: 'topics', width: 220 },
    { title: '生成时间', dataIndex: 'createTime', width: 160, align: 'center' as const },
    { title: '状态', dataIndex: 'status', width: 100, align: 'center' as const, slot: 'status' },
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) => [
      {
        label: '预览',
        onClick: () => handlePreview(record),
      },
      {
        label: '下载',
        onClick: () => handleDownload(record),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该报告？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerTable, { setTableData }] = useTable({
    dataSource: records.value,
    columns: tableColumns,
    actionColumn: actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 生成报告:按所选专题生成名称,插入「生成中」记录,模拟 2 秒后完成 */
  function handleGenerate() {
    if (!topics.value.length) {
      showMessage('请选择报告专题');
      return;
    }
    const name =
      topics.value.length === 1
        ? `${year.value}年度城市体检${topics.value[0]}专题报告`
        : topics.value.length === REPORT_TOPICS.length
          ? `${year.value}年度城市体检总报告`
          : `${year.value}年度城市体检综合分析报告`;
    const record: ReportRecord = {
      id: String(nextId),
      code: String(nextId),
      year: year.value,
      reportName: name,
      topics: [...topics.value],
      createTime: formatToDateTime(dateUtil()),
      status: REPORT_STATUS.GENERATING,
    };
    nextId += 1;
    // 新记录插到最前,便于看到生成过程
    records.value = [record, ...records.value];
    setTableData(records.value);
    showMessage(`已提交生成任务:${name}`);

    // TODO: 后端接入后改为轮询/推送获取生成结果;当前本地模拟 2 秒后完成
    setTimeout(() => {
      record.status = REPORT_STATUS.DONE;
      setTableData([...records.value]);
    }, 2000);
  }

  /** 预览:新标签页打开报告 PDF(浏览器原生查看器) */
  function handlePreview(_record: Recordable) {
    // TODO: 后端接入后改为报告文件地址
    window.open(PREVIEW_PDF_URL, '_blank');
  }

  /** 下载:统一经 file-saver 保存文件 */
  async function handleDownload(record: Recordable) {
    // TODO: 后端接入后改为报告文件接口(返回文件流,同样经 saveAs 保存)
    const res = await fetch(PREVIEW_PDF_URL);
    const blob = await res.blob();
    saveAs(blob, `${record.reportName}.pdf`);
  }

  /** 删除 */
  function handleDelete(record: Recordable) {
    records.value = records.value.filter((item) => item.id !== record.id);
    setTableData(records.value);
  }
</script>
