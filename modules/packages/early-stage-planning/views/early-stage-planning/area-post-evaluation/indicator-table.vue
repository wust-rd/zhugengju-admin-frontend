<!--
  片区更新后评估 —— 成效指标对比表（设计稿图 1）

  28 行（清单来自后端 ESP_DICT）：
  - 一级维度 / 二级维度 列按相同值合并单元格（一级=项目进度/直接经济效益/间接经济效益/社会效益）；
  - 「更新前」：项目进度 + 直接经济效益（序号 1~12）本期不填（数据口径由系统出）→ 该列只读显示 "/"；
    其余维度可填（输入框，未填留空）；
  - 「更新后」：全部可填（未填留空）；
  - 「提升」= 更新后 - 更新前（前端现算，不入库）；「更新前」锁定的维度不展示提升（无口径），
    其余维度两项没填全则留空。
  ⚠️ 「/」只表示不可填；空值一律留空，输入框也不放占位符。

  表格上方有一级/二级维度筛选（二级随一级联动）；筛选只作用于本表格，
  不影响上方雷达图（图表由各自的维度下拉控制）。

  行对象由父级（evaluate.vue）持有并直接修改，因此表格改动会同步驱动上方雷达图。
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
    :scroll="{ x: 1080 }"
    bordered
    size="small"
    row-key="code"
  />
</template>
<script lang="ts" setup name="AreaPostEvalIndicatorTable">
  import type { TableColumnsType } from 'antdv-next';
  import { InputNumber, Select, Table } from 'antdv-next';
  import { computed, h, ref } from 'vue';
  import type { EspPostEvalIndicatorValue } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import {
    FILTER_ALL,
    LOCKED_TEXT,
    buildSpans,
    deltaOf,
    formatDelta,
    formatValue,
    isBeforeLocked,
    uniqDim,
  } from './shared';

  const props = defineProps<{
    /** 指标行（父级持有，含更新前/更新后填写值） */
    rows: EspPostEvalIndicatorValue[];
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

  /** 一级维度 / 二级维度合并跨度（按筛选后的展示行现算） */
  const lv1Spans = computed(() => buildSpans(visibleRows.value, (row) => row.lv1));
  const lv2Spans = computed(() => buildSpans(visibleRows.value, (row) => `${row.lv1}|${row.lv2}`));

  /** 更新前 / 更新后单元格：编辑态输入框、查看态文本 */
  function renderValue(row: EspPostEvalIndicatorValue, key: 'beforeValue' | 'afterValue') {
    const value = row[key];
    // 「更新前」锁定的维度（项目进度 / 直接经济效益）：该列只读显示 "/"，不给输入框
    if (key === 'beforeValue' && isBeforeLocked(row.lv1)) {
      return LOCKED_TEXT;
    }
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

  const columns = computed<TableColumnsType<EspPostEvalIndicatorValue>>(() => [
    {
      title: '一级维度',
      dataIndex: 'lv1',
      width: 130,
      align: 'center',
      onCell: (_record, index) => ({ rowSpan: lv1Spans.value[index ?? 0] ?? 1 }),
    },
    {
      title: '二级维度',
      dataIndex: 'lv2',
      width: 130,
      align: 'center',
      onCell: (_record, index) => ({ rowSpan: lv2Spans.value[index ?? 0] ?? 1 }),
    },
    { title: '序号', dataIndex: 'seqNo', width: 70, align: 'center' },
    { title: '指标项', dataIndex: 'name', width: 260, align: 'center' },
    { title: '单位', dataIndex: 'unit', width: 110, align: 'center' },
    {
      title: '更新前',
      dataIndex: 'beforeValue',
      width: 130,
      align: 'center',
      render: (_value, record) => renderValue(record, 'beforeValue'),
    },
    {
      title: '更新后',
      dataIndex: 'afterValue',
      width: 130,
      align: 'center',
      render: (_value, record) => renderValue(record, 'afterValue'),
    },
    {
      title: '提升',
      dataIndex: 'delta',
      width: 120,
      align: 'center',
      // 「更新前」锁定的维度不展示提升（无更新前值，提升无口径）
      render: (_value, record) =>
        isBeforeLocked(record.lv1) ? '' : formatDelta(deltaOf(record.beforeValue, record.afterValue)),
    },
  ]);
</script>
