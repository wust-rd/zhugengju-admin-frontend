<!--
  片区更新后评估 —— 满意度分析表（设计稿图 4 下半）

  13 行（清单来自后端 ESP_DICT，一级维度：好房子/好小区/好社区/好城区）：
  - 一级维度列按相同值合并单元格；
  - 只有「更新前满意度 / 更新后满意度」可填写（单位 %，未填写留空）；
  - 「提升」= 更新后 - 更新前（前端现算，不入库；任一项为空则留空）。

  表格上方有一级/二级维度筛选（二级随一级联动）；筛选只作用于本表格，
  不影响上方统计图（图表由各自的维度下拉控制）。

  行对象由父级（evaluate.vue）持有并直接修改，因此表格改动会同步驱动上方统计图。
-->
<template>
  <div class="mb-12px flex flex-wrap items-center gap-8px">
    <span class="text-14px text-gray-800">一级维度：</span>
    <Select v-model:value="lv1Filter" :options="lv1Options" class="w-150px" @change="handleLv1Change" />
    <span class="ml-8px text-14px text-gray-800">二级维度：</span>
    <Select v-model:value="lv2Filter" :options="lv2Options" class="w-180px" />
  </div>
  <Table
    :columns="columns"
    :data-source="visibleRows"
    :pagination="false"
    :scroll="{ x: 860 }"
    bordered
    size="small"
    row-key="code"
  />
</template>
<script lang="ts" setup name="AreaPostEvalSatisfactionTable">
  import type { TableColumnsType } from 'antdv-next';
  import { InputNumber, Select, Table } from 'antdv-next';
  import { computed, h, ref } from 'vue';
  import type { EspPostEvalSatisfactionValue } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import { FILTER_ALL, buildSpans, deltaOf, formatDelta, formatValue, uniqDim } from './shared';

  const props = defineProps<{
    /** 满意度行（父级持有，含更新前/更新后满意度填写值） */
    rows: EspPostEvalSatisfactionValue[];
    /** 查看模式：只读文本，不渲染输入框 */
    readonly?: boolean;
  }>();

  /** 维度筛选（只影响表格展示） */
  const lv1Filter = ref<string>(FILTER_ALL);
  const lv2Filter = ref<string>(FILTER_ALL);

  /** 一级维度选项（按清单顺序去重） */
  const lv1Options = computed(() => [
    { label: '全部', value: FILTER_ALL },
    ...uniqDim(props.rows.map((row) => row.lv1)).map((lv1) => ({ label: lv1, value: lv1 })),
  ]);

  /** 二级维度选项（随一级维度联动） */
  const lv2Options = computed(() => {
    const base =
      lv1Filter.value === FILTER_ALL ? props.rows : props.rows.filter((row) => row.lv1 === lv1Filter.value);
    return [
      { label: '全部', value: FILTER_ALL },
      ...uniqDim(base.map((row) => row.lv2)).map((lv2) => ({ label: lv2, value: lv2 })),
    ];
  });

  /** 切换一级维度后，若原二级维度已不在选项内则重置为「全部」 */
  function handleLv1Change() {
    if (lv2Filter.value !== FILTER_ALL && !lv2Options.value.some((opt) => opt.value === lv2Filter.value)) {
      lv2Filter.value = FILTER_ALL;
    }
  }

  /** 表格展示行（筛选后，合并跨度按展示行现算） */
  const visibleRows = computed(() =>
    props.rows.filter(
      (row) =>
        (lv1Filter.value === FILTER_ALL || row.lv1 === lv1Filter.value) &&
        (lv2Filter.value === FILTER_ALL || row.lv2 === lv2Filter.value),
    ),
  );

  /** 一级维度合并跨度（按筛选后的展示行现算） */
  const lv1Spans = computed(() => buildSpans(visibleRows.value, (row) => row.lv1));

  /** 更新前 / 更新后满意度单元格：编辑态输入框、查看态文本 */
  function renderScore(row: EspPostEvalSatisfactionValue, key: 'beforeScore' | 'afterScore') {
    const value = row[key];
    if (props.readonly) {
      return formatValue(value);
    }
    return h(InputNumber, {
      size: 'small',
      class: 'w-full',
      controls: false,
      value: value ?? undefined,
      'onUpdate:value': (input: number | string | null) => {
        if (input === null || input === '') {
          row[key] = null;
          return;
        }
        const num = typeof input === 'number' ? input : Number(String(input).replace(/[,，\s]/g, ''));
        row[key] = Number.isFinite(num) ? num : null;
      },
    });
  }

  const columns = computed<TableColumnsType<EspPostEvalSatisfactionValue>>(() => [
    {
      title: '一级维度',
      dataIndex: 'lv1',
      width: 140,
      align: 'center',
      onCell: (_record, index) => ({ rowSpan: lv1Spans.value[index ?? 0] ?? 1 }),
    },
    { title: '二级维度', dataIndex: 'lv2', width: 220, align: 'center' },
    {
      title: '更新前满意度（%）',
      dataIndex: 'beforeScore',
      width: 180,
      align: 'center',
      render: (_value, record) => renderScore(record, 'beforeScore'),
    },
    {
      title: '更新后满意度（%）',
      dataIndex: 'afterScore',
      width: 180,
      align: 'center',
      render: (_value, record) => renderScore(record, 'afterScore'),
    },
    {
      title: '提升',
      dataIndex: 'delta',
      width: 120,
      align: 'center',
      render: (_value, record) => formatDelta(deltaOf(record.beforeScore, record.afterScore)),
    },
  ]);
</script>
