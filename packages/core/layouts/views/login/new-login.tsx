import { useI18n } from '@jeesite/core/hooks/web/useI18n';
import { darkPrimaryColor } from '@jeesite/vite/theme/themeConfig';
import loginBgImg from '@jeesite/assets/images/login-bg.webp';
import { ConfigProvider, Tabs, theme } from 'antdv-next';
import dayjs from 'dayjs';
import { computed, defineComponent, ref } from 'vue';
import { createAsyncComponent } from '@jeesite/core/utils/factory/createAsyncComponent';
import { LoginStateEnum, useLoginState } from './useLogin';

import './new-login.less';

/** 强制 dark 的 antd 主题分支（镜像 AppProvider 的 isDark 配置，与全局主题无关） */
const FORCE_DARK_THEME = {
  algorithm: theme.darkAlgorithm,
  cssVar: { key: 'jeesite' },
  token: {
    fontFamily:
      "'HarmonyOS', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    colorPrimary: darkPrimaryColor,
    colorLink: darkPrimaryColor,
    colorInfo: darkPrimaryColor,
  },
};

/**
 * NewLogin —— 登录页新版视觉（Vue TSX + antdv-next）
 *
 * 表单区整体复用 Login.vue 的登录体系：
 * - 账号登录 / 手机登录 / 二维码登录 三个 Tab（useLoginState 共享状态切换）；
 * - 忘记密码、注册表单保留（账号 Tab 内「忘记密码」链接会切换到对应表单）；
 * - 嵌套 ConfigProvider 强制 darkAlgorithm + darkPrimaryColor，
 *   使所有表单始终以 dark 形态适配本页深蓝玻璃面板（与全局主题解耦）；
 * - 各表单内部自带完整逻辑（校验/验证码/login + afterLoginAction 跳转），外壳只负责视觉。
 */
/** 登录方式开关：false 屏蔽对应 Tab（临时下线，恢复时改回 true 即可） */
const ENABLE_MOBILE_LOGIN = false;
const ENABLE_QR_LOGIN = false;

export default defineComponent({
  name: 'NewLogin',
  setup() {
    const { t } = useI18n();
    const { getLoginState, setLoginState } = useLoginState();
    const demoMode = ref(false);

    // 注册/忘记密码态下隐藏 Tab 栏（对齐 Login.vue 的 getShow 口径）：
    // 这两个状态匹配不到任何 Tab 的 activeKey，且 Tab 栏占用的纵向空间会加剧表单溢出
    const getShowTabs = computed(() =>
      [LoginStateEnum.LOGIN, LoginStateEnum.MOBILE, LoginStateEnum.QR_CODE].includes(getLoginState.value),
    );

    // 动态导入（与 Login.vue 同款）：避免静态导入使旧登录页的懒加载拆包失效（INEFFECTIVE_DYNAMIC_IMPORT）
    // LoginForm 是默认 Tab，带 loading 占位防首屏闪烁
    const LoginForm = createAsyncComponent(() => import('./LoginForm.vue'), { loading: true });
    const MobileForm = createAsyncComponent(() => import('./MobileForm.vue'));
    const ForgetPasswordForm = createAsyncComponent(() => import('./ForgetPasswordForm.vue'));
    const QrCodeForm = createAsyncComponent(() => import('./QrCodeForm.vue'));
    const RegisterForm = createAsyncComponent(() => import('./RegisterForm.vue'));

    function handleTabsChange(key: unknown) {
      setLoginState(key as LoginStateEnum);
    }

    return () => (
      <div
        class="new-login-panel flex size-full justify-center overflow-y-auto bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${loginBgImg})`,
        }}
      >
        {/* min-h 而非固定 h：注册/忘记密码表单字段多，面板需随内容增高；
            my-auto 替代 items-center，视口过矮时内容可滚动到顶部而非被居中裁切 */}
        <div class="rd-12px my-auto flex w-600px min-h-640px flex-col items-center justify-center border-1px border-white/15 bg-black/25 text-white backdrop-blur pt-32px">
          <div class="font-500 text-24px text-white">武汉市城市更新信息管理平台</div>

          <ConfigProvider theme={FORCE_DARK_THEME}>
            <div class="mt-24px flex w-400px flex-col items-center">
              {getShowTabs.value && (
                <Tabs
                  class="w-full"
                  activeKey={getLoginState.value}
                  onChange={handleTabsChange}
                  centered
                  items={[
                    {
                      key: LoginStateEnum.LOGIN,
                      label: t('sys.login.signInFormTitle'),
                      content: <LoginForm onDemoMode={(v: any) => (demoMode.value = !!v)} />,
                    },
                    ...(ENABLE_MOBILE_LOGIN
                      ? [
                          {
                            key: LoginStateEnum.MOBILE,
                            label: t('sys.login.mobileSignInFormTitle'),
                            content: <MobileForm demoMode={demoMode.value} />,
                          },
                        ]
                      : []),
                    ...(ENABLE_QR_LOGIN
                      ? [
                          {
                            key: LoginStateEnum.QR_CODE,
                            label: t('sys.login.qrSignInFormTitle'),
                            // 包 px-4 对齐 LoginForm/MobileForm 的水平内边距，使返 回按钮宽度与其他 Tab 一致
                            content: (
                              <div class="px-4">
                                <QrCodeForm />
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              )}

              {/* 辅助状态表单：由 useLoginState 内部切换显示 */}
              <ForgetPasswordForm demoMode={demoMode.value} />
              <RegisterForm demoMode={demoMode.value} />
            </div>
          </ConfigProvider>
        </div>
      </div>
    );
  },
});
