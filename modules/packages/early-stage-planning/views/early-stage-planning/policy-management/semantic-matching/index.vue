<!--
  市住更局 —— 语义关联度匹配(政策自动匹配)

  完整实现见 ../shared/policy-search.vue,本文件为薄壳(keep-alive name),
  以静态 prop 传入 mode="semantic"(见「区级/市级共用抽象」约定)。
  检索走 kd_server /api/v1/search/snippets(dev 经 /policy_api vite 代理)。
  菜单注册(菜单名称「语义关联度匹配」):
   - 链接地址:/early-stage-planning/policy-management/semantic-matching/index
   - 组件位置:/early-stage-planning/policy-management/semantic-matching/index(与链接地址一致)
   - 是否可见:显示
-->
<template>
  <PolicySearch mode="semantic" />
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementSemanticMatchingIndex">
  import PolicySearch from '../shared/policy-search.vue';
</script>
