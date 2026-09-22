<!--
  ifco —— 月度进度填报（/ifco/impl-progress/monthly/list）

  实施进度跟踪 · 功能页（菜单=功能）。顶部 Tabs（填报主体/区级/市级，默认落填报主体，点选切换；
  生产接机构角色后按角色显隐页签）。三个页签内容：填报主体=月度进度填报
  列表（查看/填写/编辑抽屉）；区级=月度审查列表（待区级审查出审查按钮）；
  市级=月度审查列表（待市级审查出审查按钮）。面板复用 fill/shared
  现有组件（v-show 不销毁），与旧卡片壳页共用同一份内存假数据。

  菜单注册（菜单名称「月度进度填报」，上级菜单「实施进度跟踪」）：
   - 链接地址：/ifco/impl-progress/monthly/list
   - 组件位置：/ifco/impl-progress/monthly/list（与链接地址一致）
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

    <!-- 填报主体：填报列表（含查看/填写/编辑抽屉） -->
    <MonthlyPanel v-show="activeTab === 'main'" />
    <!-- 区住更局：审查列表（待区级审查出审查按钮） -->
    <MonthlyConfirmPanel v-show="activeTab === 'district'" role="district" />
    <!-- 项目推进组（市级）：审查列表（待市级审查出审查按钮） -->
    <MonthlyConfirmPanel v-show="activeTab === 'urban'" role="urban" return-org="市住房和城市更新局" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressMonthlyList">
  import { ref } from 'vue';
  import { TabPane, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import MonthlyPanel from './monthly-panel.vue';
  import MonthlyConfirmPanel from './monthly-confirm-panel.vue';

  /** 默认页签=填报主体；生产接机构角色后按角色显隐页签 */
  const activeTab = ref('main');
</script>
