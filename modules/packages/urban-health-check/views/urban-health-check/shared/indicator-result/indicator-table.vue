<!--
  市住更局 —— 指标项结果 show 页 / 指标项表(Tabs 第二个页签)

  接口已接入：indicatorResultPageBySet（/cityCheck/indicatorResult/page，服务端分页，
  筛选 指标项名称/预警状态/评估结果；首次查询自动按指标项同步生成结果行）。
  列结构对齐原型图4（无维度列）：序号/指标项名称/指标单位/指标值/标准值目标值/
  评估结果(Tag)/预警状态(Tag)/指标来源/数据来源/责任部门/操作；
  「数据来源」与编辑抽屉的维度信息由表2 联表（itemsMap）补齐，后端结果行不带这些列。
  结果填报前置条件:所属体系须处于启用状态(后端校验);已提交的行(submitStatus=1)只读。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm(record, true)" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #indicatorValue="{ record }">
        {{ displayValue(record.resultValue, record.resultValueText) || '-' }}
      </template>
      <template #standardValue="{ record }">
        {{ displayValue(record.standardValue, record.standardValueText) || '-' }}
      </template>
      <template #evalResult="{ record }">
        <Tag v-if="record.evaluateResult" :color="EVAL_RESULT_COLOR[record.evaluateResult] || 'default'" style="border-radius: 10px">
          {{ record.evaluateResult }}
        </Tag>
        <span v-else>-</span>
      </template>
      <template #warningStatus="{ record }">
        <Tag v-if="record.warningStatus" :color="WARNING_STATUS_COLOR[record.warningStatus] || 'default'" style="border-radius: 10px">
          {{ record.warningStatus }}
        </Tag>
        <span v-else>-</span>
      </template>
    </BasicTable>
  </div>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultIndicatorTable">
  import { onActivated, onMounted, ref, unref } from 'vue';
  import type { PropType } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { EVAL_RESULT, WARNING_STATUS, indicatorListLightBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import {
    indicatorResultPageBySet,
    displayValue,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';

  const props = defineProps({
    /** 所属体系主键 */
    setId: { type: String, required: true },
  });

  const emit = defineEmits(['refreshStat']);

  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: '指标项列表',
  };

  /** 评估结果 Tag 颜色（不足 非 较差，对齐后端枚举） */
  const EVAL_RESULT_COLOR: Record<string, string> = {
    不足: 'error',
    一般: 'warning',
    较好: 'processing',
    很好: 'success',
    无标准: 'default',
  };

  /** 预警状态 Tag 颜色（保存时按评估结果自动计算：不足→红；一般/无标准→黄；很好/较好→正常） */
  const WARNING_STATUS_COLOR: Record<string, string> = {
    红色预警: 'error',
    黄色预警: 'warning',
    正常: 'success',
  };

  /** 搜索表单（指标项/预警状态/评估结果，服务端筛选） */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 100,
    schemas: [
      { label: '指标项', field: 'itemName', component: 'Input' },
      {
        label: '预警状态',
        field: 'warningStatus',
        component: 'Select' as const,
        componentProps: {
          options: [WARNING_STATUS.RED, WARNING_STATUS.YELLOW, WARNING_STATUS.NORMAL].map((v) => ({
            label: v,
            value: v,
          })),
          allowClear: true,
        },
      },
      {
        label: '评估结果',
        field: 'evaluateResult',
        component: 'Select' as const,
        componentProps: {
          options: Object.values(EVAL_RESULT).map((v) => ({ label: v, value: v })),
          allowClear: true,
        },
      },
    ],
  };

  /** 表格列（对齐原型图4：无维度列） */
  const tableColumns: BasicColumn[] = [
    { title: '指标项名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 220 },
    { title: '指标单位', dataIndex: 'unit', width: 80, align: 'center' as const },
    { title: '指标值', dataIndex: 'indicatorValue', slot: 'indicatorValue', width: 100, align: 'center' as const },
    { title: '标准值/目标值', dataIndex: 'standardValue', slot: 'standardValue', width: 120, align: 'center' as const },
    { title: '评估结果', dataIndex: 'evaluateResult', width: 100, align: 'center' as const, slot: 'evalResult' },
    { title: '预警状态', dataIndex: 'warningStatus', width: 100, align: 'center' as const, slot: 'warningStatus' },
    { title: '指标来源', dataIndex: 'indicatorSource', width: 150 },
    { title: '数据来源', dataIndex: 'dataSource', width: 150 },
    { title: '责任部门', dataIndex: 'responsibleDept', width: 160 },
  ];

  /** 操作列(查看始终可;编辑仅未提交的行显示——提交后只读) */
  const actionColumn: BasicColumn = {
    width: 110,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm(record, true),
      },
      {
        label: '编辑',
        onClick: () => handleForm(record, false),
        ifShow: () => record.submitStatus !== 1,
      },
    ],
  };

  const [registerTable, { reload }] = useTable({
    api: (params: Recordable) => indicatorResultPageBySet({ ...params, setId: props.setId }),
    afterFetch: (rows: Recordable[]) =>
      (rows ?? []).map((r) => {
        const item = itemsMap.value.get(Number(r.code));
        return {
          ...r,
          dim1: item?.dim1,
          dim2: item?.dim2,
          dim3: item?.dim3,
          dataSource: r.dataSource ?? item?.dataSource,
        };
      }),
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: true,
    pagination: true,
    canResize: true,
  });

  /**
   * 表2 指标项联表映射（item_no → 指标项）：结果分页不返维度列，表格数据来源列与
   * 编辑抽屉只读信息用它补齐。轻量端点（无 CLOB）+ 本 tab 懒挂载时才加载——
   * 250+ 行的全量大字段查询要 2~3s，不能放进首屏关键路径；加载完成补刷一次表格。
   */
  const itemsMap = ref(new Map<number, Indicator>());
  let mapApplied = false;

  onMounted(async () => {
    try {
      const items = await indicatorListLightBySet(props.setId);
      itemsMap.value = new Map(items.filter((i) => i.code != null).map((i) => [Number(i.code), i]));
      // 首次拉到联表后补刷一次（此前渲染的行数据来源列可能为空）
      if (!mapApplied) {
        mapApplied = true;
        reload();
      }
    } catch {
      /* 联表信息缺失不阻塞主流程，抽屉/表格降级显示空 */
    }
  });

  defineExpose({ reload });

  /**
   * 查看/编辑 → 跳独立页面（内容多，抽屉改为页面形式）：
   * /…/indicator-result/item/{结果行id}?set={体系id}&view=1
   * routeBase 从本页路径（/…/indicator-result/{setId}）去掉尾段推导，urban/district 通用
   */
  const go = useGo();
  const routeBase = unref(router.currentRoute).path.replace(/\/[^/]*$/, '');

  function handleForm(record: Recordable, isView: boolean) {
    go(`${routeBase}/item/${record.id}?set=${props.setId}&tab=indicator${isView ? '&view=1' : ''}`);
  }

  /** 标签页激活时刷新（从指标项编辑页保存返回后能看到最新数据）；首次激活跳过 */
  let skipFirstActivate = true;
  onActivated(() => {
    if (skipFirstActivate) {
      skipFirstActivate = false;
      return;
    }
    reload();
    emit('refreshStat');
  });
</script>
