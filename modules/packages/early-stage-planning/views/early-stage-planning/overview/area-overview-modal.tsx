/**
 * 片区概况 Modal：右侧上方悬浮面板（地图点击片区弹出）
 *
 * 结构：标题图 → 相框（片区概况图片垫底 + 相框覆盖层；无图显示「暂无图片」占位）
 * → 统计卡片 → 详细信息列表 → 查看详情按钮
 * 内容由 area prop（接口片区行数据）驱动；概况图片与片区范围/起止时间/功能定位
 * 取方案填报表单（loadSchemeFill 共享两跳加载 + auid 级缓存，与详情页同源——点开
 * 本面板即预热，进详情页不重复请求）；
 * 点击关闭按钮或地图空白处由父级收起。
 * 「查看详情」只 emit('detail')，跳转/切换由看板页负责（见 overview/index.tsx 的 openAreaDetail）。
 */
import { defineComponent, shallowRef, type PropType, watch } from 'vue';
import headerImg from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';
import pictureBoxImg from '@jeesite/assets/images/display/plan/picture-box.webp';
import arrowImg from '@jeesite/assets/images/display/plan/arrow.png';
import type { EspMapAreaRow } from '@jeesite/early-stage-planning/api/early-stage-planning/esp-map';
import type { EspSchemeFill } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
import { XOD_COLOR } from '@jeesite/display/components/corner-panel/xod-row';
import { dash, fmtAreaHa } from './area-format';
import { loadSchemeFill } from './area-info';

/** 功能定位胶囊兜底色（XOD_COLOR 未覆盖的编码，如 POD） */
const FUNC_PILL_FALLBACK = '#94a3b8';

/** 列表分隔线渐变 */
const DIVIDER_GRADIENT =
  'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, rgba(90, 244, 255, 0.15) 53.85%, rgba(255, 255, 255, 0.02) 100%)';

