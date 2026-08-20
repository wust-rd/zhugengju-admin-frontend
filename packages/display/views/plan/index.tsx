import { ArtFont } from '@jeesite/display/components/art-font';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { type MenuItemType } from 'antdv-next';
import { AnimatePresence, animate, motion } from 'motion-v';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'DisplayPlan',
  setup() {
    // 指标分类下拉菜单项
    const batches: MenuItemType[] = [
      {
        key: '1',
        label: '第一批 80',
      },
      {
        key: '2',
        label: ' 第二批 120',
      },
    ];

    const activeBatch = ref('1');

    /** 左侧面板引用：向左平移收起的动画目标 */
    const panelRef = ref<HTMLDivElement | null>(null);
    /** 收起按钮（GlassRing）引用：motion-v 通过该 ref 关联触发元素 */
    const ringRef = ref<InstanceType<typeof GlassRing> | null>(null);
    /** 收起状态：true = 面板已向左平移收起 */
    const collapsed = ref(false);

    /**
     * 点击收起/展开按钮：
     * - 收起：面板整体向左平移（x: 0 → -460px，移出屏幕左侧）
     * - 展开：面板向右平移回原位（x: -460 → 0）
     * 用 motion-v 的 animate() 命令式驱动，保证与 UI 状态 ref 同步。
     */
    const toggleCollapse = () => {
      const el = panelRef.value;
      if (!el) return;
      animate(el, collapsed.value ? { x: [-460, 0] } : { x: [0, -460] }, {
        duration: 0.3,
        ease: 'easeInOut',
      });
      collapsed.value = !collapsed.value;
    };

    return () => (
      <div class="relative h-full">
        {/* 展开按钮：面板收起后固定在左边缘，点击展开面板 */}
        <AnimatePresence>
          {collapsed.value && (
            <motion.div
              key="expand-btn"
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.2 }}
              class="absolute left-8px top-32px"
            >
              <GlassRing class="w-32px h-32px flex items-center justify-center cursor-pointer" onClick={toggleCollapse}>
                <div class="i-ri-arrow-right-double-fill size-20px text-white" />
              </GlassRing>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 左侧面板：点击 GlassRing 后整体向左平移收起 */}
        <div ref={panelRef} class="blue-bg pl-16px pr-24px pt-24px w-460px h-full flex flex-col">
          <GlowTitle2 class="w-full h-56px">
            <ArtFont class="ml-72px text-20px">数据看板</ArtFont>

            <DropdownSelector v-model:activeKey={activeBatch.value} items={batches} class="ml-auto w-128px" ghost />

            <GlassRing
              ref={ringRef}
              class="ml-16px w-32px h-32px flex items-center justify-center cursor-pointer"
              onClick={toggleCollapse}
            >
              <div class="i-ri-arrow-left-double-fill size-20px text-white" />
            </GlassRing>
          </GlowTitle2>
        </div>
      </div>
    );
  },
});
