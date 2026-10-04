<!--
  市住更局 —— 满意度调查（列表页，原型图1）

  菜单注册（菜单名称「满意度调查」）:
   - 链接地址:/urban-health-check/urban/satisfaction-survey/list
   - 组件位置:/urban-health-check/urban/satisfaction-survey/list(与链接地址一致)
   - 是否可见:显示
  接口已接入：surveyPage / surveyDelete（/cityCheck/survey）。
  列:序号/调查年份/填报时间/数据来源/调查问题数量/有效调查问卷数/综合满意度/提交状态/操作。
  查看/编辑下钻 RESTful 页面 /satisfaction-survey/{id}（编辑页=原型图2）；已提交只读（仅查看）。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #submitStatus="{ record }">
        <Tag v-if="isSubmitted(record)" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
        <Tag v-else color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
      </template>
      <template #overallSatisfaction="{ record }">
        <span v-if="record.overallSatisfaction != null" class="font-medium" style="color: var(--ant-color-success)">
          {{ record.overallSatisfaction }}
        </span>
        <span v-else>-</span>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyList">
  import { unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { SatisfactionSurvey } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    surveyDelete,
    surveyPage,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    SUBMIT_STATUS,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  /** 下钻路由基址（编辑页=原型图2，RESTful {id}） */
  const ROUTE_BASE = '/urban-health-check/urban/satisfaction-survey';

  const { meta } = unref(router.currentRoute);
  const go = useGo();
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '满意度调查',
  };

  /** 后端 submitStatus 为数字，SUBMIT_STATUS 常量为字符串 → 统一 String 比较 */
  function isSubmitted(record: Recordable) {
    return String(record.submitStatus) === SUBMIT_STATUS.SUBMITTED;
  }

  /** 填报时间展示到日（后端返回 "yyyy-MM-dd HH:mm" / ISO 均取前 10 位） */
  function formatFillDate(value: any) {
    if (value == null || value === '') return '-';
    return String(value).slice(0, 10);
  }

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '调查年份',
        field: 'year',
        component: 'Select',
        componentProps: { options: YEAR_OPTIONS, allowClear: true },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '调查年份', dataIndex: 'surveyYear', width: 110, align: 'center' },
    { title: '填报时间', dataIndex: 'fillDate', width: 120, align: 'center', format: formatFillDate },
    { title: '数据来源', dataIndex: 'dataSource', width: 180, ellipsis: true },
    { title: '调查问题数量（项）', dataIndex: 'questionCount', width: 150, align: 'center' },
    { title: '有效调查问卷数（份）', dataIndex: 'validQuestionnaireCount', width: 160, align: 'center' },
    { title: '综合满意度（%）', dataIndex: 'overallSatisfaction', width: 140, align: 'center', slot: 'overallSatisfaction' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列（已提交只读，仅查看） */
  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleDetail(record, true),
      },
      {
        label: '编辑',
        ifShow: () => !isSubmitted(record),
        onClick: () => handleDetail(record, false),
      },
      {
        label: '删除',
        color: 'error',
        ifShow: () => !isSubmitted(record),
        popConfirm: { title: '是否确认删除该记录？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: surveyPage,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 新增调查（抽屉只管表8字段；问题明细在编辑页维护） */
  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 查看/编辑 → 编辑页(原型图2)；查看态加 ?view=1 整页只读 */
  function handleDetail(record: Recordable, isView: boolean) {
    go(`${ROUTE_BASE}/${record.id}${isView ? '?view=1' : ''}`);
  }

  /** 删除 */
  async function handleDelete(record: SatisfactionSurvey) {
    try {
      await surveyDelete([record.id!]);
      showMessage('删除成功');
      reload();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  /** 表单保存成功回调：刷新列表 */
  function handleSuccess() {
    reload();
  }
</script>
