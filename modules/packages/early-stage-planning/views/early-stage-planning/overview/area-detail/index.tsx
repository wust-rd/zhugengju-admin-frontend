/**
 * 片区详情（大屏路由页）：/early-stage-planning/overview/area-detail/:auid
 *
 * 布局：左侧展示面板（display-panel.tsx）+ 右侧 RightDrawer 抽屉（420px，组件自带
 * `absolute right-0 top-0 h-full w-420px`，故页面根节点为 `relative h-[calc(100vh-88px)]`）。
 *
 * 路由：注册在 packages/core/router/routes/modules/early-stage-planning.ts（前端声明路由，
 * BACK 菜单模式下同样会被合并挂载）；路径落在 /early-stage-planning/overview/ 前缀下，
 * 布局自动判定为沉浸式全屏。跳转方在 ../index.tsx（概况面板「查看详情」）。
 * 参数名用 :auid 而非 :id，是为了避开 paramMenuGuard 的参数菜单替换（原因见路由注册文件注释）。
 *
 * 取数：:auid = 片区 A_UID。本页自行按它取行数据（刷新 / 直接打开链接都能用），
 * 走 area-data 的 loadAreas('全部')（带批次缓存 + in-flight 去重）——从看板点进来时命中
 * 同一份缓存，不会重复请求；解析出的要素含解码后 geometry，后续左侧展示面板接地图可直接用。
 *
 * 返回：优先 router.back()（回到看板，看板被 keep-alive 缓存时其状态原样保留），
 * 直接打开链接无历史时兜底跳看板路径。
 *
 * 左右联动：activeTab 是本页唯一状态源，v-model 给右侧抽屉；左侧面板既接收它
 * （抽屉 → 面板，据此切换展示内容），也能通过 tabChange 反向驱动抽屉（面板 → 抽屉）。
 */
import { defineComponent, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { loadAreas, type AreaCollection } from '../area-data';
import { DRAWER_TABS, RightDrawer, type DrawerTabLabel } from '../right-drawer';
import { AreaDetailPanel } from './display-panel';
import { OVERVIEW_ROUTE_PATH } from './route';

/** 片区要素（properties 已含 FUNC_FIRST 派生属性；geometry 为解码后 MultiPolygon） */
type AreaFeature = AreaCollection['features'][number];

export default defineComponent({
  name: 'EarlyStagePlanningAreaDetail',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const go = useGo();

    /** 抽屉当前高亮区块：左右联动的唯一状态源（面板与抽屉都读写它） */
    const activeTab = ref<DrawerTabLabel>(DRAWER_TABS[0]);

    /** 当前片区要素（null = 未就绪/不存在） */
    const feature = ref<AreaFeature | null>(null);
    const loading = ref(false);
    /** 失败/为空时的提示文案（空串 = 正常） */
    const failed = ref('');

    /** 按 A_UID 解析片区行：与看板共用 area-data 的批次缓存 */
    async function resolveArea(auid: string) {
      feature.value = null;
      failed.value = '';
      if (!auid) {
        failed.value = '缺少片区编号（地址应为 …/area-detail/{片区编号}）';
        return;
      }
      loading.value = true;
      try {
        const fc = await loadAreas('全部');
        feature.value = fc.features.find((f) => f.properties.A_UID === auid) ?? null;
        if (!feature.value) failed.value = `未找到片区：${auid}`;
      } catch (e) {
        failed.value = `片区数据加载失败：${e instanceof Error ? e.message : e}`;
      } finally {
        loading.value = false;
      }
    }

    // 路由参数变化（含同组件复用场景）即重新取数；key=route.fullPath 会把同路由不同 auid 也重挂载
    watch(() => String(route.params.auid ?? ''), resolveArea, { immediate: true });

    /** 返回看板：有历史就回退（保留看板状态），直接打开链接时兜底跳看板路径 */
    function goBack() {
      if (window.history.state?.back) router.back();
      else go(OVERVIEW_ROUTE_PATH);
    }

    return () => (
      <div class="relative h-[calc(100vh-88px)] overflow-hidden bg-[#01213B]">
        {feature.value ? (
          <>
            {/* 左侧展示面板：占满除抽屉宽度（420px）以外的区域 */}
            <div class="absolute inset-y-0 left-0 right-420px">
              <AreaDetailPanel
                area={feature.value.properties}
                activeTab={activeTab.value}
                onBack={goBack}
                onTabChange={(tab: DrawerTabLabel) => (activeTab.value = tab)}
              />
            </div>

            {/* 右侧抽屉：组件自带 absolute right-0 top-0 h-full w-420px（不占文档流），v-model 双向联动 */}
            <RightDrawer v-model:activeTab={activeTab.value} />
          </>
        ) : (
          /* 加载中 / 取数失败 / 片区不存在：同一大屏底色的占位态（带返回按钮，避免卡死） */
          <div class="flex h-full flex-col items-center justify-center gap-16px text-white/60">
            <div class="text-16px">{loading.value ? '片区数据加载中…' : failed.value || '片区不存在'}</div>

            {!loading.value && (
              <div
                class="cursor-pointer b-1 b-solid b-[#0BD6FFBF] px-16px py-6px text-14px text-white rd-full transition-all duration-300 hover-bg-[#0BD6FF26]"
                onClick={goBack}
              >
                返回看板
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
