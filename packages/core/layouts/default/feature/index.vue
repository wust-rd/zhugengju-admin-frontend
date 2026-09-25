<script lang="ts" setup name="LayoutFeatures">
  import { computed, ref, unref, watch } from 'vue';
  import { BackTop, Button } from 'antdv-next';
  import { useRoute } from 'vue-router';

  import { useRootSetting } from '@jeesite/core/hooks/setting/useRootSetting';
  import { useHeaderSetting } from '@jeesite/core/hooks/setting/useHeaderSetting';
  import { useUserStoreWithOut } from '@jeesite/core/store/modules/user';

  import { SettingButtonPositionEnum } from '@jeesite/core/enums/appEnum';
  import { createAsyncComponent } from '@jeesite/core/utils/factory/createAsyncComponent';
  import { RETURN_URL_SESSION_KEY } from '@jeesite/core/router/guard/externalEntryGuard';

  import { useFullContent } from '@jeesite/core/hooks/web/useFullContent';

  const LayoutLockPage = createAsyncComponent(() => import('@jeesite/core/layouts/views/lock/index.vue'));
  const SettingDrawer = createAsyncComponent(() => import('@jeesite/core/layouts/default/setting/index.vue'));
  const SessionTimeoutLogin = createAsyncComponent(
    () => import('@jeesite/core/layouts/views/login/SessionTimeoutLogin.vue'),
  );
  const ABackTop = BackTop;
  const AButton = Button;

  const { getUseOpenBackTop, getShowSettingButton, getSettingButtonPosition } = useRootSetting();
  const userStore = useUserStoreWithOut();
  const { getShowHeader } = useHeaderSetting();
  const { getFullContent } = useFullContent();

  const getIsSessionTimeout = computed(() => userStore.getSessionTimeout);

  const getIsFixedSettingDrawer = computed(() => {
    // 全屏内容模式（外链 ?__full__ 进入）下不渲染悬浮设置按钮
    if (!unref(getShowSettingButton) || unref(getFullContent)) {
      return false;
    }
    const settingButtonPosition = unref(getSettingButtonPosition);

    if (settingButtonPosition === SettingButtonPositionEnum.AUTO) {
      return !unref(getShowHeader);
    }
    return settingButtonPosition === SettingButtonPositionEnum.FIXED;
  });

  const getTarget = () => document.body;

  // 第三方来源返回链接：externalEntryGuard 在外链进入时记录（一次性参数，已从地址栏移除）；
  // 路由变化时重读，保证外壳已挂载后再次进入外链也能感知
  const route = useRoute();
  const backToSourceUrl = ref('');
  watch(
    () => route.fullPath,
    () => {
      backToSourceUrl.value = sessionStorage.getItem(RETURN_URL_SESSION_KEY) ?? '';
    },
    { immediate: true },
  );

  const handleBackToSource = () => {
    const url = sessionStorage.getItem(RETURN_URL_SESSION_KEY);
    if (!url) {
      return;
    }
    sessionStorage.removeItem(RETURN_URL_SESSION_KEY);
    backToSourceUrl.value = '';
    window.location.href = url;
  };
</script>

<template>
  <LayoutLockPage />
  <ABackTop v-if="getUseOpenBackTop" :target="getTarget" />
  <SettingDrawer v-if="getIsFixedSettingDrawer" class="jeesite-setting-drawer-fearure" />
  <AButton v-if="backToSourceUrl" type="primary" class="back-to-source-btn" size="large" @click="handleBackToSource">
    返回
  </AButton>
  <SessionTimeoutLogin v-if="getIsSessionTimeout" />
</template>

<style lang="less">
  .jeesite-setting-drawer-fearure {
    position: absolute;
    top: 45%;
    right: 0;
    z-index: 10;
    display: flex;
    padding: 10px;
    color: @white;
    cursor: pointer;
    background-color: @primary-color;
    border-radius: 6px 0 0 6px;
    justify-content: center;
    align-items: center;

    svg {
      width: 1em;
      height: 1em;
    }
  }

  // 悬浮【返回】按钮：外链带 returnUrl 进入时显示于右上角，点击跳回第三方系统。
  // z-index 900：高于页面内容、低于 antd 弹层（Modal/Drawer 默认 1000+），不遮盖业务弹窗
  .back-to-source-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 900;
    box-shadow: 0 4px 12px rgb(0 33 64 / 20%);
  }
</style>
