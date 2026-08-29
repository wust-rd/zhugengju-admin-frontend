import { computed, defineComponent, onMounted, onUnmounted, ref, unref } from 'vue';
import { Dropdown, type MenuItemType } from 'antdv-next';
import { useRouter } from 'vue-router';
import { useUserStore } from '@jeesite/core/store/modules/user';
import { useHeaderSetting } from '@jeesite/core/hooks/setting/useHeaderSetting';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { useDict } from '@jeesite/core/components/Dict';
import { switchPost, switchRole, switchSys } from '@jeesite/core/api/sys/login';
import { PageEnum } from '@jeesite/core/enums/pageEnum';
import { publicPath } from '@jeesite/core/utils/env';
import { cn } from '@jeesite/core/libs';
import { Check, CircleDot, KeyRound, Lock, LogOut, Maximize, Minimize, User } from 'lucide-vue-next';

/**
 * UserDropDown —— 用户下拉（display 风格）
 *
 * 对标后台 packages/core/layouts/default/header/components/user-dropdown/index.vue：
 * 提供 个人中心 / 修改密码 / 全屏 / 锁屏 / 退出登录，
 * 并条件展示 系统切换 / 选择岗位 / 选择身份（仅当用户信息含相应数据时）。
 * 模块导航菜单不放这里：由 header 的 SystemAction（设置图标）承载，
 * 点击进入后端菜单树第一个路由（对标图1的 NavLink 行为）。
 */
