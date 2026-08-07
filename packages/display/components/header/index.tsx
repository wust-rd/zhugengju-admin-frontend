import { defineComponent } from 'vue';
import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { UserProfile } from './user-profile';

/**
 * 演示应用 Header（试管状胶囊导航条）
 *
 * - 配色完全来自 figma style:
 *   border-bottom: 2px solid rgba(95, 191, 255, 0.60);
 *   background: linear-gradient(180deg, rgba(0, 31, 64, 0.75) 0%, #023164 100%);
 *   box-shadow: 0 32px 76px 0 rgba(0, 5, 26, 0.30), 0 0 16px 0 rgba(71, 152, 247, 0.60) inset;
 *   backdrop-filter: blur(18px);
 * - 形状: 悬浮胶囊（top-4 + rounded-full），滚动时始终浮在内容上方
 * - 内容: 通过默认 slot 注入，按钮/logo 由调用方按需实现
 */
export const Header = defineComponent({
  setup(_, { slots }) {
    return () => (
      <header
        class="sticky z-50 relative flex h-90px w-full flex items-center"
        style={{
          background: '#001F40',
          boxShadow: '0 32px 76px 0 rgba(0, 5, 26, 0.30), 0 0 16px 0 rgba(71, 152, 247, 0.60) inset',
          backdropFilter: 'blur(18px)',
        }}
      >
        {slots.default?.()}

        <Logo />

        <NavLinks />

        <UserProfile />

        {/* 仅右端 500px 显示底部高光边框，左端渐隐，不占布局流 */}
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
      </header>
    );
  },
});
