<!--
  ifco —— 在库项目管理 · 配置指定填报主体抽屉

  列表页工具栏「配置指定填报主体」入口。维护指定填报主体候选机构清单
  （后端 reportOrg 接口：打开时拉取清单，保存=整替提交）：
  输入机构名称新增（按钮/回车同效），可无限追加；名称为空或已被占用
  （清单内重名）在输入框下方红字拦截（不走 message）。本地清单改动后
  经页脚「保存」整替提交；后端暂未提供删除接口，本抽屉不提供删除。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    @register="registerDrawer"
    title="配置指定填报主体"
    :show-footer="true"
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
    <div class="mt-16px text-14px font-500 text-gray-800">已配置机构（{{ orgList.length }}）</div>
    <div class="mt-8px flex flex-col gap-4px">
      <div
        v-for="(org, index) in orgList"
        :key="org"
        class="b-1 b-solid b-gray-100 rd-4px bg-white px-12px py-8px text-14px text-gray-800"
      >
        {{ index + 1 }}. {{ org }}
      </div>
      <div v-if="!orgList.length" class="text-14px text-gray-400">暂未配置机构</div>
    </div>

    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> 取消 </a-button>
      <a-button type="primary" :loading="saving" @click="handleSave"> 保存 </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementOrgConfigDrawer">
  import { nextTick, ref } from 'vue';
  import { Input } from 'antdv-next';
  import { Button } from '@jeesite/core/components/Button';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { fetchReportOrgs, saveReportOrgs } from '@jeesite/ifco/api/ifco/project-library';

  const { showMessage } = useMessage();

  /** 本地清单（打开时拉取；保存=整替提交） */
  const orgList = ref<string[]>([]);
  const newOrgName = ref('');
  const errorMessage = ref('');
  const inputRef = ref();
  const saving = ref(false);

  const [registerDrawer, { closeDrawer, setDrawerProps }] = useDrawerInner(async () => {
    // 每次打开重置输入态并拉取服务端清单
    newOrgName.value = '';
    errorMessage.value = '';
    setDrawerProps({ loading: true });
    try {
      orgList.value = (await fetchReportOrgs()) ?? [];
    } finally {
      setDrawerProps({ loading: false });
    }
  });

  /** 新增机构：占用/空名拦截时红字提示并保留输入；成功后清空并回焦输入框 */
  function handleAdd() {
    const trimmed = newOrgName.value.trim();
    if (!trimmed) {
      errorMessage.value = '请输入机构名称';
      return;
    }
    if (orgList.value.includes(trimmed)) {
      errorMessage.value = `机构名称「${trimmed}」已被占用，请更换名称`;
      return;
    }
    errorMessage.value = '';
    orgList.value.push(trimmed);
    newOrgName.value = '';
    void nextTick(() => inputRef.value?.focus());
  }

  /** 保存：整替提交服务端（后端重名/校验失败返回 400 由全局错误提示弹出） */
  async function handleSave() {
    saving.value = true;
    try {
      await saveReportOrgs(orgList.value);
      showMessage('保存成功');
      closeDrawer();
    } finally {
      saving.value = false;
    }
  }
</script>
