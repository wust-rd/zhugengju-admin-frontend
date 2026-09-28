<!--
  开发演示 —— Form 组件演示入口页（/demo/form-components，不进后台菜单的前端静态路由）

  进入本页自动打开一次演示抽屉（也可点按钮重新打开）；抽屉内容见同目录 drawer.vue，
  演示 packages/core/components/Form/src/components 全部 10 个组件的最简用法。
  路由注册：packages/core/router/routes/modules/demo.ts（登录后直接访问 URL 即可）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <div class="bg-white rd-8px p-16px shadow-sm">
      <div class="text-16px font-600">Form 组件演示</div>
      <div class="mt-8px text-14px text-gray-500">
        演示 packages/core/components/Form/src/components 目录下全部 10 个组件的最简用法；抽屉在进入本页时自动打开一次。
      </div>
      <a-button class="mt-12px" type="primary" @click="openDrawer(true)"> 打开演示抽屉 </a-button>
    </div>
    <FormComponentsDemoDrawer @register="registerDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoDemoFormComponentsIndex">
  import { onMounted } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import FormComponentsDemoDrawer from './drawer.vue';

  const [registerDrawer, { openDrawer }] = useDrawer();

  onMounted(() => openDrawer(true));
</script>
