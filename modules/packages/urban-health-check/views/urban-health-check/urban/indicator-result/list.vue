<!--
  市住更局 —— 指标项结果管理（列表页,市级）

  实现已抽象至 shared/indicator-result/List.vue(与区级 district 共用),
  本文件仅为路由壳:组件 name 与路由 name 对应(keep-alive 依赖),勿改。
  菜单注册（菜单名称「指标项结果管理」）:
   - 链接地址:/urban-health-check/urban/indicator-result/list
   - 组件位置:/urban-health-check/urban/indicator-result/list;是否可见:显示
-->
<template>
  <SharedList route-base="/urban-health-check/urban/indicator-result" />
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorResultList">
  import SharedList from '../../shared/indicator-result/list.vue';
</script>
