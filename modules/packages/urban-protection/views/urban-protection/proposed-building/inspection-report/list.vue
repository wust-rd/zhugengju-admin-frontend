<!--
  市住更局 —— 名城保护 · 拟优保巡查报表统计

  各区拟优保巡查情况统计报表（WHFW_OLDJZ / WHFW_OLDJZ_XC 口径，/a/urban-protection/proposed/stats/* 接口）：
  巡查年月（月选）+ 巡查时间（区间）查询，左上导出EXCEL；
  多级表头（巡查建筑数量/建筑巡查次数分组）+ 末行「全部」合计，实现见
  shared/proposed-inspection-report-table.vue（优保/拟优保共用组件，按 scope/frequency 区分）。
-->
<template>
  <ProposedInspectionReportTable heading="各区拟优保巡查情况统计报表" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionReportList">
  import ProposedInspectionReportTable from '../../shared/proposed-inspection-report-table.vue';
</script>
