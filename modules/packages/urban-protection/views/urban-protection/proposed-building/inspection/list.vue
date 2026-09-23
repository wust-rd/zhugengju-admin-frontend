<!--
  市住更局 —— 名城保护 · 拟保护建筑巡查（列表页）

  数据：WHFW_AQJD_EXCELLENT_XC 中父建筑拟优保（STATUS=0）的巡查记录；
  与优保巡查共用实现，差异：不展示「是否上报」列（老系统口径一致）。
-->
<template>
  <InspectionList scope="proposed" :show-sfsb="false" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionList">
  import InspectionList from '../../shared/inspection-list.vue';
</script>
