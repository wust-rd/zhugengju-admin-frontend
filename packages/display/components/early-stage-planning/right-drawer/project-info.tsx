import { defineComponent, ref } from 'vue';
import { CollapsibleSection } from '../../collapsible-section';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { ViewDetailButton } from './view-detail-button';
import { ProjectDetailModal } from './project-detail-modal';

/** 片区项目清单 */
const PROJECT_LIST = [
  { id: '01', type: '既有建筑', color: '#5B9DF0', name: '老万成副食店' },
  { id: '02', type: '既有建筑', color: '#5B9DF0', name: '长江书店遗址' },
  { id: '03', type: '老旧小区', color: '#52D273', name: '任东新村' },
  { id: '04', type: '老旧街区', color: '#F5C443', name: '绍兴片城市更新项目' },
  { id: '05', type: '老旧街区', color: '#F5C443', name: '楚宝片改造项目' },
];

/** 项目情况 */
export const ProjectInfo = defineComponent({
  setup() {
    /** 项目详情弹窗可见性 */
    const detailVisible = ref(false);

    return () => (
      <>
        <div class="p-16px overflow-hidden relative">
          {/* 可折叠区块 */}
          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px w-full items-center relative pb-4px">
                  <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                  <div class="text-18px font-400 text-white ml-8px font-youshe">片区项目情况</div>

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
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6 p-12px">
                  {/* 标题行 */}
                  <div class="flex h-34px items-center">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>
                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区项目清单</div>

                    {/* 查看详情按钮（组件：蓝渐变 + 三处光晕） */}
                    <ViewDetailButton
                      class="ml-auto h-30px w-72px"
                      label="查看详情"
                      onClick={() => (detailVisible.value = true)}
                    />
                  </div>

                  {/* 项目列表 */}
                  <div class="mt-4px flex flex-col divide-y divide-white/6">
                    {PROJECT_LIST.map((p) => (
                      <div key={p.id} class="flex items-center py-14px">
                        <div class="w-44px shrink-0 text-14px text-white/45">{p.id}</div>

                        <div class="flex shrink-0 items-center gap-6px w-108px">
                          <div class="size-8px rd-full" style={{ backgroundColor: p.color }} />
                          <div class="text-14px text-white/75">{p.type}</div>
                        </div>

                        <div class="flex-1 text-left text-14px text-white ml-16px">{p.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            }}
          />
        </div>

        {/* 项目详情弹窗（独立组件，不复用图册弹窗） */}
        <ProjectDetailModal
          visible={detailVisible.value}
          title="片区项目清单"
          onUpdate:visible={(v) => (detailVisible.value = v)}
        />
      </>
    );
  },
});
