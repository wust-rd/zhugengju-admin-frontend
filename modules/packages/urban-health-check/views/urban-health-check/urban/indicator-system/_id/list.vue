<!--
  市住更局 —— 指标项管理(指标体系 show 页,市级)

  实现已抽象至 shared/indicator-system/IdList.vue(与区级 district 共用),
  本文件仅为路由壳:组件 name 与路由 name 对应(keep-alive 依赖),勿改。
  规划路由(RESTful,后端隐藏菜单):
   - 链接地址:/urban-health-check/urban/indicator-system/{id}({id}=记录编码 code)
   - 组件位置:/urban-health-check/urban/indicator-system/_id/list(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂「指标体系管理」以点亮侧边栏
-->
<template>
  <SharedIdList />
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorSystemIdList">
  import SharedIdList from '../../../shared/indicator-system/id-list.vue';
</script>
