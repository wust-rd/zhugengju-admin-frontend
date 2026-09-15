import { defineComponent, type PropType } from 'vue';
import headerImg from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';
import pictureBoxImg from '@jeesite/assets/images/display/plan/picture-box.webp';
import testImg from '@jeesite/assets/images/display/plan/test.webp';
import arrowImg from '@jeesite/assets/images/display/plan/arrow.png';

/** 列表分隔线渐变 */
const DIVIDER_GRADIENT =
  'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, rgba(90, 244, 255, 0.15) 53.85%, rgba(255, 255, 255, 0.02) 100%)';

/** 顶部统计卡片项（tag = 以标签样式展示） */
export type AreaOverviewStat = { label: string; value: string; tag?: boolean };

/** 详细信息列表项（badge = 值左侧的小标签） */
export type AreaOverviewInfo = { label: string; value: string; badge?: string };

/** 内置演示数据：调用方不传 stats / infos 时使用（便于单独预览组件） */
const DEFAULT_STATS: AreaOverviewStat[] = [
  { label: '片区名称', value: '楚宝片' },
  { label: '片区规模', value: '25公顷' },
  { label: '更新情况', value: '已批准', tag: true },
];

const DEFAULT_INFOS: AreaOverviewInfo[] = [
  { label: '所在区位', value: '江汉区' },
  { label: '四至范围', value: '西至前进一路、东至前进四路、北至自治街、南至中山大道' },
  { label: '起始时间', value: '2024年12月 - 至今' },
  { label: '功能定位', value: '文化导向', badge: 'COD' },
];

/**
 * 片区概况 Modal：右侧上方悬浮面板
 *
 * 结构：标题图 → 相框（图片垫底 + 相框覆盖层）→ 统计卡片 → 详细信息列表 → 查看详情按钮
 * 统计卡片 / 详细信息列表完全由 stats / infos 两个 props 数据驱动，新增条目只需改数据。
 *
 * props：
 * - stats: 顶部统计卡片项（{ label, value, tag? }[]），不传用内置演示数据
 * - infos: 详细信息列表项（{ label, value, badge? }[]），不传用内置演示数据
 *
 * 用法：
 * ```tsx
 * <AreaOverviewModal stats={[{ label: '片区名称', value: '一元片' }]} infos={[...]} />
 * ```
 */
export const AreaOverviewModal = defineComponent({
  name: 'AreaOverviewModal',
  props: {
    /** 顶部统计卡片数据（不传则用内置演示数据） */
    stats: { type: Array as PropType<AreaOverviewStat[]>, default: () => DEFAULT_STATS },
    /** 详细信息列表数据（不传则用内置演示数据） */
    infos: { type: Array as PropType<AreaOverviewInfo[]>, default: () => DEFAULT_INFOS },
    /** 点击「查看详情」的回调（跳转目标由调用方决定；不传则按钮无动作） */
    onDetail: { type: Function as PropType<() => void>, required: false },
  },
  setup(props) {
    return () => (
      <div
        class="absolute right-12px top-12px z-20 w-320px max-h-[calc(100vh_-_200px)] rounded-xl px-12px py-16px shadow-2xl backdrop-blur-10 overflow-auto"
        style={{ background: 'linear-gradient(171deg, #0F172A -11.93%, #1A5072 99.26%)' }}
      >
        {/* 标题图 */}
        <div style={{ backgroundImage: `url(${headerImg})` }} class="h-42px w-296px bg-contain" />

        {/* 相框：图片垫底，相框覆盖层叠在图片上面 */}
        <div class="relative mt-20px h-184px w-full overflow-hidden">
          <div style={{ backgroundImage: `url(${testImg})` }} class="absolute inset-10px rd-24px bg-contain" />
          <img src={pictureBoxImg} alt="相框" class="absolute inset-0 size-full object-contain" />
        </div>

        {/* 统计卡片 */}
        <div class="mt-16px flex h-76px w-full b-1 b-solid b-white/6 bg-white/2 py-4px text-center font-500 rd-8px">
          {props.stats.map((item) => (
            <div key={item.label} class="flex-1 py-8px">
              <div class="text-14px lh-20px text-white/75">{item.label}</div>
              {item.tag ? (
                <div class="mt-8px inline-block b-1 b-solid b-[rgba(23,254,185,0.45)] rd-12px px-8px py-2px text-14px text-#17FEB9">
                  {item.value}
                </div>
              ) : (
                <div class="mt-8px text-16px lh-24px text-white">{item.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* 详细信息列表 */}
        <div class="mt-8px w-full b-1 b-solid b-white/6 bg-white/2 px-16px py-18px font-500 rd-8px">
          {props.infos.map((item, index) => (
            <div key={item.label}>
              <div class="flex items-center">
                <img src={arrowImg} alt="" class="h-14px w-12px" />
                <div class="ml-8px text-14px text-#53E2F6">{item.label}</div>
              </div>

              <div class="mt-12px flex items-center text-16px lh-24px text-white">
                {item.badge && (
                  <div class="mr-12px inline-block bg-#17FEB9 px-6px py-2px text-10px font-600 lh-14px rd-4px text-black">
                    {item.badge}
                  </div>
                )}
                {item.value}
              </div>

              {/* 分隔线：最后一项不显示 */}
              {index < props.infos.length - 1 && (
                <div class="my-12px h-1px w-full" style={{ background: DIVIDER_GRADIENT }} />
              )}
            </div>
          ))}
        </div>

        {/* 查看详情按钮：进入片区详情页，跳转逻辑由调用方通过 onDetail 注入 */}
        <div
          class="mt-20px flex h-44px b-1 b-solid b-[#0BD6FFBF] cursor-pointer items-center justify-center rd-full text-white"
          onClick={() => props.onDetail?.()}
        >
          查看详情
        </div>
      </div>
    );
  },
});
