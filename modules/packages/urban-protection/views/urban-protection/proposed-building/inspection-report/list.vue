<!--
  市住更局 —— 名城保护 · 拟优保巡查报表统计

  拟优保巡查情况统计（父建筑拟优保的巡查记录）：按月份/按日期起止双模式 + 单值列（应巡查量/已巡查量/未巡查量/巡查率），
  实现见 shared/inspection-report-table.vue。
-->
<template>
  <InspectionReportTable scope="proposed" heading="拟优保巡查情况统计表" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionReportList">
  import InspectionReportTable from '../../shared/inspection-report-table.vue';
</script>
