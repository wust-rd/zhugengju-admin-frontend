<!--
  市住更局 —— 指标项结果 show 页(区级,容器)

  实现复用 shared/indicator-result/IdList.vue(Card + Tabs:一级维度/指标项),
  本文件仅为路由壳:组件 name 与路由 name 对应(keep-alive 依赖),勿改。
  规划路由(RESTful,后端隐藏菜单):
   - 链接地址:/urban-health-check/district/indicator-result/{id}({id}=记录编码 code)
   - 组件位置:/urban-health-check/district/indicator-result/_id/list(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂区级「指标项结果管理」以点亮侧边栏
-->
<template>
  <SharedIdList />
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorResultIdList">
  import SharedIdList from '../../../shared/indicator-result/id-list.vue';
</script>
