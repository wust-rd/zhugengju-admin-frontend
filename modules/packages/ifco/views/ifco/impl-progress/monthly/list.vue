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
    <MonthlyPanel v-show="activeTab === 'main'" ref="mainPanelRef" />
    <!-- 区住更局：审查列表（待区级审查出审查按钮） -->
    <MonthlyConfirmPanel v-show="activeTab === 'district'" ref="districtPanelRef" role="district" />
    <!-- 项目推进组（市级）：审查列表（待市级审查出审查按钮） -->
    <MonthlyConfirmPanel v-show="activeTab === 'urban'" ref="urbanPanelRef" role="urban" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressMonthlyList">
  import { ref, watch } from 'vue';
  import { TabPane, Tabs } from 'antdv-next';
  import { match } from 'ts-pattern';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import MonthlyPanel from './monthly-panel.vue';
  import MonthlyConfirmPanel from './monthly-confirm-panel.vue';

  /** 默认页签=填报主体；生产接机构角色后按角色显隐页签 */
  const activeTab = ref<'main' | 'district' | 'urban'>('main');

  const mainPanelRef = ref<InstanceType<typeof MonthlyPanel>>();
  const districtPanelRef = ref<InstanceType<typeof MonthlyConfirmPanel>>();
  const urbanPanelRef = ref<InstanceType<typeof MonthlyConfirmPanel>>();

  /** 切换视角页签时重拉该视角数据：三面板 v-show 不销毁、各持初次加载的表格快照，
   *  其余视角提交审查后仅本视角重拉（如区级审查通过后市级页签仍显「待区级审查」），
   *  故切页签即刷新，保证流转状态各视角一致 */
  watch(activeTab, (tab) => {
    match(tab)
      .with('main', () => mainPanelRef.value?.reload())
      .with('district', () => districtPanelRef.value?.reload())
      .with('urban', () => urbanPanelRef.value?.reload())
      .exhaustive();
  });
</script>
