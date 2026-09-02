<!--
  市住更局 —— 指标项结果 show 页 / 一级维度表(Tabs 第一个页签)

  列:一级维度名称 / 图层对象数量 / 图层覆盖面积(km²);
  演示假数据,后端接入后删除改用 api 拉取。
-->
<template>
  <div>
    <BasicTable @register="registerDimTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
    </BasicTable>
  </div>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultDimTable">
  import { unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: '一级维度',
  };

  /** 一级维度图层统计(演示假数据,后端接入后删除,改用 api 拉取) */
  const MOCK_DIM_LAYERS = [
    { id: '1', dimName: '好房子', layerCount: 12, layerArea: 286.5 },
    { id: '2', dimName: '好小区', layerCount: 8, layerArea: 154.2 },
    { id: '3', dimName: '好城区', layerCount: 6, layerArea: 98.7 },
    { id: '4', dimName: '专项1：既有建筑改造利用', layerCount: 9, layerArea: 132.4 },
  ];

  /** 一级维度表列 */
  const dimColumns: BasicColumn[] = [
    { title: '一级维度名称', dataIndex: 'dimName', width: 150 },
    { title: '图层对象数量', dataIndex: 'layerCount', width: 140, align: 'center' },
    { title: '图层覆盖面积（km²）', dataIndex: 'layerArea', width: 180, align: 'center' },
  ];

  const [registerDimTable] = useTable({
    dataSource: MOCK_DIM_LAYERS,
    columns: dimColumns,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: false,
    canResize: true,
  });

  /** 新增一级维度(维度图层表单待定,后端接入后实现) */
  function handleForm(_record: Recordable) {
    // TODO: 维度图层表单确定后接入
    showMessage('新增一级维度:表单待定');
  }
</script>
