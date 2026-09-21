<!--
  ifco —— 在库项目管理 · 配置指定填报主体抽屉

  列表页工具栏「配置指定填报主体」入口。维护指定填报主体候选机构清单
  （api 层模块级内存状态 REPORT_ORG_LIST，假数据阶段刷新即恢复）：
  输入机构名称新增（按钮/回车同效），可无限追加；名称为空或已被占用
  （清单内重名）在输入框下方红字拦截（不走 message）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    @register="registerDrawer"
    title="配置指定填报主体"
    :show-footer="false"
    width="520px"
  >
    <!-- 新增区：机构名称输入 + 新增按钮 -->
    <div class="flex items-center gap-8px">
      <Input
        ref="inputRef"
        v-model:value="newOrgName"
        :maxlength="50"
        placeholder="请输入机构名称"
        @press-enter="handleAdd"
      />
      <Button type="primary" @click="handleAdd"> 新增 </Button>
    </div>
    <!-- 拦截验证错误：输入框下方红字 -->
    <div v-if="errorMessage" class="mt-4px text-14px text-red-500">{{ errorMessage }}</div>

    <!-- 已配置机构清单 -->
    <div class="mt-16px text-14px font-500 text-gray-800">已配置机构（{{ REPORT_ORG_LIST.length }}）</div>
    <div class="mt-8px flex flex-col gap-4px">
      <div
        v-for="(org, index) in REPORT_ORG_LIST"
        :key="org"
        class="b-1 b-solid b-gray-100 rd-4px bg-white px-12px py-8px text-14px text-gray-800"
      >
        {{ index + 1 }}. {{ org }}
      </div>
      <div v-if="!REPORT_ORG_LIST.length" class="text-14px text-gray-400">暂未配置机构</div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementOrgConfigDrawer">
  import { nextTick, ref } from 'vue';
  import { Input } from 'antdv-next';
  import { Button } from '@jeesite/core/components/Button';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { REPORT_ORG_LIST, addReportOrg } from '@jeesite/ifco/api/ifco/project-library';

  const newOrgName = ref('');
  const errorMessage = ref('');
  const inputRef = ref();

  const [registerDrawer] = useDrawerInner(() => {
    // 每次打开重置输入态
    newOrgName.value = '';
    errorMessage.value = '';
  });

  /** 新增机构：占用/空名拦截时红字提示并保留输入；成功后清空并回焦输入框 */
  function handleAdd() {
    const result = addReportOrg(newOrgName.value);
    if (!result.ok) {
      errorMessage.value = result.message ?? '新增失败';
      return;
    }
    errorMessage.value = '';
    newOrgName.value = '';
    void nextTick(() => inputRef.value?.focus());
  }
</script>
