<!--
  市住更局 —— 满意度调查 show 页(某年调查的问题明细)

  规划路由(RESTful,后端隐藏菜单,待注册):
   - 链接地址:/urban-health-check/urban/satisfaction-survey/{id}(show 页;与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/satisfaction-survey/_id/list(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂「满意度调查」以点亮侧边栏
  页面结构:Card(年份+统计信息+提交发布) → BasicTable(调查问题明细)。
  列结构:序号/调查问题/面向对象/非常满意(%)/满意(%)/一般(%)/不满意(%)/非常不满意(%)/操作。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="`${survey?.year ?? systemId} 年满意度调查`">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">填报时间:{{ survey?.reportDate ?? '-' }}</span>
          <span class="ml-6">数据来源:{{ survey?.dataSource ?? '-' }}</span>
          <span class="ml-6">调查问题数量:{{ survey?.questionCount ?? 0 }} 项</span>
          <span class="ml-6">有效调查问卷数:{{ survey?.validQuestionnaireCount ?? 0 }} 份</span>
          <span class="ml-6">
            综合满意度:<span class="text-lg font-medium" style="color: var(--ant-color-success)">
              {{ survey?.overallSatisfaction ?? 0 }}%
            </span>
          </span>
        </div>
        <a-button type="primary" @click="handleSubmitPublish">提交发布</a-button>
      </div>
    </Card>
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ year: survey?.year, isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.questionName">
          {{ record.questionName }}
        </a>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdList">
  import { onMounted, unref } from 'vue';
  import { Card } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { SatisfactionSurvey } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    MOCK_LIST,
    MOCK_QUESTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import InputForm from './form.vue';

  const { meta, params } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '调查问题明细',
  };

  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const systemId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();

  // TODO: 后端接入后改为按 id 调接口获取调查信息({id} 为记录编码 code)
  const survey: SatisfactionSurvey | undefined = MOCK_LIST.find((item) => item.code === systemId);

  /** 页签标题默认取菜单名,这里改为「XXXX 年满意度调查」 */
  const { setTitle } = useTabs(router);
  onMounted(() => {
    if (survey?.dataSource) {
      setTitle(`满意度调查-${survey.dataSource}`);
    }
  });

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '调查问题',
        field: 'questionName',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '调查问题', dataIndex: 'questionName', slot: 'firstColumn', width: 320 },
    { title: '面向对象', dataIndex: 'target', width: 110, align: 'center' },
    { title: '非常满意(%)', dataIndex: 'verySatisfied', width: 110, align: 'center' },
    { title: '满意(%)', dataIndex: 'satisfied', width: 100, align: 'center' },
    { title: '一般(%)', dataIndex: 'neutral', width: 100, align: 'center' },
    { title: '不满意(%)', dataIndex: 'dissatisfied', width: 110, align: 'center' },
    { title: '非常不满意(%)', dataIndex: 'veryDissatisfied', width: 120, align: 'center' },
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该问题？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable] = useTable({
    // TODO: 后端接入后按 {id}(调查年份)拉取该年的问题明细
    dataSource: MOCK_QUESTIONS,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 提交发布:提交当前调查形成版本快照(后端接入后实现) */
  function handleSubmitPublish() {
    // TODO: 后端接入后调用提交接口
    showMessage('提交发布:后端接入后实现');
  }

  /** 删除 */
  function handleDelete(_record: Recordable) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
