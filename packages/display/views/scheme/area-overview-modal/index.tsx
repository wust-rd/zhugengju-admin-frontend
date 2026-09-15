import { defineComponent, type PropType } from 'vue';
import { XOD_COLOR } from '@jeesite/display/components/corner-panel/xod-row';
import headerImg from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';
import pictureBoxImg from '@jeesite/assets/images/display/plan/picture-box.webp';
import arrowImg from '@jeesite/assets/images/display/plan/arrow.png';

/** 皮子街片区图片 OSS 基础地址（原始链接为 percent-encoding，这里已解码） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/** 相框内的片区概况图 */
const AREA_IMG = `${AREA_OSS}/片区概况.webp`;

/** 列表分隔线渐变 */
const DIVIDER_GRADIENT =
  'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, rgba(90, 244, 255, 0.15) 53.85%, rgba(255, 255, 255, 0.02) 100%)';

/** 顶部统计卡片项（tag = 以标签样式展示） */
export type AreaOverviewStat = { label: string; value: string; tag?: boolean };

/** 详细信息列表项（badges = 值左侧的导向胶囊，取值 COD/IOD/SOD… 与左侧看板更新片区列表同一套配色） */
export type AreaOverviewInfo = { label: string; value: string; badges?: string[] };

/** 内置演示数据：调用方不传 stats / infos 时使用（便于单独预览组件） */
const DEFAULT_STATS: AreaOverviewStat[] = [
  { label: '片区名称', value: '楚宝片' },
  { label: '片区规模', value: '25公顷' },
  { label: '更新情况', value: '已批准', tag: true },
];

const DEFAULT_INFOS: AreaOverviewInfo[] = [
  { label: '所在区位', value: '江汉区' },
  { label: '四至范围', value: '东临硚口路，西至双厂巷，南至仁寿路，北至解放大道' },
  { label: '起始时间', value: '2024年12月 - 至今' },
  { label: '功能定位', value: '文化导向', badges: ['COD'] },
];

/** 按 label 取内置演示数据里的值：调用方没有对应字段时兜底用（如「四至范围」geojson 里暂无） */
export function defaultInfoValue(label: string): string {
  return DEFAULT_INFOS.find((i) => i.label === label)?.value ?? '—';
}

/**
 * 片区概况 Modal：右侧上方悬浮面板
 *
 * 结构：标题图 → 相框（片区图垫底 + 相框覆盖层）→ 统计卡片 → 详细信息列表 → 查看详情按钮
 * 统计卡片 / 详细信息列表完全由 stats / infos 两个 props 数据驱动，新增条目只需改数据。
 * 功能定位的导向胶囊（COD / IOD / SOD…）复用左侧数据看板「更新片区列表」的 XOD_COLOR 配色。
 *
 * props：
 * - stats: 顶部统计卡片项（{ label, value, tag? }[]），不传用内置演示数据
 * - infos: 详细信息列表项（{ label, value, badges? }[]），不传用内置演示数据
 * - onDetail: 点击「查看详情」的回调，不传则按钮无动作
 *
 * 用法：
 * ```tsx
 * <AreaOverviewModal stats={[{ label: '片区名称', value: '一元片' }]} infos={[...]} onDetail={...} />
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

        {/* 相框：片区图垫底，相框覆盖层叠在图片上面 */}
        <div class="relative mt-20px h-184px w-full overflow-hidden">
          <img
            src={AREA_IMG}
            alt="片区概况"
            class="absolute inset-10px size-[calc(100%_-_20px)] rd-24px object-cover"
          />
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
                {/* 导向胶囊：与左侧看板「更新片区列表」同款样式
                    （XOD_COLOR 配色 + Chakra Petch 西文字体 + 32×16 圆角小胶囊） */}
                {!!item.badges?.length && (
                  <div class="mr-12px flex flex-wrap items-center gap-6px">
                    {item.badges.map((code) => (
                      <div
                        key={code}
                        class="font-chakra rd-4px w-32px h-16px flex items-center justify-center text-black text-14px font-500"
                        style={{ background: XOD_COLOR[code.toLowerCase()] ?? '#17FEB9' }}
                      >
                        {code.toUpperCase()}
                      </div>
                    ))}
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
