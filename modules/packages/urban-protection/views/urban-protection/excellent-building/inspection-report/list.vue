<!--
  市住更局 —— 名城保护 · 优保巡查报表统计

  各区优保巡查情况统计报表：巡查年月（月选）+ 巡查时间（区间）查询，左上导出EXCEL；
  多级表头（巡查建筑数量/建筑巡查次数分组）+ 末行「全部」合计，巡查频次=2（老系统口径）。
  实现见 shared/proposed-inspection-report-table.vue（优保/拟优保共用，按 scope/frequency 区分）。
-->
<template>
  <InspectionReportStats heading="各区优保巡查情况统计报表" scope="excellent" :frequency="2" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingInspectionReportList">
  import InspectionReportStats from '../../shared/proposed-inspection-report-table.vue';
</script>
