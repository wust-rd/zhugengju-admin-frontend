<!--
  市住更局 —— 体检指标体系管理（列表页,区级）

  实现复用 shared/indicator-system/List.vue(与市级 urban 共用),
  本文件仅为路由壳:组件 name 与路由 name 对应(keep-alive 依赖),勿改。
  区级差异:搜索表单附加 体检片区/行政区划/功能定位 三个筛选项。
  菜单注册(菜单名称「区级体检指标体系管理」或同类):
   - 链接地址:/urban-health-check/district/indicator-system/list
   - 组件位置:/urban-health-check/district/indicator-system/list;是否可见:显示
-->
<template>
  <SharedList route-base="/urban-health-check/district/indicator-system" district />
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorSystemList">
  import SharedList from '../../shared/indicator-system/list.vue';
</script>
