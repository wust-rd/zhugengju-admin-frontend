import { defineComponent } from 'vue';
import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { UserProfile } from './user-profile';
import { Search, Notify, SystemAction, useDisplaySettings } from './actions';

/**
 * 演示应用 Header（试管状胶囊导航条）
 *
 * onClick 结构（由后台 header 内容嫁接而来）：
 *   [Logo] [NavLinks]                  —— 保留 display 原有 Logo + 模块导航
 *   [Search][Notify][System(设置图标)] —— 放 UserProfile 左侧（纯图标；系统入口进菜单树第一个路由）
 *   [UserProfile: UserDropDown] —— 用户下拉（个人中心/修改密码/全屏/锁屏/退出）
 *
 * - 配色完全来自 figma style:
 *   border-bottom: 2px solid rgba(95, 191, 255, 0.60);
 *   background: linear-gradient(180deg, rgba(0, 31, 64, 0.75) 0%, #023164 100%);
 *   box-shadow: 0 32px 76px 0 rgba(0, 5, 26, 0.30), 0 0 16px 0 rgba(71, 152, 247, 0.60) inset;
 *   backdrop-filter: blur(18px);
 * - 右端底部高光光带受大屏设置「顶部高光光带」开关控制（settings.headerGlow）
 * - 内容: 通过默认 slot 注入，按钮/logo 由调用方按需实现
 */
export const Header = defineComponent({
  setup(_, { slots }) {
    const settings = useDisplaySettings();

    return () => (
      <div
        class="sticky top-0 z-50 flex h-88px w-full items-center"
        style={{
          background: '#001F40',
        }}
      >
        {slots.default?.()}

        <Logo />

        {/* NavLinks 居中：flex-1 吃掉剩余宽度，使后面的 action 簇 + 功能坞靠右 */}

        <NavLinks />

        {/* 后台 action 簇：Search / Notify / System → UserProfile 左边（纯图标） */}
        <div class="ml-auto flex items-center gap-1 pl-3">
          <Search />
          <Notify />
          <SystemAction />
        </div>

        {/* 后台 action 功能坞：UserDropDown */}
        <UserProfile />

        {/* 仅右端 500px 显示底部高光边框，左端渐隐，不占布局流；受设置开关控制 */}
        {settings.headerGlow && (
          <div
            class="pointer-events-none absolute"
            style={{
              right: 0,
              bottom: 0,
              width: '800px',
              height: '2px',
              background: 'linear-gradient(90deg, rgba(95, 191, 255, 0), rgba(95, 191, 255, 0.8))',
            }}
          />
        )}
      </div>
    );
  },
});
