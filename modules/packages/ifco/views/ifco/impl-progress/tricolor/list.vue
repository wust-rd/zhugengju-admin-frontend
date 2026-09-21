<!--
  ifco —— 片区三色图进展（/ifco/impl-progress/tricolor/list）

  实施进度跟踪 · 功能页（菜单=功能）。顶部 Tabs（填报主体/区级/市级，默认落填报主体，点选切换；
  生产接机构角色后按角色显隐页签）。填报主体页签=无此功能视图占位（正常由
  菜单权限不配给该角色）；区级/市级共用三色图列表（红/黄/绿评估、年度投资
  进度）：区级纯查看（无操作列），市级带操作列（编辑=弹窗评估三色图进展）。
  面板复用 ./tricolor-panel，与旧卡片壳页共用同一份内存假数据。

  菜单注册（菜单名称「片区三色图进展」，上级菜单「实施进度跟踪」，仅配给
  区住更局与项目推进组角色）：
   - 链接地址：/ifco/impl-progress/tricolor/list
   - 组件位置：/ifco/impl-progress/tricolor/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-12px">
    <!-- 角色页签：默认落当前角色视角；联调期三页签全开可自由切换 -->
    <div class="bg-white rd-8px px-8px py-4px shadow-sm">
      <Tabs v-model:active-key="activeTab">
        <TabPane key="main" tab="填报主体" />
        <TabPane key="district" tab="区级" />
        <TabPane key="urban" tab="市级" />
      </Tabs>
    </div>

    <!-- 填报主体：无此功能视图 -->
    <div
      v-show="activeTab === 'main'"
      class="flex h-240px flex-col items-center justify-center gap-8px bg-white rd-8px shadow-sm"
    >
      <span class="i-ant-design:stop-outlined text-36px text-gray-300"></span>
      <span class="text-14px text-gray-400">当前角色（填报主体）无片区三色图功能视图</span>
    </div>
    <!-- 区住更局：三色图列表（纯查看，无操作列） -->
    <TriColorPanel v-show="activeTab === 'district'" role="district" />
    <!-- 项目推进组（市级）：三色图列表 + 操作列编辑（三色图评估） -->
    <TriColorPanel v-show="activeTab === 'urban'" role="urban" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressTricolorList">
  import { ref } from 'vue';
  import { TabPane, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import TriColorPanel from './tricolor-panel.vue';

  /** 默认页签=填报主体；生产接机构角色后按角色显隐页签 */
  const activeTab = ref('district');
</script>
