<!--
  市住更局 —— 区级体检指标项结果 编辑页（某体系的结果列表）

  路由(RESTful,隐藏菜单):
   - 链接地址:/urban-health-check/district/indicator-result/{id}({id}=体系主键)
   - 组件位置:/urban-health-check/district/indicator-result/_id/list
  页面结构:黄条(年份/片区/指标项数/填报进度+提交结果/撤回) → BasicTable(结果行)。
  点「编辑/查看」在当前页内联切换为编辑表单（form.vue 组件，非路由非抽屉；
  保存/返回回到列表）。结果行来自 result/page（未填报行 id=null，按 itemId 保存）。
  接口：districtSetInfo + districtResultPage/List + districtResultSubmit/CancelSubmit。
-->
<template>
  <PageWrapper>
    <!-- 编辑/查看视图（页面内联切换，非路由非抽屉） -->
    <InputForm
      v-if="editingRecord"
      :key="editingRecord.itemId + (editingRecord.isView ? '-v' : '')"
      :record="editingRecord"
      @success="onEditSaved"
      @back="editingRecord = undefined"
    />

    <template v-else>
    <!-- 顶部黄条信息栏 -->
    <Card class="mb-3">
      <div
        class="flex items-center justify-between px-4 py-3 flex-wrap gap-y-2"
        style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px"
      >
        <div class="flex items-center flex-wrap" style="column-gap: 48px">
          <span>体检年份：<span class="font-medium">{{ set?.setYear ?? '-' }}年</span></span>
          <span>体检片区：<span class="font-medium">{{ set?.areaName ?? '-' }}</span></span>
          <span>指标项数量：<span class="font-medium">{{ set?.indicatorCount ?? 0 }} 项</span></span>
          <span>
            填报进度：<span class="font-medium" style="color: #1677ff">{{ set?.fillProgress ?? 0 }}%</span>
          </span>
        </div>
        <div class="flex items-center">
          <a-button
            v-if="pendingIds.length > 0"
            type="primary"
            class="mr-2"
            :loading="submitting"
            @click="handleSubmitAll"
          >
            提交结果
          </a-button>
          <a-button v-if="submittedIds.length > 0" :loading="canceling" @click="handleCancelAll">撤回</a-button>
        </div>
      </div>
    </Card>

    <!-- 结果表格 -->
    <Card>
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #firstColumn="{ record }">
          <a
            :class="{ 'text-gray-400': record.submitStatus === 1 }"
            @click="handleForm(record, record.submitStatus === 1)"
            :title="record.itemName"
          >
            {{ record.itemName }}
          </a>
        </template>

        <template #resultValue="{ record }">
          <span v-if="record.resultValue != null">{{ record.resultValue }}</span>
          <span v-else>-</span>
        </template>
        <template #evaluateResult="{ record }">
          <template v-if="record.evaluateResult">
            <Tag :color="EVAL_COLOR[record.evaluateResult] || 'default'" style="border-radius: 10px">
              {{ record.evaluateResult }}
            </Tag>
          </template>
          <span v-else>-</span>
        </template>
        <template #warningStatus="{ record }">
          <template v-if="record.warningStatus">
            <Tag
              :color="record.warningStatus === '红色预警' ? 'error' : record.warningStatus === '黄色预警' ? 'warning' : 'success'"
              style="border-radius: 10px"
            >
              {{ record.warningStatus }}
            </Tag>
          </template>
          <span v-else>-</span>
        </template>
        <template #submitStatus="{ record }">
          <Tag v-if="record.submitStatus === 1" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
          <Tag v-else-if="record.resultValue != null" color="orange" variant="solid" style="border-radius: 10px">待提交</Tag>
          <span v-else style="color: #999">未填报</span>
        </template>
      </BasicTable>
    </Card>
    </template>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorResultIdList">
  import { computed, onActivated, onMounted, ref, unref } from 'vue';
  import { Card, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import InputForm from './form.vue';
  import type { DistrictResult } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-result';
  import {
    districtResultCancelSubmit,
    districtResultList,
    districtResultPage,
    districtResultSubmit,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-result';
  import {
    districtSetInfo,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import { WARNING_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';

  const { params } = unref(router.currentRoute);
  const setId = ((params.id ?? params.code) as string) || '';

  const { showMessage } = useMessage();
  const { setTitle } = useTabs(router);

  /** 体系信息（黄条） */
  const set = ref<Recordable>();
  /** 全量结果行（批量提交/撤回统计用） */
  const allRows = ref<DistrictResult[]>([]);

  const pendingIds = computed(() =>
    allRows.value.filter((r) => r.id && r.submitStatus !== 1).map((r) => r.id!),
  );
  const submittedIds = computed(() =>
    allRows.value.filter((r) => r.id && r.submitStatus === 1).map((r) => r.id!),
  );

  /** 评估结果 Tag 配色（沿用市级口径） */
  const EVAL_COLOR: Record<string, string> = {
    很好: 'success',
    较好: 'processing',
    一般: 'warning',
    不足: 'error',
    无标准: 'default',
  };

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
      const info = await districtSetInfo(setId);
      set.value = info;
      setTitle(`${info.areaName ?? ''}片区指标项结果`);
      allRows.value = await districtResultList(setId);
      reload();
    } catch (e: any) {
      showMessage(e?.message || '加载体系信息失败', 'error');
    }
  }

  /** 搜索表单（后端筛选） */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      { label: '指标项', field: 'itemName', component: 'Input' },
      {
        label: '预警状态',
        field: 'warningStatus',
        component: 'Select',
        componentProps: {
          options: [WARNING_STATUS.RED, WARNING_STATUS.YELLOW, WARNING_STATUS.NORMAL].map((v) => ({ label: v, value: v })),
          allowClear: true,
        },
      },
      {
        label: '评估结果',
        field: 'evaluateResult',
        component: 'Select',
        componentProps: {
          options: ['很好', '较好', '一般', '不足', '无标准'].map((v) => ({ label: v, value: v })),
          allowClear: true,
        },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'itemNo', width: 70, align: 'center' },
    { title: '指标项', dataIndex: 'itemName', slot: 'firstColumn', minWidth: 260, ellipsis: true },
    { title: '指标单位', dataIndex: 'itemUnit', width: 100, align: 'center' },
    { title: '指标值', dataIndex: 'resultValue', width: 110, align: 'center', slot: 'resultValue' },
    { title: '标准值', dataIndex: 'standardValue', width: 100, align: 'center' },
    { title: '评估结果', dataIndex: 'evaluateResult', width: 100, align: 'center', slot: 'evaluateResult' },
    { title: '预警状态', dataIndex: 'warningStatus', width: 110, align: 'center', slot: 'warningStatus' },
    { title: '提交状态', dataIndex: 'submitStatus', width: 100, align: 'center', slot: 'submitStatus' },
  ];

  const actionColumn: BasicColumn = {
    width: 130,
    actions: (record: Recordable) => [
      {
        label: '编辑',
        onClick: () => handleForm(record, false),
      },
      {
        label: '查看',
        onClick: () => handleForm(record, true),
      },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: districtResultPage,
    beforeFetch: (params) => ({ ...params, setId }),
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  /** 编辑/查看 → 页面内切换到编辑视图（已提交行只读） */
  const editingRecord = ref<Recordable>();
  function handleForm(record: Recordable, isView: boolean) {
    editingRecord.value = { ...record, setId, isView };
  }

  /** 保存成功 → 返回列表并刷新统计 */
  async function onEditSaved() {
    editingRecord.value = undefined;
    await load();
  }

  /** 批量提交全部已填报未提交行 */
  const submitting = ref(false);
  async function handleSubmitAll() {
    submitting.value = true;
    try {
      const { submitCount } = await districtResultSubmit(pendingIds.value) as any;
      showMessage(`提交成功（${submitCount ?? pendingIds.value.length} 项）`);
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  /** 撤回全部已提交行 */
  const canceling = ref(false);
  async function handleCancelAll() {
    canceling.value = true;
    try {
      await districtResultCancelSubmit(submittedIds.value);
      showMessage('已撤回');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '撤回失败', 'error');
    } finally {
      canceling.value = false;
    }
  }
</script>
