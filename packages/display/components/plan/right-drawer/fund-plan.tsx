import { defineComponent, ref } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '../../collapsible-section';
import { ViewDetailButton } from './view-detail-button';
import { FundDetailModal } from './fund-detail-modal';

/** 资金方案 */
export const FundPlan = defineComponent({
  setup() {
    /** 资金情况详情弹窗可见性 */
    const detailVisible = ref(false);

    return () => (
      <>
        <div class="p-16px">
          {/* 可折叠区块 */}
          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px w-full items-center relative pb-4px">
                  <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                  <div class="text-18px font-400 text-white ml-8px font-youshe">片区资金方案</div>

                  {/* 箭头：打开朝下（SVG 原方向不旋转），关闭朝右（逆时针转 90°） */}
                  <img
                    src={arrowImg}
                    alt=""
                    class={cn('w-20px h-20px ml-auto transition-transform duration-200', {
                      '-rotate-90': !isOpen,
                    })}
                  />

                  {/* 底部图片 */}
                  <img src={bottomImg} alt="" class="w-full h-4px absolute bottom-0 left-0 object-fill" />
                </div>
              ),
              body: () => (
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  {/* 标题行 */}
                  <div class="flex h-24px items-center">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>
                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区资金情况</div>

                    {/* 查看详情按钮 */}
                    <ViewDetailButton
                      class="ml-auto h-30px w-72px"
                      label="查看详情"
                      onClick={() => (detailVisible.value = true)}
                    />
                  </div>

                  {/* 统计值 */}
                  <div class="mt-20px flex items-center">
                    <div class="text-14px text-white/75">已投资</div>
                    <div
                      class="ml-16px text-28px font-700 font-youshe flex items-center"
                      style={{
                        background: 'linear-gradient(180deg, #0AE3C0 0%, #5CE98A 100%)',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      0.25<span class="text-14px">亿</span>
                    </div>

                    <div class="ml-32px text-14px text-white/75">预算总额</div>

                    <div
                      class="ml-16px text-24px font-700 font-youshe flex items-center"
                      style={{
                        background: 'linear-gradient(180deg, #4FD8FF 0%, #2A9BE8 100%)',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      1.06<span class="text-14px font-500">亿</span>
                    </div>
                  </div>

                  {/* 占比 */}
                  <div class="mt-16px flex items-center justify-between">
                    <div class="text-14px text-white/70">已投资占比</div>
                    <div class="text-14px text-white">20.05%</div>
                  </div>

                  {/* 进度条 */}
                  <div class="my-18px">
                    <div class="relative h-6px w-full rd-full bg-white/8">
                      {/* 填充（发光渐变） */}
                      <div
                        class="absolute left-0 top-0 h-full rd-full"
                        style={{
                          width: '20.05%',
                          background: 'linear-gradient(90deg, #00E5C3 0%, #7BE7A9 55%, #B8F06A 100%)',
                          boxShadow: '0 0 10px rgba(90, 231, 138, 0.6)',
                        }}
                      />
                      {/* 端头亮块 */}
                      <div
                        class="absolute top-1/2 h-14px w-5px -translate-y-1/2 rd-sm"
                        style={{
                          left: 'calc(20.05% - 2px)',
                          background: '#C9F56A',
                          boxShadow: '0 0 8px rgba(201, 245, 106, 0.9)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ),
            }}
          />
        </div>

        {/* 资金情况详情弹窗（独立组件，不复用项目清单弹窗） */}
        <FundDetailModal
          visible={detailVisible.value}
          title="片区资金情况"
          onUpdate:visible={(v) => (detailVisible.value = v)}
        />
      </>
    );
  },
});
