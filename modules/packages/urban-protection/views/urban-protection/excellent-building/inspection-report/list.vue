<!--
  市住更局 —— 名城保护 · 优保巡查报表统计

  优保巡查情况统计（父建筑在册的巡查记录）：按月份/按日期起止双模式 + 单值列（应巡查量/已巡查量/未巡查量/巡查率），
  实现见 shared/inspection-report-table.vue。
-->
<template>
  <InspectionReportTable scope="excellent" heading="各区优保巡查情况统计报表" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingInspectionReportList">
  import InspectionReportTable from '../../shared/inspection-report-table.vue';
</script>
