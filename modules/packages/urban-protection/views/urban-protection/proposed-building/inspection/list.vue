<!--
  市住更局 —— 名城保护 · 拟保护建筑巡查（列表页）

  数据：WHFW_OLDJZ_XC（拟优保巡查独立表，经 /a/urban-protection/proposed/inspection/* 接口）；
  与优保巡查共用实现，差异：不展示「是否上报」列（表无该字段）；
  查询条件为精简模式（对齐老系统拟优保巡查「详细查询」）：巡查日期/巡检人姓名/是否特别关注。
-->
<template>
  <!-- plain-name：建筑原名称纯文本显示，不加详情链接（对齐老系统） -->
  <InspectionList scope="proposed" :show-sfsb="false" plain-name simple-search />
</template>
<script lang="ts" setup name="ViewsUrbanProtectionProposedBuildingInspectionList">
  import InspectionList from '../../shared/inspection-list.vue';
</script>
