<!--
  方案填报列表页 · 菜单兼容别名（页面本体在 list.vue）

  仅用于兼容后台【菜单管理】里已注册的组件位置 …/scheme-fill/index：
  路由 dynamicImport 按文件名精确匹配，/index 与 /list 两个组件位置需各自
  有对应文件才能解析。新注册菜单建议统一用 …/scheme-fill/list（本体）。
-->
<template>
  <SchemeFillList />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeFillIndex">
  import SchemeFillList from './list.vue';
</script>