export const UserDropDown = defineComponent({
  name: 'DisplayUserDropDown',
  setup() {
    const router = useRouter();
    const go = useGo();
    const userStore = useUserStore();
    const { getUseLockPage } = useHeaderSetting();

    const locked = ref(false);
    const isFullscreen = ref(false);
    const updateFullscreen = () => (isFullscreen.value = !!document.fullscreenElement);
    onMounted(() => {
      updateFullscreen();
      document.addEventListener('fullscreenchange', updateFullscreen);
    });
    onUnmounted(() => document.removeEventListener('fullscreenchange', updateFullscreen));

    function toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }

    const user = computed(() => unref(userStore.getUserInfo) || {});
    const userName = computed(() => user.value.userName || user.value.loginCode || '演示用户');
    const avatar = computed(() => user.value.avatarUrl || '');

    const sysList = ref<any[]>([]);
    const sysCodeRef = ref('default');
    const roleCodeRef = ref('');
    const postCodeRef = ref('');
    const postRolePermi = ref(false);

    const filteredRoleList = computed(() => (user.value.roleList || []).filter((e: any) => e.isShow === '1'));
    const postList = computed(() => user.value.postList || []);

    onMounted(async () => {
      sysCodeRef.value = userStore.getPageCacheByKey('sysCode', 'default');
      roleCodeRef.value = userStore.getPageCacheByKey('roleCode', '');
      postCodeRef.value = userStore.getPageCacheByKey('postCode', '');
      postRolePermi.value = userStore.getPageCacheByKey('postRolePermi', false);
      try {
        const sysListData = await useDict().initGetDictList('sys_menu_sys_code');
        if (Array.isArray(sysListData) && sysListData.length > 1) {
          const allowed: string[] = [];
          for (const role of filteredRoleList.value) {
            if (role.sysCodes) {
              for (const code of String(role.sysCodes).split(',')) {
                if (code && !allowed.includes(code)) allowed.push(code);
              }
            }
          }
          sysList.value =
            allowed.length === 0 ? sysListData : sysListData.filter((e: any) => allowed.includes(e.value));
        }
      } catch {
        sysList.value = [];
      }
    });

    const menuItems = computed<MenuItemType[]>(() => {
      const base: MenuItemType[] = [
        { key: 'accountCenter', label: '个人中心', icon: <User size={14} /> },
        { key: 'modifyPwd', label: '修改密码', icon: <KeyRound size={14} /> },
        { type: 'divider' },
        {
          key: 'fullscreen',
          label: isFullscreen.value ? '退出全屏' : '全屏',
          icon: isFullscreen.value ? <Minimize size={14} /> : <Maximize size={14} />,
        },
      ];
      if (getUseLockPage.value) {
        base.push({ key: 'lock', label: '锁屏', icon: <Lock size={14} /> });
      }
      base.push({ key: 'logout', label: '退出登录', icon: <LogOut size={14} />, danger: true });

      if (sysList.value.length > 0) {
        base.push({ type: 'divider' });
        base.push({
          type: 'group',
          label: '系统切换',
          key: 'sysTitle',
          children: sysList.value.map((item: any) => ({
            key: `sysCode-${item.value}`,
            label: item.name,
            icon: sysCodeRef.value === item.value ? <Check size={14} /> : <CircleDot size={14} />,
          })),
        });
      }

      const showPost = postRolePermi.value && postList.value.length > 0;
      const showRole = filteredRoleList.value.length > 0;
      if (showPost) {
        base.push({ type: 'divider' });
        base.push({
          type: 'group',
          label: '选择岗位',
          key: 'postTitle',
          children: postList.value.map((item: any) => ({
            key: `postCode-${item.postCode}`,
            label: item.postName,
            icon: postCodeRef.value === item.postCode ? <Check size={14} /> : <CircleDot size={14} />,
          })),
        });
      } else if (showRole) {
        base.push({ type: 'divider' });
        base.push({
          type: 'group',
          label: '选择身份',
          key: 'roleTitle',
          children: filteredRoleList.value.map((item: any) => ({
            key: `roleCode-${item.roleCode}`,
            label: item.roleName,
            icon: roleCodeRef.value === item.roleCode ? <Check size={14} /> : <CircleDot size={14} />,
          })),
        });
      }
      return base;
    });

    async function handleMenuClick({ key }: { key: string | number }) {
      switch (key) {
        case 'accountCenter':
          go('/account/center');
          break;
        case 'modifyPwd':
          go('/account/modPwd');
          break;
        case 'logout':
          userStore.confirmLoginOut();
          break;
        case 'fullscreen':
          toggleFullscreen();
          break;
        case 'lock':
          locked.value = true;
          break;
        default: {
          const sk = String(key);
          const prefixOf = (p: string) => sk.startsWith(p);
          const val = (p: string) => sk.substring(p.length);
          try {
            if (prefixOf('sysCode-')) {
              await switchSys(val('sysCode-'));
              await userStore.getUserInfoAction();
              location.href = publicPath + PageEnum.BASE_HOME;
            } else if (prefixOf('postCode-')) {
              await switchPost(val('postCode-'));
              await userStore.getUserInfoAction();
              location.href = publicPath + PageEnum.BASE_HOME;
            } else if (prefixOf('roleCode-')) {
              await switchRole(val('roleCode-'));
              await userStore.getUserInfoAction();
              location.href = publicPath + PageEnum.BASE_HOME;
            }
          } catch {
            /* 后端未接入时静默忽略 */
          }
        }
      }
    }

    const lockOverlay = () =>
      locked.value ? (
        <div class="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-[#001F40]/95 backdrop-blur">
          <Lock class="mb-4 text-cyan-300" size={44} />
          <div class="text-20px font-600 text-white">屏幕已锁定</div>
          <div class="mt-8 flex gap-4">
            <button
              type="button"
              class="cursor-pointer rounded-full border border-white/20 bg-white/10 px-6 py-2 text-14px text-white hover:bg-white/20"
              onClick={() => (locked.value = false)}
            >
              解锁
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-full bg-cyan-500/30 px-6 py-2 text-14px text-cyan-100 hover:bg-cyan-500/40"
              onClick={() => {
                locked.value = false;
                router.push('/login');
              }}
            >
              返回管理后台
            </button>
          </div>
        </div>
      ) : null;

    return () => (
      <>
        <Dropdown
          menu={{ items: menuItems.value, onClick: handleMenuClick }}
          trigger={['click']}
          placement="bottomRight"
        >
          <div class="flex cursor-pointer select-none items-center gap-2 rounded-full px-8px h-44px transition-colors hover:bg-white/12">
            {avatar.value ? (
              <img src={avatar.value} alt="" class="size-30px rounded-full border border-white/30 object-cover" />
            ) : (
              <span class="flex size-30px items-center justify-center rounded-full bg-cyan-500/30 text-white">
                <span class="i-ri-user-3-fill size-18px" />
              </span>
            )}
            <span class={cn('max-w-120px truncate text-14px text-gray-200')}>{userName.value}</span>
            <span class="i-ri-arrow-down-s-line size-16px text-gray-400" />
          </div>
        </Dropdown>
        {lockOverlay()}
      </>
    );
  },
});
