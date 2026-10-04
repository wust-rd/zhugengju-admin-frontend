<!--
  市住更局 —— 指标项结果 编辑/查看 页(市级,路由壳)

  实现已抽象至 shared/indicator-result/ItemEdit.vue,本文件仅为路由壳:
  组件 name 与路由 name 对应(keep-alive 依赖),勿改。
  菜单注册(后端隐藏菜单):
   - 链接地址:/urban-health-check/urban/indicator-result/item/{id}({id}=结果行主键)
   - 组件位置:/urban-health-check/urban/indicator-result/item/edit(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂「指标项结果管理」以点亮侧边栏
-->
<template>
  <ItemEdit />
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorResultItemEdit">
  import ItemEdit from '../../../shared/indicator-result/item-edit.vue';
</script>
