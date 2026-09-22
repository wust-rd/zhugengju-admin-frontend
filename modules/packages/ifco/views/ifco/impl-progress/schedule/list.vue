<!--
  ifco —— 倒排工期计划（/ifco/impl-progress/schedule/list）

  实施进度跟踪 · 功能页（菜单=功能）。顶部 Tabs（填报主体/区级/市级，默认落填报主体，点选切换；
  生产接机构角色后按角色显隐页签）。三个页签内容：填报主体=填报列表
  （待提交/退回修改=编辑，待区级审查/待市级审查=查看，市级审查通过=修改计划）；
  区级=审查列表（待区级审查出审查按钮）；市级=审查列表（待市级审查出审查按钮）。面板在 schedule/ 目录内
  （schedule-panel 单面板 role 区分三视角：main=填报 / district|urban=本层级审查，
  v-show 不销毁，保留各自搜索与翻页状态），与旧的
  实施进度填报/区级/市级三个卡片壳页共用同一份内存假数据。

  菜单注册（菜单名称「倒排工期计划」，上级菜单「实施进度跟踪」）：
   - 链接地址：/ifco/impl-progress/schedule/list
   - 组件位置：/ifco/impl-progress/schedule/list（与链接地址一致）
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

    <!-- 填报主体：填报列表（编辑/修改计划） -->
    <SchedulePanel v-show="activeTab === 'main'" role="main" />
    <!-- 区住更局：审查列表（待区级审查出审查按钮） -->
    <SchedulePanel v-show="activeTab === 'district'" role="district" />
    <!-- 项目推进组（市级）：审查列表（待市级审查出审查按钮；行政区筛选前置到指定填报主体前） -->
    <SchedulePanel v-show="activeTab === 'urban'" role="urban" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressScheduleList">
  import { ref } from 'vue';
  import { TabPane, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import SchedulePanel from './schedule-panel.vue';

  /** 默认页签=填报主体；生产接机构角色后按角色显隐页签 */
  const activeTab = ref('main');
</script>
