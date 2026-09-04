<!--
  市住更局 —— 报告生成（配置 + 已生成列表）

  页面结构:Card(报告生成配置:第一行 报告类型/体检年份/体检对象/片区选择,
  第二行 章节设置(tags 多选可输入),
  第三行 报告名称(input,占满整行),
  第四行 重置/生成报告(右对齐)) → BasicTable(已生成记录)。
  点击「生成报告」插入一条「生成中」记录,模拟 2 秒后转为「已生成」。
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
        <span class="text-gray-500">报告类型</span>
        <Select v-model:value="reportType" :options="typeOptions" class="ml-2 w-40" />
        <span class="ml-6 text-gray-500">体检年份</span>
        <Select v-model:value="year" :options="YEAR_OPTIONS" class="ml-2 w-28" />
        <span class="ml-6 text-gray-500">体检对象</span>
        <Select v-model:value="target" :options="targetOptions" class="ml-2 w-36" />
        <span class="ml-6 text-gray-500">片区选择</span>
        <Select
          v-model:value="surveyArea"
          :options="areaOptions"
          placeholder="请选择片区"
          allowClear
          class="ml-2 w-36"
        />
      </div>
      <div class="mt-3 flex items-center">
        <span class="text-gray-500">章节设置</span>
        <Select
          v-model:value="chapters"
          mode="tags"
          :options="chapterOptions"
          placeholder="请选择或输入章节(可多选)"
          class="ml-2 flex-1"
        />
      </div>
      <div class="mt-3 flex items-center">
        <span class="text-gray-500">报告名称</span>
        <Input
          v-model:value="reportName"
          placeholder="请输入"
          allowClear
          class="ml-2 flex-1"
          @pressEnter="handleGenerate"
        />
      </div>
      <div class="mt-3 flex justify-end">
        <a-button @click="handleReset"> 重置 </a-button>
        <a-button type="primary" class="ml-2" @click="handleGenerate"> 生成报告 </a-button>
      </div>
    </Card>

    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #chapters="{ record }">
        {{ (record.chapters || []).join('、') }}
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
  import { reactive, ref, toRefs, unref } from 'vue';
  import { Card, Input, Select, Tag } from 'antdv-next';
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
    REPORT_CHAPTERS,
    REPORT_STATUS,
    REPORT_STATUS_TEXT,
    REPORT_TYPES,
  } from '@jeesite/urban-health-check/api/urban-health-check/report-generation';
  import {
    ADMIN_DIVISIONS,
    SURVEY_AREAS,
    toOptions,
  } from '@jeesite/urban-health-check/api/urban-health-check/common';
  import { YEAR_OPTIONS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '已生成报告',
  };

  /** 报告类型下拉选项 */
  const typeOptions = toOptions(REPORT_TYPES);
  /** 体检对象下拉选项:全市 + 各行政区 */
  const targetOptions = [{ label: '武汉市', value: '武汉市' }, ...toOptions(ADMIN_DIVISIONS)];
  /** 片区选择下拉选项(体检片区/街道) */
  const areaOptions = toOptions(SURVEY_AREAS);
  /** 章节设置下拉选项(tags 模式下可另手动输入自定义章节) */
  const chapterOptions = toOptions(REPORT_CHAPTERS);

  /** 配置区默认值(重置时复用) */
  function defaultConfig() {
    return {
      reportType: REPORT_TYPES[0] as string,
      year: YEAR_OPTIONS[0].value,
      target: '武汉市',
      surveyArea: undefined as string | undefined,
      reportName: '',
      chapters: [...REPORT_CHAPTERS] as string[],
    };
  }

  /** 配置区:报告类型 / 体检年份 / 体检对象 / 片区选择 / 报告名称 / 章节设置(多选) */
  const config = reactive(defaultConfig());
  const { reportType, year, target, surveyArea, reportName, chapters } = toRefs(config);

  /** 已生成记录(本地维护,后端接入后改为 api 拉取) */
  const records = ref<ReportRecord[]>([...MOCK_LIST]);
  let nextId = MOCK_LIST.length + 1;

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' as const },
    { title: '报告名称', dataIndex: 'reportName', width: 320 },
    { title: '报告类型', dataIndex: 'reportType', width: 130, align: 'center' as const },
    { title: '包含章节', dataIndex: 'chapters', slot: 'chapters', width: 260 },
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

  /** 重置:配置区恢复默认值 */
  function handleReset() {
    Object.assign(config, defaultConfig());
  }

  /** 生成报告:校验必填项后插入「生成中」记录,模拟 2 秒后完成 */
  function handleGenerate() {
    if (!reportName.value.trim()) {
      showMessage('请输入报告名称');
      return;
    }
    if (!chapters.value.length) {
      showMessage('请选择章节设置');
      return;
    }
    const record: ReportRecord = {
      id: String(nextId),
      code: String(nextId),
      reportType: reportType.value,
      year: year.value,
      target: target.value,
      surveyArea: surveyArea.value,
      reportName: reportName.value.trim(),
      chapters: [...chapters.value],
      createTime: formatToDateTime(dateUtil()),
      status: REPORT_STATUS.GENERATING,
    };
    nextId += 1;
    // 新记录插到最前,便于看到生成过程
    records.value = [record, ...records.value];
    setTableData(records.value);
    showMessage(`已提交生成任务:${record.reportName}`);

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
