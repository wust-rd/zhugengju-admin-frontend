<!--
  市住更局 —— 名城保护 · 拟保护建筑巡查（列表页）

  数据：WHFW_OLDJZ_XC（拟优保巡查独立表，经 /a/urban-protection/proposed/inspection/* 接口）；
  与优保巡查共用实现，差异：不展示「是否上报」列（表无该字段）。
-->
<template>
  <InspectionList scope="proposed" :show-sfsb="false" />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionList">
  import InspectionList from '../../shared/inspection-list.vue';
</script>