export const AreaOverviewModal = defineComponent({
  name: 'EarlyStagePlanningAreaOverviewModal',

  props: {
    /** 片区行数据（接口 areas 行，去掉 geometry 后的属性） */
    area: { type: Object as PropType<Omit<EspMapAreaRow, 'geometry'>>, required: true },
  },

  emits: {
    /** 关闭面板（关闭按钮点击；地图空白关闭由父级处理） */
    close: () => true,
    /** 查看详情：由看板页切换到片区详情页（本组件不关心怎么跳，只发事件） */
    detail: () => true,
  },

  setup(props, { emit }) {
    /** 当前片区概况图（null = 无图，相框内显示「暂无图片」占位） */
    const overviewImg = shallowRef<string | null>(null);

    /** 填报表单（概况图 + 片区范围/起止时间/功能定位共用；null = 未填报/加载失败） */
    const form = shallowRef<EspSchemeFill | null>(null);

    // 切换片区时拉取填报表单（共享缓存去重；失败/无数据 → null，各项显示 —）
    watch(
      () => props.area.A_UID,
      (auid) => {
        overviewImg.value = null;
        form.value = null;
        loadSchemeFill(auid, props.area.AREA_NAME ?? '')
          .then((f) => {
            if (props.area.A_UID !== auid) return;
            form.value = f;
            overviewImg.value = f?.overviewImages?.[0]?.url ?? null;
          })
          .catch(() => {});
      },
      { immediate: true },
    );

    return () => {
      const a = props.area;
      /** 顶部统计卡片（tag 表示以标签样式展示） */
      const statItems: { label: string; value: string; tag?: boolean }[] = [
        { label: '片区名称', value: dash(a.AREA_NAME) },
        { label: '片区规模', value: fmtAreaHa(a.AREA_HA) },
        { label: '更新情况', value: a.BATCH ?? '—', tag: true },
      ];

      /** 详细信息列表（所在区位取图斑数据；片区范围/起止时间/功能定位取填报表单，
          pills = 功能定位编码胶囊行，空数据显示 —；起止时间 = 起始 ~ 结束 拼一行） */
      const infoItems: { label: string; value?: string; pills?: string[] }[] = [
        { label: '所在区位', value: dash(a.DIST) },
        { label: '片区范围', value: dash(form.value?.scopeDesc) },
        {
          label: '起止时间',
          value: dash([form.value?.startTime, form.value?.endTime].filter((v) => v != null && v !== '').join(' ~ ')),
        },
        { label: '功能定位', pills: form.value?.funcTypes ?? [] },
      ];

      return (
        <div
          class="absolute right-12px top-12px z-20 w-320px max-h-[calc(100vh_-_200px)] rounded-xl px-12px py-16px shadow-2xl backdrop-blur-10 overflow-auto"
          style={{ background: 'linear-gradient(171deg, #0F172A -11.93%, #1A5072 99.26%)' }}
        >
          {/* 标题图 + 关闭按钮 */}
          <div class="relative">
            <div style={{ backgroundImage: `url(${headerImg})` }} class="h-42px w-296px bg-contain" />
            <div
              class="absolute right-0px top-4px size-20px cursor-pointer text-white/60 hover-text-white flex items-center justify-center"
              onClick={() => emit('close')}
            >
              <div class="i-ri-close-line size-18px" />
            </div>
          </div>

          {/* 相框：片区概况图片垫底（方案填报首图），无图居中显示「暂无图片」；相框覆盖层叠在图片上面 */}
          <div class="relative mt-20px h-184px w-full overflow-hidden">
            <div
              class="absolute inset-10px rd-24px bg-contain bg-center bg-no-repeat"
              style={overviewImg.value ? { backgroundImage: `url(${overviewImg.value})` } : undefined}
            >
              {!overviewImg.value && (
                <div class="absolute inset-0 flex items-center justify-center text-14px text-white/40">暂无图片</div>
              )}
            </div>
            <img src={pictureBoxImg} alt="相框" class="absolute inset-0 size-full object-contain" />
          </div>

          {/* 统计卡片（min-w-0 允许 flex 子项收缩，名称超长单行省略） */}
          <div class="mt-16px flex h-76px w-full b-1 b-solid b-white/6 bg-white/2 py-4px text-center font-500 rd-8px">
            {statItems.map((item) => (
              <div key={item.label} class="min-w-0 flex-1 py-8px">
                <div class="text-14px lh-20px text-white/75">{item.label}</div>
                {item.tag ? (
                  <div class="mt-8px inline-block b-1 b-solid b-[rgba(23,254,185,0.45)] rd-12px px-8px py-2px text-14px text-#17FEB9">
                    {item.value}
                  </div>
                ) : (
                  <div class="mt-8px text-16px lh-24px text-white truncate" title={item.value}>
                    {item.value}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 详细信息列表 */}
          <div class="mt-8px w-full b-1 b-solid b-white/6 bg-white/2 px-16px py-18px font-500 rd-8px">
            {infoItems.map((item, index) => (
              <div key={item.label}>
                <div class="flex items-center">
                  <img src={arrowImg} alt="" class="h-14px w-12px" />
                  <div class="ml-8px text-14px text-#53E2F6">{item.label}</div>
                </div>

                {/* 值区：功能定位 = 编码胶囊行（横排、不显示中文名），其余 = 文本 */}
                {item.pills ? (
                  <div class="mt-12px flex flex-wrap items-center gap-4px">
                    {item.pills.length ? (
                      item.pills.map((code) => (
                        <div
                          key={code}
                          class="font-chakra rd-4px h-16px px-6px flex items-center justify-center text-black text-14px font-500"
                          style={{ background: XOD_COLOR[String(code).toLowerCase()] ?? FUNC_PILL_FALLBACK }}
                        >
                          {String(code).toUpperCase()}
                        </div>
                      ))
                    ) : (
                      <span class="text-16px lh-24px">—</span>
                    )}
                  </div>
                ) : (
                  <div class="mt-12px flex items-center text-16px lh-24px text-white">{item.value}</div>
                )}

                {/* 分隔线：最后一项不显示 */}
                {index < infoItems.length - 1 && (
                  <div class="my-12px h-1px w-full" style={{ background: DIVIDER_GRADIENT }} />
                )}
              </div>
            ))}
          </div>

          {/* 查看详情按钮：切到片区详情页（大屏：左展示面板 + 右抽屉），由看板页处理 */}
          <div
            class="mt-20px flex h-44px b-1 b-solid b-[#0BD6FFBF] cursor-pointer items-center justify-center rd-full text-white transition-all duration-300 hover-bg-[#0BD6FF26]"
            onClick={() => emit('detail')}
          >
            查看详情
          </div>
        </div>
      );
    };
  },
});
