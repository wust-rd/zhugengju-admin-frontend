<!--
  市住更局 —— 名城保护 · 拟优保巡查报表统计

  拟优保巡查情况统计（WHFW_OLDJZ / WHFW_OLDJZ_XC 口径，/a/urban-protection/proposed/stats/* 接口）：
  按月份/按日期起止双模式 + 单值列（应巡查量/已巡查量/未巡查量/巡查率），
  应巡查量 = 该区未删除且已纳入巡查（ISPATROL=1）建筑数 × 2，实现见 shared/inspection-report-table.vue。
-->
<template>
  <InspectionReportTable scope="proposed" heading="拟优保巡查情况统计表" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionReportList">
  import InspectionReportTable from '../../shared/inspection-report-table.vue';
</script>
