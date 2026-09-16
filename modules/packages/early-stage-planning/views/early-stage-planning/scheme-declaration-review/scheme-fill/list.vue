<!--
  市住更局 —— 策划方案填报（片区策划申报审查 · 子模块一）

  页面对齐设计稿：顶部一层 Tab（1 已批准片区填报 / 2 待审查片区填报）。
  后端已对接（modules/esp，接口文档见后端 modules/esp/docs/接口文档-方案填报.md）：
   - 两 Tab 共用一张 BasicTable，按 isApprove 分开查询（1=已批准存量片区（默认）/
     2=待审查（新增填报）片区，后端语义：新增保存的片区进入 Tab②）；
   - 「新增」两 Tab 均显示（保存成功后自动切到 Tab②，新记录立即可见）；
   - 操作列：查看/编辑按 id 拉详情回显；删除仅 Tab② 显示（后端拒绝删除存量
     已批准片区，Tab① 不给入口）。
  新增 / 查看 / 编辑 均以组件方式切换到整页填报表单（form.vue），不新增路由与菜单注册；
  列表视图用 v-show 保留挂载（表格不卸载，搜索/分页状态与 reload 均不受切换影响）。
  注意：Tabs 需显式导入（本项目全局仅注册了 a-button/a-input，裸用 a-tabs 不会渲染）；
  contentClass 的 overflow-visible! 用于覆盖 PageWrapper 容器的 overflow-y:auto——
  祖先 overflow 非 visible 会使填报页操作栏的 sticky 吸顶失效（该容器本无高度约束，覆盖无副作用）。

  菜单注册（后台菜单管理，名称按需）：
   - 链接地址 / 组件位置：/early-stage-planning/scheme-declaration-review/scheme-fill/list
     （推荐，与文件名一致）；已注册成 …/index 的无需改——同目录 index.vue 为兼容别名。
   ⚠️ 组件位置必须与实际文件名精确一致——路由 dynamicImport 按「去扩展名后全等」
   匹配 views 下文件，配成不存在的文件名会整页 404。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px overflow-visible!">
    <!-- 列表视图（v-show：切到表单时不卸载，保留表格搜索/分页状态） -->
    <div v-show="!formVisible" class="flex flex-col gap-16px">
      <!-- 顶部 Tab：已批准片区填报（默认）/ 待审查片区填报（新增填报片区） -->
      <Tabs v-model:activeKey="activeTab">
        <Tabs.TabPane key="approved" tab="已批准片区填报" />
        <Tabs.TabPane key="reviewing" tab="待审查片区填报" />
      </Tabs>

      <!-- 填报列表（两 Tab 共用，isApprove 由 beforeFetch 注入） -->
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>填报列表</span>
        </template>
        <template #toolbar>
          <!-- 两 Tab 均可新增：新增保存的片区为待审查片区（后端 is_approve=2），
               保存成功后 handleSuccess 自动切到 Tab② 并刷新，新记录立即可见 -->
          <a-button type="primary" @click="handleForm({ isNewRecord: true })">
            <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增 </span>
          </a-button>
        </template>
        <!-- 片区功能定位：多维度胶囊并列展示 -->
        <template #funcType="{ record }">
          <span class="inline-flex flex-wrap items-center gap-4px">
            <span
              v-for="t in record.funcTypes"
              :key="t"
              class="inline-flex rd-4px px-6px py-2px text-12px font-500 text-gray-700"
              style="background: #eff6ff"
            >
              {{ t }}
            </span>
          </span>
        </template>
      </BasicTable>
    </div>

    <!-- 填报视图：新增 / 查看 / 编辑 整页表单（组件切换，不走路由） -->
    <SchemeForm v-if="formVisible" :record="formRecord" @success="handleSuccess" @back="handleBack" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillList">
  import { ref, watch } from 'vue';
  import { Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    schemeFillDelete,
    schemeFillPage,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import SchemeForm from './form.vue';

  const { showMessage } = useMessage();

  /** 当前 Tab：approved=已批准片区填报（isApprove=1）/ reviewing=待审查片区填报（isApprove=2） */
  const activeTab = ref('approved');

  /** 填报视图状态：formVisible=true 时整页显示表单，formRecord 为进入时记录快照（id + isView） */
  const formVisible = ref(false);
  const formRecord = ref<Recordable>({});

  /** 表格列（对齐设计稿） */
  const columns: BasicColumn[] = [
    { title: '片区名称', dataIndex: 'name', width: 120 },
    { title: '行政区', dataIndex: 'district', width: 100 },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 130, align: 'center' },
    { title: '片区功能定位', dataIndex: 'funcTypes', width: 160, slot: 'funcType' },
    { title: '片区批次', dataIndex: 'batch', width: 100 },
    { title: '总体投资估算（亿元）', dataIndex: 'invest', width: 160, align: 'center' },
    { title: '填报时间', dataIndex: 'reportTime', width: 150 },
    { title: '填报单位', dataIndex: 'reportOrg', width: 140 },
  ];

  /** 操作列：查看 / 编辑；删除仅 Tab②（后端拒绝删除存量已批准片区，Tab① 不给入口） */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => {
      const actions: Recordable[] = [
        { label: '查看', onClick: () => handleForm({ ...record, isView: true }) },
        { label: '编辑', onClick: () => handleForm({ ...record }) },
      ];
      if (activeTab.value === 'reviewing') {
        actions.push({
          label: '删除',
          color: 'error',
          popConfirm: { title: '是否确认删除该填报记录？', confirm: () => handleDelete(record) },
        });
      }
      return actions;
    },
  };

  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));
  /** 功能定位选项（对齐后端 esp 字典：TOD/COD/SOD/EOD/IOD/HOD/POD） */
  const FUNC_OPTIONS = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD', 'POD'].map((f) => ({ label: f, value: f }));
  const BATCH_OPTIONS = ['第一批', '第二批'].map((b) => ({ label: b, value: b }));

  const [registerTable, { reload }] = useTable({
    api: schemeFillPage,
    beforeFetch: (params: Recordable) => ({ ...params, isApprove: activeTab.value === 'approved' ? '1' : '2' }),
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 6, lg: 5 },
      labelWidth: 90,
      // 不折叠：四项 + 查询/重置一行平铺（lg 下 4×5 + 按钮列 4 = 24）
      showAdvancedButton: false,
      actionColOptions: { md: 6, lg: 4 },
      schemas: [
        { label: '片区名称', field: 'name', component: 'Input', componentProps: { placeholder: '请输入/选择' } },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: DISTRICT_OPTIONS, placeholder: '请选择', allowClear: true },
        },
        {
          label: '片区功能定位',
          field: 'funcType',
          component: 'Select',
          componentProps: { options: FUNC_OPTIONS, placeholder: '请选择', allowClear: true },
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: BATCH_OPTIONS, placeholder: '请选择', allowClear: true },
        },
      ],
    },
  });

  /** Tab 切换 → 按新 isApprove 重新查询（回到第一页） */
  watch(activeTab, () => {
    if (!formVisible.value) {
      void reload();
    }
  });

  /** 新增/查看/修改：切换到整页表单（组件形式，不走路由）；详情由 form.vue 按 id 拉取 */
  function handleForm(record: Recordable) {
    formRecord.value = record;
    formVisible.value = true;
  }

  /** 返回列表（取消/头部返回/详情加载失败） */
  function handleBack() {
    formVisible.value = false;
  }

  /** 表单保存回调：刷新列表（新落在待审查 Tab②，可在该 Tab 查看） */
  function handleSuccess(saved: Recordable) {
    void reload();
    formVisible.value = false;
    // 新增落待审查 Tab：切过去让用户立即看到刚保存的记录
    if (saved.isNewRecord) {
      activeTab.value = 'reviewing';
    }
  }

  /** 删除（仅待审查片区；后端校验存量已批准片区不可删） */
  async function handleDelete(record: Recordable) {
    try {
      await schemeFillDelete(String(record.id));
      showMessage('删除成功');
      void reload();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '删除失败');
    }
  }
</script>
