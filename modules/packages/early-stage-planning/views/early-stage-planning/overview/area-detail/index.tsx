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
 * 取数：:auid = 片区 A_UID。本页自行按它取数（刷新 / 直接打开链接都能用）：
 * 图斑要素走 area-data 的 loadAreas('全部')（批次缓存 + in-flight 去重，从看板点进来命中
 * 同一份缓存不重复请求；要素含解码后 geometry，后续左侧展示面板接地图可直接用）；
 * 填报表单走 area-info 的 loadSchemeFill（auid 缓存，看板概况卡片点开即预热；未填报/
 * 加载失败静默 null，不阻断页面）。两者就绪后组装 AreaInfo 一起下传右侧抽屉各 tab。
 *
 * 返回：优先 router.back()（回到看板，看板被 keep-alive 缓存时其状态原样保留），
 * 直接打开链接无历史时兜底跳看板路径。
 *
 * 左右联动：activeTab 是本页唯一状态源，v-model 给右侧抽屉；左侧面板既接收它
 * （抽屉 → 面板，据此切换展示内容），也能通过 tabChange 反向驱动抽屉（面板 → 抽屉）。
 */
import { defineComponent, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { loadAreas } from '../area-data';
import { loadSchemeFill, type AreaInfo } from '../area-info';
import { DRAWER_TABS, RightDrawer, type DrawerTabLabel } from '../right-drawer';
import { AreaDetailPanel } from './display-panel';
import { OVERVIEW_ROUTE_PATH } from './route';

export default defineComponent({
  name: 'EarlyStagePlanningAreaDetail',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const go = useGo();

    /** 抽屉当前高亮区块：左右联动的唯一状态源（面板与抽屉都读写它） */
    const activeTab = ref<DrawerTabLabel>(DRAWER_TABS[0]);

    /** 当前片区完整数据（null = 未就绪/不存在）：图斑要素 + 填报表单（表单可 null） */
    const info = shallowRef<AreaInfo | null>(null);
    const loading = ref(false);
    /** 失败/为空时的提示文案（空串 = 正常） */
    const failed = ref('');

    /** 解析序号：路由参数快速变化时只认最后一次请求的结果 */
    let resolveSeq = 0;

    /** 按 A_UID 取片区完整数据：图斑要素（area-data 批次缓存）+ 填报表单
        （area-info auid 缓存，未填报/失败 → null 静默，不阻断页面） */
    async function resolveArea(auid: string) {
      const seq = ++resolveSeq;
      info.value = null;
      failed.value = '';
      if (!auid) {
        failed.value = '缺少片区编号（地址应为 …/area-detail/{片区编号}）';
        return;
      }
      loading.value = true;
      try {
        const fc = await loadAreas('全部');
        if (seq !== resolveSeq) return;
        const feature = fc.features.find((f) => f.properties.A_UID === auid) ?? null;
        if (!feature) {
          failed.value = `未找到片区：${auid}`;
          return;
        }
        let form: AreaInfo['form'] = null;
        try {
          form = await loadSchemeFill(auid, feature.properties.AREA_NAME ?? '');
        } catch {
          // 表单是辅助数据：失败静默为 null（图片等填报字段缺省），不影响页面
        }
        if (seq !== resolveSeq) return;
        info.value = { feature, form };
      } catch (e) {
        if (seq === resolveSeq) failed.value = `片区数据加载失败：${e instanceof Error ? e.message : e}`;
      } finally {
        if (seq === resolveSeq) loading.value = false;
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
        {info.value ? (
          <>
            {/* 左侧展示面板：占满除抽屉宽度（420px）以外的区域 */}
            <div class="absolute inset-y-0 left-0 right-420px">
              <AreaDetailPanel
                area={info.value}
                activeTab={activeTab.value}
                onBack={goBack}
                onTabChange={(tab: DrawerTabLabel) => (activeTab.value = tab)}
              />
            </div>

            {/* 右侧抽屉：组件自带 absolute right-0 top-0 h-full w-420px（不占文档流），v-model 双向联动；
                area = AreaInfo（图斑要素 + 填报表单含图片直链），抽屉内各 tab 消费 */}
            <RightDrawer v-model:activeTab={activeTab.value} area={info.value} />
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
