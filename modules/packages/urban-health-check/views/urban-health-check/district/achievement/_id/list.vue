<!--
  市住更局 —— 区级体检成果 编辑页（一成果挂五类清单页签，原型图2~5）

  路由(RESTful,隐藏菜单):
   - 链接地址:/urban-health-check/district/achievement/{id}({id}=成果目录主键)
   - 组件位置:/urban-health-check/district/achievement/_id/list
  页面结构:黄条(年份/片区/填报单位+提交结果/撤回/打包下载) → 五页签
   (问题整治/发展机遇/更新诉求=共用清单明细[描述+维度|机遇类型]、
    基础资料库[分组/文档/多附件]、储备建议库[项目信息+导入导出])。
  已提交整页只读（黄条可撤回）。原型上的程度范围/关联指标项后端无字段（用户确认按后端做）；
  自动代入/批量导出区级无接口，按钮提示开发中；黄条「打包下载」走 archive/download。
-->
<template>
  <PageWrapper>
    <!-- 顶部黄条信息栏 -->
    <Card class="mb-3">
      <div
        class="flex items-center justify-between px-4 py-3 flex-wrap gap-y-2"
        style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px"
      >
        <div class="flex items-center flex-wrap" style="column-gap: 40px">
          <span>体检年份：<span class="font-medium">{{ catalog?.setYear ?? '-' }}年</span></span>
          <span>体检片区：<span class="font-medium">{{ catalog?.areaName ?? '-' }}</span></span>
          <span class="text-gray-500">填报单位：{{ catalog?.fillUnit ?? '-' }}</span>
        </div>
        <div class="flex items-center">
          <template v-if="!readOnly">
            <a-button type="primary" class="mr-2" :loading="submitting" @click="handleSubmitCatalog">提交结果</a-button>
          </template>
          <template v-else-if="isSubmitted">
            <a-button class="mr-2" :loading="canceling" @click="handleCancelSubmit">撤回</a-button>
            <Tag color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
          </template>
          <a-button class="ml-3" :loading="archiving" @click="handleArchive">打包下载</a-button>
        </div>
      </div>
    </Card>

    <Card>
      <Tabs v-model:active-key="activeTab">
        <Tabs.TabPane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.name }}
            <Tag class="ml-1" style="border-radius: 10px">{{ tab.count }}</Tag>
          </template>

          <!-- 三类清单明细（共用结构，按类型切换维度/机遇类型列） -->
          <template v-if="tab.key.startsWith('item:')">
            <div class="flex items-center justify-between mb-3 flex-wrap" style="column-gap: 12px">
              <div class="flex items-center" style="column-gap: 12px">
                <template v-if="tab.key === 'item:1'">
                  <span class="filter-label">对应体检维度</span>
                  <Select v-model:value="dimFilter" placeholder="请选择" allow-clear :options="dimOptions" style="width: 170px" />
                  <a-button type="primary" @click="appliedDim = dimFilter">查询</a-button>
                  <a-button @click="dimFilter = undefined; appliedDim = undefined">重置</a-button>
                </template>
              </div>
              <div class="flex items-center">
                <a-button v-if="!readOnly" type="primary" class="mr-2" @click="handleItemForm({ isNewRecord: true })">
                  <Icon icon="i-fluent:add-12-filled" /> 新增
                </a-button>
                <a-button class="mr-2" @click="devPending">自动代入</a-button>
                <a-button @click="devPending">批量导出</a-button>
              </div>
            </div>
            <BasicTable @register="registerItemTable" :showIndexColumn="false">
              <template #firstColumn="{ record }">
                <a @click="handleItemForm({ ...record, isNewRecord: false, isView: true })" :title="record.itemDesc">
                  {{ record.itemDesc }}
                </a>
              </template>
            </BasicTable>
          </template>

          <!-- 基础资料库 -->
          <template v-else-if="tab.key === 'base'">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs" style="color: #999">按资料分组归档基础文档，每条可挂多个附件</span>
              <a-button v-if="!readOnly" type="primary" @click="handleBaseForm({ isNewRecord: true })">
                <Icon icon="i-fluent:add-12-filled" /> 新增
              </a-button>
            </div>
            <BasicTable @register="registerBaseTable" :showIndexColumn="false">
              <template #firstColumn="{ record }">
                <a @click="handleBaseForm({ ...record, isNewRecord: false, isView: true })" :title="record.docName">
                  {{ record.docName }}
                </a>
              </template>
              <template #fileCount="{ record }">
                <span v-if="record.fileCount">{{ record.fileCount }} 个</span>
                <span v-else>-</span>
              </template>
            </BasicTable>
          </template>

          <!-- 储备建议库 -->
          <template v-else>
            <div class="flex items-center justify-between mb-3">
              <a-button v-if="!readOnly" type="primary" @click="handleStockForm({ isNewRecord: true })">
                <Icon icon="i-fluent:add-12-filled" /> 新增
              </a-button>
              <div class="flex items-center">
                <a-button class="mr-2" @click="handleStockTemplate">下载模板</a-button>
                <a-button v-if="!readOnly" :loading="importing" @click="stockImportVisible = true">一键导入</a-button>
              </div>
            </div>
            <BasicTable @register="registerStockTable" :showIndexColumn="false">
              <template #firstColumn="{ record }">
                <a @click="handleStockForm({ ...record, isNewRecord: false, isView: true })" :title="record.projectName">
                  {{ record.projectName }}
                </a>
              </template>
            </BasicTable>
          </template>
        </Tabs.TabPane>
      </Tabs>
    </Card>

    <!-- 行弹窗 -->
    <ItemForm :read-only="readOnly" :item-type="activeTab" @register="registerItemDrawer" @success="load" />
    <BaseForm :read-only="readOnly" @register="registerBaseDrawer" @success="load" />
    <StockForm :read-only="readOnly" @register="registerStockDrawer" @success="load" />

    <!-- 储备库导入弹窗（整单替换） -->
    <Modal
      v-model:open="stockImportVisible"
      title="一键导入储备项目"
      centered
      :confirm-loading="importing"
      ok-text="开始导入"
      :ok-button-props="{ disabled: !importFile }"
      cancel-text="取消"
      @ok="doStockImport"
    >
      <div class="pb-2">
        请先<a @click="handleStockTemplate">下载导入模板</a>，按模板填写后上传；导入将整单替换当前储备项目。
      </div>
      <Upload :before-upload="beforeStockImport" :max-count="1" accept=".xlsx,.xls" @remove="importFile = undefined">
        <a-button>
          <Icon icon="ant-design:upload-outlined" /> 选择 Excel 文件
        </a-button>
      </Upload>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementIdList">
  import { computed, onActivated, onMounted, ref, unref, watch } from 'vue';
  import { Card, Modal, Select, Tabs, Tag, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type {
    DistrictAchievement,
    DistrictAchievementBase,
    DistrictAchievementItem,
    DistrictAchievementStock,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    districtAchievementBaseList,
    districtAchievementCancelSubmit,
    districtAchievementInfo,
    districtAchievementItemList,
    districtAchievementItemSave,
    districtAchievementStockImport,
    districtAchievementStockList,
    districtAchievementStockTemplate,
    districtAchievementSubmit,
    TAB_DEFS,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import ItemForm from './item-form.vue';
  import BaseForm from './base-form.vue';
  import StockForm from './stock-form.vue';

  const { params } = unref(router.currentRoute);
  const catalogId = ((params.id ?? params.code) as string) || '';

  const { showMessage, createMessage } = useMessage();
  const { setTitle } = useTabs(router);

  /** 成果目录信息（黄条 + 页签计数） */
  const catalog = ref<DistrictAchievement>();
  const isSubmitted = computed(() => String(catalog.value?.submitStatus) === '1');
  const readOnly = computed(() => isSubmitted.value);

  /** 页签（计数取目录冗余列） */
  const activeTab = ref<string>('item:1');
  const tabs = computed(() => [
    { key: 'item:1', name: '问题整治清单', count: catalog.value?.problemCount ?? 0 },
    { key: 'item:2', name: '发展机遇清单', count: catalog.value?.opportunityCount ?? 0 },
    { key: 'item:3', name: '更新诉求清单', count: catalog.value?.demandCount ?? 0 },
    { key: 'base', name: '基础资料库', count: catalog.value?.baseCount ?? 0 },
    { key: 'stock', name: '储备建议库', count: catalog.value?.stockCount ?? 0 },
  ]);

  onMounted(load);

  let skipFirstActivate = true;
  onActivated(() => {
    if (skipFirstActivate) {
      skipFirstActivate = false;
      return;
    }
    load();
  });

  async function load() {
    try {
      const info = await districtAchievementInfo(catalogId);
      catalog.value = info;
      setTitle(`${info.areaName ?? ''}体检成果`);
      await loadActive();
    } catch (e: any) {
      showMessage(e?.message || '加载成果信息失败', 'error');
    }
  }

  // ==================== 三类清单明细 ====================

  /** 当前清单类型（item:1/2/3） */
  const itemType = computed(() => (activeTab.value.startsWith('item:') ? activeTab.value.slice(5) : '1'));

  const items = ref<DistrictAchievementItem[]>([]);
  async function loadItems() {
    items.value = await districtAchievementItemList(catalogId, itemType.value);
  }

  /** 体检维度筛选（本地，仅问题整治页签） */
  const dimFilter = ref<string>();
  const appliedDim = ref<string>();
  const dimOptions = computed(() => {
    const names = new Set<string>();
    items.value.forEach((it) => it.firstDimension && names.add(it.firstDimension));
    return [...names].sort().map((n) => ({ label: n, value: n }));
  });
  const filteredItems = computed(() => {
    const dim = appliedDim.value;
    if (!dim) return items.value;
    return items.value.filter((it) => it.firstDimension === dim);
  });

  const itemColumns = computed<BasicColumn[]>(() => {
    const cols: BasicColumn[] = [
      { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
      { title: '清单内容描述', dataIndex: 'itemDesc', slot: 'firstColumn', minWidth: 320, ellipsis: true },
    ];
    if (itemType.value === '1') {
      cols.push({ title: '对应体检维度', dataIndex: 'firstDimension', width: 130, align: 'center' });
    } else if (itemType.value === '2') {
      cols.push({ title: '机遇类型', dataIndex: 'resourceType', width: 130, align: 'center' });
    }
    return cols;
  });

  const [registerItemDrawer, { openDrawer: openItemDrawer, setDrawerProps: setItemDrawerProps }] = useDrawer();
  const [registerItemTable, { reload: reloadItemTable, setColumns: setItemColumns }] = useTable({
    dataSource: filteredItems,
    columns: itemColumns,
    actionColumn: {
      width: 140,
      actions: (record: Recordable) => [
        { label: '查看', onClick: () => handleItemForm({ ...record, isNewRecord: false, isView: true }) },
        {
          label: '编辑',
          ifShow: () => !readOnly.value,
          onClick: () => handleItemForm({ ...record, isNewRecord: false }),
        },
        {
          label: '删除',
          color: 'error',
          ifShow: () => !readOnly.value,
          popConfirm: { title: '是否确认删除该条明细？', confirm: () => handleItemDelete(record) },
        },
      ],
    } as BasicColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 20 },
    canResize: true,
  });

  function handleItemForm(record: Recordable) {
    setItemDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openItemDrawer(true, { ...record, catalogId });
  }

  async function handleItemDelete(record: Recordable) {
    const { districtAchievementItemDelete } = await import(
      '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement'
    );
    try {
      await districtAchievementItemDelete([record.id]);
      showMessage('删除成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  // ==================== 基础资料库 ====================

  const bases = ref<DistrictAchievementBase[]>([]);
  async function loadBases() {
    bases.value = await districtAchievementBaseList(catalogId);
  }

  const baseColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '资料分组', dataIndex: 'groupName', width: 150 },
    { title: '文档名称', dataIndex: 'docName', slot: 'firstColumn', minWidth: 260, ellipsis: true },
    { title: '附件数', dataIndex: 'fileCount', width: 90, align: 'center', slot: 'fileCount' },
    {
      title: '录入时间',
      dataIndex: 'inputTime',
      width: 110,
      align: 'center',
      format: (v: any) => (v == null || v === '' ? '-' : String(v).slice(0, 10)),
    },
  ];

  const [registerBaseDrawer, { openDrawer: openBaseDrawer, setDrawerProps: setBaseDrawerProps }] = useDrawer();
  const [registerBaseTable, { reload: reloadBaseTable }] = useTable({
    dataSource: bases,
    columns: baseColumns,
    actionColumn: {
      width: 140,
      actions: (record: Recordable) => [
        { label: '查看', onClick: () => handleBaseForm({ ...record, isNewRecord: false, isView: true }) },
        {
          label: '编辑',
          ifShow: () => !readOnly.value,
          onClick: () => handleBaseForm({ ...record, isNewRecord: false }),
        },
        {
          label: '删除',
          color: 'error',
          ifShow: () => !readOnly.value,
          popConfirm: { title: '删除后附件记录一并删除，是否确认？', confirm: () => handleBaseDelete(record) },
        },
      ],
    } as BasicColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 20 },
    canResize: true,
  });

  function handleBaseForm(record: Recordable) {
    setBaseDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openBaseDrawer(true, { ...record, catalogId });
  }

  async function handleBaseDelete(record: Recordable) {
    const { districtAchievementBaseDelete } = await import(
      '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement'
    );
    try {
      await districtAchievementBaseDelete([record.id]);
      showMessage('删除成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  // ==================== 储备建议库 ====================

  const stocks = ref<DistrictAchievementStock[]>([]);
  async function loadStocks() {
    stocks.value = await districtAchievementStockList(catalogId);
  }

  const stockColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '项目名称', dataIndex: 'projectName', slot: 'firstColumn', minWidth: 220, ellipsis: true },
    { title: '改造类型', dataIndex: 'reformType', width: 120, align: 'center' },
    { title: '投资额（万元）', dataIndex: 'investAmount', width: 130, align: 'center' },
    { title: '建设内容', dataIndex: 'buildContent', minWidth: 240, ellipsis: true },
  ];

  const [registerStockDrawer, { openDrawer: openStockDrawer, setDrawerProps: setStockDrawerProps }] = useDrawer();
  const [registerStockTable, { reload: reloadStockTable }] = useTable({
    dataSource: stocks,
    columns: stockColumns,
    actionColumn: {
      width: 140,
      actions: (record: Recordable) => [
        { label: '查看', onClick: () => handleStockForm({ ...record, isNewRecord: false, isView: true }) },
        {
          label: '编辑',
          ifShow: () => !readOnly.value,
          onClick: () => handleStockForm({ ...record, isNewRecord: false }),
        },
        {
          label: '删除',
          color: 'error',
          ifShow: () => !readOnly.value,
          popConfirm: { title: '是否确认删除该项目？', confirm: () => handleStockDelete(record) },
        },
      ],
    } as BasicColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 20 },
    canResize: true,
  });

  function handleStockForm(record: Recordable) {
    setStockDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openStockDrawer(true, { ...record, catalogId });
  }

  async function handleStockDelete(record: Recordable) {
    const { districtAchievementStockDelete } = await import(
      '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement'
    );
    try {
      await districtAchievementStockDelete([record.id]);
      showMessage('删除成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  const stockImportVisible = ref(false);
  const importing = ref(false);
  const importFile = ref<File>();

  function beforeStockImport(file: File) {
    importFile.value = file;
    return false;
  }

  async function handleStockTemplate() {
    await districtAchievementStockTemplate();
  }

  async function doStockImport() {
    if (!importFile.value) return;
    importing.value = true;
    try {
      await districtAchievementStockImport(catalogId, importFile.value);
      showMessage('导入成功');
      stockImportVisible.value = false;
      await load();
    } catch (e: any) {
      showMessage(e?.message || '导入失败', 'error');
    } finally {
      importing.value = false;
    }
  }

  // ==================== 页签切换加载 / 提交撤回 / 打包 ====================

  async function loadActive() {
    if (activeTab.value.startsWith('item:')) {
      // 三清单共用表格：按当前类型切换维度/机遇类型列（useTable 不响应 computed 列）
      setItemColumns(itemColumns.value);
      await loadItems();
      reloadItemTable();
    } else if (activeTab.value === 'base') {
      await loadBases();
      reloadBaseTable();
    } else {
      await loadStocks();
      reloadStockTable();
    }
  }

  watch(activeTab, loadActive);

  const submitting = ref(false);
  async function handleSubmitCatalog() {
    submitting.value = true;
    try {
      await districtAchievementSubmit(catalogId);
      showMessage('提交成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  const canceling = ref(false);
  async function handleCancelSubmit() {
    canceling.value = true;
    try {
      await districtAchievementCancelSubmit(catalogId);
      showMessage('已撤回，可继续编辑');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '撤回失败', 'error');
    } finally {
      canceling.value = false;
    }
  }

  /** 打包下载档案（后端 zip 流：五类清单+基础资料附件） */
  const archiving = ref(false);
  async function handleArchive() {
    archiving.value = true;
    try {
      const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
      const url = `${base}/js/cityCheck/district/achievement/archive/download?id=${encodeURIComponent(catalogId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const dispo = res.headers.get('content-disposition') || '';
      const m = /filename\*=utf-8''([^;]+)/i.exec(dispo);
      const name = m ? decodeURIComponent(m[1]) : `${catalog.value?.areaName ?? '体检成果'}档案.zip`;
      const href = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href));
    } catch (e: any) {
      showMessage(e?.message || '打包下载失败', 'error');
    } finally {
      archiving.value = false;
    }
  }

  /** 自动代入/批量导出区级无接口，按先例提示开发中 */
  function devPending() {
    createMessage.info('功能开发中');
  }
</script>
<style lang="less" scoped>
  .filter-label {
    color: rgba(0, 0, 0, 0.88);
  }
</style>
