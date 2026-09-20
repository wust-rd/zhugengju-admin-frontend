<!--
  策划方案审查 · 菜单兼容别名（页面本体在 list.vue）

  仅用于兼容后台【菜单管理】里已注册的组件位置 …/scheme-review/index：
  路由 dynamicImport 按文件名精确匹配，/index 与 /list 两个组件位置需各自
  有对应文件才能解析。新注册菜单建议统一用 …/scheme-review/list（本体）。
  与 scheme-fill/index.vue 同一约定。
-->
<template>
  <SchemeReviewList />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeReviewIndex">
  import SchemeReviewList from './list.vue';
</script>
