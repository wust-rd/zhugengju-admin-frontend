<!--
  ifco —— 提示和督办（/ifco/impl-progress/supervise/list）

  实施进度跟踪 · 功能页（菜单=功能）。顶部 Tabs（区级/市级，默认落区级，点选切换；
  生产接机构角色后按角色显隐页签；提示/督办对填报主体屏蔽，不设填报主体页签）。
  两个页签内容：区级=整单区级处理（去处理/查看）；市级=督办全流程（新增提交/
  编辑/下发/导出单据/确认办结）。两个面板同目录（supervise/，v-show 不销毁），
  共用同一份内存假数据（下发后区级端即刻可见，区级提交后市级端待确认）。

  菜单注册（菜单名称「提示和督办」，上级菜单「实施进度跟踪」）：
   - 链接地址：/ifco/impl-progress/supervise/list
   - 组件位置：/ifco/impl-progress/supervise/list（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-12px">
    <!-- 角色页签：默认落当前角色视角；联调期两页签全开可自由切换 -->
    <div class="bg-white rd-8px px-8px py-4px shadow-sm">
      <Tabs v-model:active-key="activeTab">
        <TabPane key="district" tab="区级" />
        <TabPane key="urban" tab="市级" />
      </Tabs>
    </div>

    <!-- 区住更局：整单区级处理 -->
    <DistrictSupervisePanel v-show="activeTab === 'district'" />
    <!-- 项目推进组（市级）：新增下发 + 确认办结 -->
    <UrbanSupervisePanel v-show="activeTab === 'urban'" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSuperviseList">
  import { ref } from 'vue';
  import { TabPane, Tabs } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import DistrictSupervisePanel from './supervise-district-panel.vue';
  import UrbanSupervisePanel from './supervise-urban-panel.vue';

  /** 默认页签=区级；生产接机构角色后按角色显隐页签 */
  const activeTab = ref('district');
</script>
