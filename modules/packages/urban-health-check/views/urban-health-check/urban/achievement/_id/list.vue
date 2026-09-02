<!--
  市住更局 —— 体检成果 show 页(某目录下的分析明细)

  规划路由(RESTful,后端隐藏菜单,待注册):
   - 链接地址:/urban-health-check/urban/achievement/{id}({id}=记录编码 code,与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/achievement/_id/list(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂「体检成果管理」以点亮侧边栏
  页面结构:Card(目录信息+提交发布) → BasicTable(分析明细)。
  列结构:序号/一级维度/分析描述(链接)/程度范围(Tag:一般/严重/特别严重)/操作。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="achievement?.catalog || systemId">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">{{ achievement?.year ?? '-' }} 年</span>
          <span class="ml-6">填报时间:{{ achievement?.reportDate ?? '-' }}</span>
          <span class="ml-6">
            提交状态:<Tag
              :color="achievement?.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'blue' : 'blue'"
              :variant="achievement?.submitStatus === SUBMIT_STATUS.SUBMITTED ? 'solid' : 'outlined'"
              style="border-radius: 10px"
            >
              {{ achievement?.submitStatus === SUBMIT_STATUS.SUBMITTED ? '已提交' : '待提交' }}
            </Tag>
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
        <a-button type="primary" @click="handleForm({ catalog: achievement?.catalog, isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.analysis">
          {{ record.analysis }}
        </a>
      </template>
      <template #degree="{ record }">
        <Tag :color="DEGREE_COLOR[record.degree] || 'default'" style="border-radius: 10px">
          {{ record.degree || '-' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementIdList">
  import { onMounted, unref } from 'vue';
  import { Card, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { Achievement } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    ACHIEVEMENT_DEGREE,
    MOCK_ANALYSES,
    MOCK_LIST,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import { SUBMIT_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { meta, params } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '成果分析明细',
  };

  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const systemId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();

  // TODO: 后端接入后改为按 id 调接口获取成果目录信息({id} 为记录编码 code)
  const achievement: Achievement | undefined = MOCK_LIST.find((item) => item.code === systemId);

  /** 页签标题默认取菜单名,这里改为成果目录名 */
  const { setTitle } = useTabs(router);
  onMounted(() => {
    if (achievement?.catalog) {
      setTitle(achievement.catalog);
    }
  });

  /** 程度范围 Tag 颜色 */
  const DEGREE_COLOR: Record<string, string> = {
    [ACHIEVEMENT_DEGREE.GENERAL]: 'processing',
    [ACHIEVEMENT_DEGREE.SEVERE]: 'warning',
    [ACHIEVEMENT_DEGREE.EXTREME]: 'error',
  };

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '一级维度',
        field: 'dim1',
        component: 'Input',
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '一级维度', dataIndex: 'dim1', width: 130 },
    { title: '分析描述', dataIndex: 'analysis', slot: 'firstColumn' },
    { title: '程度范围', dataIndex: 'degree', width: 120, align: 'center', slot: 'degree' },
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
        popConfirm: { title: '是否确认删除该分析记录？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable] = useTable({
    // TODO: 后端接入后按 {id}(记录编码 code)拉取该目录的分析明细
    dataSource: MOCK_ANALYSES,
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
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 提交发布:提交当前成果目录形成版本快照(后端接入后实现,并刷新提交状态) */
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
