<!--
  市住更局 —— 关键字查询(政策统一查询)

  完整实现见 ./shared/policy-search.vue,本文件为薄壳(keep-alive name),
  以静态 prop 传入 mode="keyword"(见「区级/市级共用抽象」约定)。
  检索走 kd_server /api/v1/search/snippets(dev 经 /policy_api vite 代理)。
  注意:路由以 /early-stage-planning/policy-management/keyword-search 结尾(无 /index),
  故本文件为目录同级单文件 keyword-search.vue,组件位置与链接地址严格一致。
  菜单注册(菜单名称「关键字查询」):
   - 链接地址:/early-stage-planning/policy-management/keyword-search
   - 组件位置:/early-stage-planning/policy-management/keyword-search(与链接地址一致)
   - 是否可见:显示
-->
<template>
  <PolicySearch mode="keyword" />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementKeywordSearch">
  import PolicySearch from './shared/policy-search.vue';
</script>
