<!--
  市住更局 —— 名城保护 · 优保建筑巡查（列表页）

  数据：WHFW_AQJD_EXCELLENT_XC 中父建筑在册（STATUS 非 0）的巡查记录；
  实现（搜索/列/详情/特别关注）见 shared/inspection-list.vue。
-->
<template>
  <InspectionList scope="excellent" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingInspectionList">
  import InspectionList from '../../shared/inspection-list.vue';
</script>
