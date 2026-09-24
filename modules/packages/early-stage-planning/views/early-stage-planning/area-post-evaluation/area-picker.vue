<!--
  片区更新后评估 —— 新增评估片区（第一步：选片区 + 选评估年份）

  流程：进入本页 → 顶部选评估年份 → 下方列出已批准片区（可按片区名称/行政区/批次搜索）
  → 列表里「选择」某一行 → 点「下一步」进入评估页（成效指标对比 / 满意度分析）。

  说明：
  - 只列已批准片区（后端 is_approve=1）；同一片区同一年度已有评估时该行标记「已评估」且不可选，
    后端保存时也会再拦一次（u_uid + eval_year 唯一）；
  - 行政区下拉取既有字典接口 /a/esp/schemeFill/dictOptions（DISTRICT_BOUNDARYS.name 去重）；
  - 年份切换会重新拉取片区列表（已评估标记随年份变化）并清空已选；
  - 数据：GET /a/esp/postEval/areaPage。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- 头部：返回 + 标题 + 评估年份 -->
    <div class="flex items-center gap-16px bg-white rd-8px px-24px py-14px shadow-sm">
      <a-button @click="emit('back')">返回</a-button>
      <span class="text-16px font-500 text-gray-800">新增评估片区</span>
      <div class="ml-auto flex items-center gap-8px">
        <span class="text-14px text-gray-600">评估年份：</span>
        <Select v-model:value="evalYear" :options="yearOptions" class="w-120px" @change="handleYearChange" />
      </div>
    </div>

    <!-- 已批准片区列表 -->
    <BasicTable @register="registerTable" :showIndexColumn="false" :rowClassName="rowClassName">
      <template #tableTitle>
        <span>片区列表（仅已批准片区）</span>
      </template>
    </BasicTable>

    <!-- 底部：已选 + 下一步 -->
    <div class="flex items-center gap-16px bg-white rd-8px px-24px py-14px shadow-sm">
      <span class="text-14px text-gray-600">
        已选片区：
        <span v-if="selected" class="font-500 text-gray-900">{{ selected.areaName }}（{{ selected.dist }} · {{ selected.batch }}）</span>
        <span v-else class="text-gray-400">未选择</span>
      </span>
      <span class="text-14px text-gray-600">评估年份：<span class="font-500 text-gray-900">{{ evalYear }}</span></span>
      <div class="ml-auto flex gap-8px">
        <a-button @click="emit('back')">取消</a-button>
        <a-button type="primary" :disabled="!selected" @click="handleNext">下一步</a-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup name="AreaPostEvalAreaPicker">
  import { ref } from 'vue';
  import { Select } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type { EspPostEvalAreaRow } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import { postEvalAreaPage } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import { BATCH_OPTIONS, buildYearOptions, currentYear } from './shared';
  // 行政区下拉复用方案填报的字典接口（/a/esp/schemeFill/dictOptions，权限只要求登录）
  import { useSchemeDict } from '../scheme-declaration-review/shared/use-scheme-dict';

  const emit = defineEmits<{
    /** 返回列表 */
    (e: 'back'): void;
    /** 选定片区与年份，进入评估页 */
    (e: 'next', payload: { aUid: string; areaName: string; evalYear: string }): void;
  }>();

  const { showMessage } = useMessage();
  /** 行政区选项：后端 DISTRICT_BOUNDARYS.name 去重（接口失败回退内置清单） */
  const { districtOptions } = useSchemeDict();

  /** 评估年份（默认当前年；切换后重新拉片区列表） */
  const evalYear = ref<string>(currentYear());
  const yearOptions = buildYearOptions();

  /** 当前选中的片区 */
  const selected = ref<EspPostEvalAreaRow | null>(null);

  /** 选中行高亮（样式见文件末尾 :deep） */
  function rowClassName(record: Recordable): string {
    return record.aUid && record.aUid === selected.value?.aUid ? 'post-eval-area-picked' : '';
  }

  const columns: BasicColumn[] = [
    { title: '片区名称', dataIndex: 'areaName', width: 180, align: 'center' },
    { title: '行政区', dataIndex: 'dist', width: 110, align: 'center' },
    { title: '片区批次', dataIndex: 'batch', width: 110, align: 'center' },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 140, align: 'center' },
    { title: '功能定位', dataIndex: 'funcTypeName', width: 120, align: 'center' },
    { title: '填报单位', dataIndex: 'reportOrg', width: 180, align: 'center' },
  ];

  /** 操作列：选择（该年度已评估的行置灰不可选） */
  const actionColumn: BasicColumn = {
    width: 110,
    actions: (record: Recordable) => [
      {
        label: record.evaluated ? '已评估' : '选择',
        disabled: !!record.evaluated,
        onClick: () => handleSelect(record as EspPostEvalAreaRow),
      },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: postEvalAreaPage,
    columns,
    actionColumn,
    // 评估年份随头部下拉走（不是搜索项）
    beforeFetch: (params) => ({ ...params, evalYear: evalYear.value }),
    showTableSetting: true,
    useSearchForm: true,
    canResize: true,
    pagination: { pageSize: 10, showQuickJumper: false },
    formConfig: {
      baseColProps: { xs: 24, sm: 12, md: 8, lg: 8 },
      labelWidth: 80,
      schemas: [
        { label: '片区名称', field: 'areaName', component: 'Input', componentProps: { placeholder: '请输入' } },
        {
          label: '行政区',
          field: 'dist',
          component: 'Select',
          // 函数式 componentProps：跟随字典接口结果刷新（静态对象会取到初始兜底值）
          componentProps: () => ({ options: districtOptions.value, allowClear: true, placeholder: '请选择' }),
        },
        {
          label: '片区批次',
          field: 'batch',
          component: 'Select',
          componentProps: { options: BATCH_OPTIONS, allowClear: true, placeholder: '请选择' },
        },
      ],
    },
  });

  /** 选片区（已评估的不可选，前端再兜一层提示） */
  function handleSelect(record: EspPostEvalAreaRow) {
    if (record.evaluated) {
      showMessage(`${record.areaName} 在 ${evalYear.value} 年度已有评估记录`);
      return;
    }
    selected.value = record;
  }

  /** 切换评估年份：已评估标记随年份变化，重新拉取并清空选择 */
  function handleYearChange() {
    selected.value = null;
    reload();
  }

  /** 下一步：把片区 + 年份交给评估页 */
  function handleNext() {
    if (!selected.value) {
      showMessage('请先选择需评估的片区');
      return;
    }
    emit('next', {
      aUid: selected.value.aUid,
      areaName: selected.value.areaName,
      evalYear: evalYear.value,
    });
  }
</script>
<style lang="less" scoped>
  :deep(.post-eval-area-picked) > td {
    background-color: #e6f4ff !important;
  }
</style>
