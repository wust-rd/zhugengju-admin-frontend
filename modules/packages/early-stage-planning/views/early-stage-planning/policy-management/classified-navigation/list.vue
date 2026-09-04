<!--
  市住更局 —— 政策分类导航(政策库管理 列表页)

  布局对齐 sys/menu/index.vue(左树右表):
   - 左侧 BasicTree(#sidebar,搜索/工具栏/默认展开一级):政策层级/政策类型/业务领域三组分类
     (字典来自 /api/v1/dicts),叶子节点带数量(来自列表响应 nav 计数),选中后按该分类过滤表格;
   - 右侧上方为统计卡片(收录总数/现行有效/即将到期/已废止,来自列表响应 stats),
     下方为标准 BasicTable(标题/文号/发布单位/提交状态搜索表单);
   - 操作:查看/编辑(抽屉)、预览(新标签页打开文件)、废止、提交、删除。
  数据经 kd_server 接口获取(dev 经 /policy_api vite 代理),接口层见
  @jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy。
  菜单注册(菜单名称「政策分类导航」):
   - 链接地址:/early-stage-planning/policy-management/classified-navigation/list
   - 组件位置:/early-stage-planning/policy-management/classified-navigation/list(与链接地址一致)
   - 是否可见:显示
  支持 ?code=xxx 打开对应政策的查看抽屉(供检索页「关联政策」跳转,对齐原型 ?view=id)。
-->
<template>
  <PageWrapper :sidebarWidth="230">
    <template #sidebar>
      <BasicTree
        :title="getTitle.value"
        :search="true"
        :toolbar="true"
        :treeData="treeData"
        :treeDataSimpleMode="false"
        :defaultExpandLevel="1"
        v-model:selectedKeys="selectedKeys"
      />
    </template>

    <!-- 统计卡片 -->
    <div class="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card v-for="stat in statsCards" :key="stat.label" size="small">
        <div class="text-13px text-gray-500">{{ stat.label }}</div>
        <div class="mt-1 text-2xl font-semibold" :style="{ color: stat.color }">
          {{ stat.value }}
        </div>
      </Card>
    </div>

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
      <template #timeStatus="{ record }">
        <Tag :color="TIME_STATUS_COLOR[record.timeStatus] || 'default'" style="border-radius: 10px">
          {{ record.timeStatusLabel || '-' }}
        </Tag>
      </template>
      <template #submitStatus="{ record }">
        <Tag :color="SUBMIT_STATUS_COLOR[record.submitStatus] || 'default'" style="border-radius: 10px">
          {{ record.submitStatusLabel || '-' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="reload" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementClassifiedNavigationList">
  import { computed, onMounted, ref, unref, watch } from 'vue';
  import { Card, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { BasicTree, TreeItem } from '@jeesite/core/components/Tree';
  import { FormProps } from '@jeesite/core/components/Form';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type {
    Policy,
    PolicyNavCounts,
    PolicyStats,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import {
    SUBMIT_STATUS_COLOR,
    TIME_STATUS_COLOR,
    fetchDicts,
    policyAbolish,
    policyDelete,
    policyFileUrl,
    policyList,
    policySubmit,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import InputForm from './form.vue';

  const { currentRoute } = router;
  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '政策分类导航',
  };

  /** 分类导航树选中(叶子节点 id 形如 "policyLevel:national",分组节点 id 为维度名) */
  const selectedKeys = ref<string[]>([]);

  /** 字典(接口拉取):key 为维度名(policy_level 等) */
  const dicts = ref<Record<string, { label: string; value: string }[]>>({});

  /** 列表响应附带的统计与导航计数 */
  const stats = ref<PolicyStats>({ total: 0, effective: 0, expiring: 0, abolished: 0 });
  const navCounts = ref<PolicyNavCounts>({});

  /** 最近一次列表响应的记录(用于发布单位下拉选项) */
  const orgOptions = ref<{ label: string; value: string }[]>([]);

  /** 统计卡片(全量口径,来自后端 stats) */
  const statsCards = computed(() => [
    { label: '收录政策总数', value: stats.value.total, color: '#2563eb' },
    { label: '现行有效', value: stats.value.effective, color: '#059669' },
    { label: '即将到期', value: stats.value.expiring, color: '#d97706' },
    { label: '已废止', value: stats.value.abolished, color: '#dc2626' },
  ]);

  /** 分类导航树:三组分类(字典接口),叶子节点带响应 nav 计数 */
  const treeData = computed<TreeItem[]>(() =>
    (
      [
        ['policy_level', '政策层级', 'policyLevel'],
        ['policy_type', '政策类型', 'policyType'],
        ['business_area', '业务领域', 'businessArea'],
      ] as const
    ).map(([type, title, field]) => ({
      id: field,
      name: title,
      children: (dicts.value[type] || []).map((item) => ({
        id: `${field}:${item.value}`,
        name: `${item.label} (${navCounts.value[type]?.[item.value] || 0})`,
      })),
    })),
  );

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 90,
    schemas: [
      { label: '标题', field: 'title', component: 'Input' },
      { label: '文号', field: 'docNo', component: 'Input' },
      {
        label: '发布单位',
        field: 'sourceOrg',
        component: 'Select',
        componentProps: () => ({ options: orgOptions.value, allowClear: true }),
      },
      {
        label: '提交状态',
        field: 'submitStatus',
        component: 'Select',
        componentProps: () => ({ options: dicts.value.submit_status || [], allowClear: true }),
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '标题', dataIndex: 'title', width: 260 },
    { title: '文号', dataIndex: 'docNo', width: 150 },
    { title: '政策层级', dataIndex: 'policyLevelLabel', width: 90, align: 'center' },
    { title: '政策类型', dataIndex: 'policyTypeLabel', width: 100, align: 'center' },
    { title: '业务领域', dataIndex: 'businessAreaLabel', width: 100, align: 'center' },
    { title: '发布日期', dataIndex: 'publishDate', width: 110, align: 'center' },
    { title: '发布单位', dataIndex: 'sourceOrg', width: 180 },
    { title: '时效状态', dataIndex: 'timeStatus', width: 100, align: 'center', slot: 'timeStatus' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 260,
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
        label: '预览',
        onClick: () => handlePreview(record),
      },
      {
        label: '废止',
        ifShow: record.timeStatus !== 'abolished',
        popConfirm: {
          title: '废止后将从知识库检索中移除，列表仍保留。确认废止？',
          confirm: () => handleAbolish(record),
        },
      },
      {
        label: '提交',
        ifShow: record.submitStatus === 'pending',
        popConfirm: { title: '提交后将解析文件进入知识库，确认提交？', confirm: () => handleSubmitPolicy(record) },
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '将删除政策、文件和向量数据，不可恢复。确认删除？', confirm: () => handleDelete(record) },
      },
    ],
  };

  /** 列表接口:搜索表单 + 分类树选中 → kd_server /policies;顺带更新统计/导航计数/发布单位选项 */
  async function listData(params: any) {
    const data = await policyList({
      title: params.title,
      docNo: params.docNo,
      sourceOrg: params.sourceOrg,
      submitStatus: params.submitStatus,
      policyLevel: params.policyLevel,
      policyType: params.policyType,
      businessArea: params.businessArea,
      page: params.pageNo,
      pageSize: params.pageSize,
    });
    stats.value = data.stats;
    navCounts.value = data.nav;
    orgOptions.value = toOrgOptions(data.list);
    return { list: data.list, count: data.count };
  }

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: listData,
    beforeFetch: (params) => {
      // 分类树选中项合并进查询参数("字段:字典值",分组节点不带值则不过滤)
      if (selectedKeys.value.length) {
        const [field, value] = String(selectedKeys.value[0]).split(':');
        if (field && value) params[field] = value;
      }
      return params;
    },
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 分类树选中变化 → 刷新表格 */
  watch(selectedKeys, () => {
    reload();
  });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter(抽屉级);打开动画期间翻转会导致首次不弹(见对应 form.vue 头注释)
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 文件预览(新标签页打开) */
  function handlePreview(record: Recordable) {
    if (!record.fileId) {
      showMessage('没有文件');
      return;
    }
    window.open(policyFileUrl(record.fileId, true), '_blank');
  }

  /** 废止:调接口置时效状态并记录废止时间 */
  async function handleAbolish(record: Recordable) {
    await policyAbolish(record.code as string, dateUtil().format('YYYY-MM-DD'));
    showMessage('已废止');
    reload();
  }

  /** 提交入库 */
  async function handleSubmitPolicy(record: Recordable) {
    await policySubmit(record.code);
    showMessage('已提交，正在解析入库');
    reload();
  }

  /** 删除 */
  async function handleDelete(record: Recordable) {
    await policyDelete(record.code);
    showMessage('已删除');
    reload();
  }

  onMounted(async () => {
    // 字典(分类树/搜索表单);统计与导航计数由 listData 每次列表顺带更新
    dicts.value = await fetchDicts();

    // ?code=xxx 直接打开查看抽屉(检索页「关联政策」跳转入口)
    const code = unref(currentRoute).query.code as string | undefined;
    if (code) {
      handleForm({ code, isNewRecord: false, isView: true });
    }
  });

  function toOrgOptions(list: Policy[]) {
    return [...new Set(list.map((item) => item.sourceOrg).filter(Boolean))].map((org) => ({
      label: org as string,
      value: org as string,
    }));
  }
</script>
