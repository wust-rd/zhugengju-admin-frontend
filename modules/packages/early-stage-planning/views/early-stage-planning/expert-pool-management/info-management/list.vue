<!--
  市住更局 —— 三师信息管理（列表页）

  三师库管理 · 子模块一：入库专家的增删改查。
  结构对齐设计稿：顶部三张统计卡（入库专家总数/正高级工程师/已入选三师，随列表数据实时统计）+
  BasicTable（专家姓名/单位名称/是否已入选三师搜索表单；批量导入 + 新增专家工具栏；
  查看/修改/删除操作列，删除带二次确认）。
  已接后端（modules/esp）：分页/统计/删除走接口层
  @jeesite/early-stage-planning/api/early-stage-planning/expert-pool（文档 §2）。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址：/early-stage-planning/expert-pool-management/info-management/list
   - 组件位置：/early-stage-planning/expert-pool-management/info-management/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 统计卡：入库专家总数 / 正高级工程师 / 已入选三师 -->
    <div class="grid grid-cols-3 gap-16px">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rd-8px b-1 b-solid b-gray-100 py-20px text-center shadow-sm"
      >
        <div class="flex items-baseline justify-center gap-4px">
          <span class="text-36px font-700 text-gray-900">{{ card.value }}</span>
          <span class="text-14px text-gray-500">个</span>
        </div>
        <div class="mt-4px text-14px text-gray-600">{{ card.label }}</div>
      </div>
    </div>

    <!-- 列表：搜索表单 + 工具栏 + 表格 -->
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>专家库</span>
      </template>
      <template #toolbar>
        <a-button @click="handleDownloadTemplate">
          <span class="inline-flex items-center gap-4px">
            <span class="i-ant-design:download-outlined"></span> 模板下载
          </span>
        </a-button>
        <a-button @click="handleImport">
          <span class="inline-flex items-center gap-4px">
            <span class="i-ant-design:upload-outlined"></span> 批量导入
          </span>
        </a-button>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增专家 </span>
        </a-button>
      </template>
      <template #selected="{ record }">
        <Tag :color="record.selected ? 'success' : 'default'">{{ record.selected ? '是' : '否' }}</Tag>
      </template>
    </BasicTable>

    <!-- 查看 / 新增 / 编辑 表单抽屉 -->
    <ExpertForm @register="registerDrawer" @success="handleSuccess" />
    <ExpertImport @register="registerImportModal" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolInfoManagementList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useModal } from '@jeesite/core/components/Modal';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { saveAs } from 'file-saver';
  import {
    espDictAreas,
    espExpertDelete,
    espExpertImportTemplate,
    espExpertImportTemplateFile,
    espExpertPage,
    espExpertStat,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import ExpertForm from './form.vue';
  import ExpertImport from './form-import.vue';

  const { showMessage } = useMessage();

  const areaOptions = ref<{ label: string; value: string }[]>([]);
  espDictAreas().then((areas) => {
    areaOptions.value = (areas ?? []).map((a) => ({
      label: a.areaName || a.key,
      value: a.areaCode || a.value,
    }));
  });

  /** 统计卡（接口 2.2；增删改后 reloadStat 刷新） */
  const stat = ref({ total: 0, senior: 0, selected: 0 });
  async function reloadStat() {
    stat.value = await espExpertStat();
  }
  reloadStat();
  const statCards = computed(() => [
    { label: '入库专家总数', value: stat.value.total },
    { label: '正高级工程师', value: stat.value.senior },
    { label: '已入选三师', value: stat.value.selected },
  ]);

  /** 表格列（对齐原型：姓名/性别/年龄/电话/身份证/专业领域/职称/单位/单位性质/入库时间/是否入选/操作） */
  const columns: BasicColumn[] = [
    { title: '专家姓名', dataIndex: 'name', width: 110 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '身份证号', dataIndex: 'idCard', width: 170 },
    { title: '专业领域', dataIndex: 'field', width: 110 },
    { title: '职称', dataIndex: 'title', width: 130 },
    { title: '单位名称', dataIndex: 'org', width: 170 },
    { title: '单位性质', dataIndex: 'orgType', width: 100 },
    { title: '所属片区', dataIndex: 'areaNames', width: 180, ellipsis: true },
    { title: '入库时间', dataIndex: 'joinDate', width: 110 },
    { title: '是否已入选三师', dataIndex: 'selected', width: 120, slot: 'selected' },
  ];

  /** 操作列：查看 / 修改 / 删除（与项目其它列表页同款 actions 配置） */
  const actionColumn: BasicColumn = {
    width: 140,
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => handleForm({ ...record, isView: true }) },
      { label: '修改', onClick: () => handleForm({ ...record }) },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该专家？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: espExpertPage,
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 110,
      schemas: [
        { label: '专家姓名', field: 'name', component: 'Input' },
        { label: '单位名称', field: 'org', component: 'Input' },
        {
          label: '所属片区',
          field: 'areaUid',
          component: 'Select',
          componentProps: () => ({
            options: areaOptions.value,
            allowClear: true,
            showSearch: true,
            optionFilterProp: 'label',
            placeholder: '请选择',
          }),
        },
        {
          label: '是否已入选三师',
          field: 'selected',
          component: 'Select',
          componentProps: {
            options: [
              { label: '是', value: 'yes' },
              { label: '否', value: 'no' },
            ],
            allowClear: true,
          },
        },
      ],
    },
  });

  /** 当前条件下重新加载表格 + 统计卡（增删改后调用） */
  function refreshTable() {
    reload();
    reloadStat();
  }

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerImportModal, { openModal: openImportModal }] = useModal();

  /** 新增/查看/修改（先预设底部按钮显隐：查看隐藏，再 openDrawer —— 打开动画期间翻转 showFooter 会打断渲染） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 表单保存回调（form.vue 已调 2.4 保存接口成功后才 emit） */
  function handleSuccess() {
    refreshTable();
  }

  /** 删除（接口 2.5，后端级联逻辑删除评价记录） */
  async function handleDelete(record: Recordable) {
    await espExpertDelete(record.id);
    refreshTable();
    showMessage('删除成功');
  }

  /** 模板下载（MinIO 文件经后端转发后 saveAs） */
  async function handleDownloadTemplate() {
    const info = await espExpertImportTemplate();
    const blob = await espExpertImportTemplateFile();
    saveAs(blob, info.fileName || '三师库批量导入模版.xlsx');
  }

  /** 批量导入 */
  function handleImport() {
    openImportModal(true);
  }
</script>
