import { defineComponent, type CSSProperties } from 'vue';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';
import glowImg from '@jeesite/assets/images/display/plan/光效.webp';

/** 磨砂卡片外壳（标题栏按钮，与图册弹窗同款样式） */
const FROST_SHELL: CSSProperties = {
  border: '0.5px solid #57859E30',
  background: 'var(--alpha---ui-bg-6, rgba(255, 255, 255, 0.06))',
  boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
};

/** 资金情况表格行数据 */
const FUND_ROWS = [
  {
    id: '01',
    name: '青石小区改造项目',
    cat: '既有建筑',
    color: '#5B9DF0',
    budget: '0.58亿元',
    invested: '0.58亿元',
    ratio: 40.9,
    source: '中央预算、中央奖补资金',
  },
  {
    id: '02',
    name: '共勉小区项目',
    cat: '老旧小区',
    color: '#52D273',
    budget: '0.18亿元',
    invested: '0.18亿元',
    ratio: 40.9,
    source: '中央预算、中央奖补资金',
  },
  {
    id: '03',
    name: '朗星巷小区项目',
    cat: '老旧小区',
    color: '#52D273',
    budget: '0.21亿元',
    invested: '0.21亿元',
    ratio: 40.9,
    source: '中央预算、中央奖补资金',
  },
  {
    id: '04',
    name: '南城社区项目',
    cat: '老旧小区',
    color: '#52D273',
    budget: '0.08亿元',
    invested: '0.08亿元',
    ratio: 40.9,
    source: '中央预算、中央奖补资金',
  },
  {
    id: '05',
    name: '共勉牌坊保护及产业运营项目',
    cat: '老旧小区',
    color: '#52D273',
    budget: '0.01亿元',
    invested: '0.01亿元',
    ratio: 40.9,
    source: '企业自有资金及中央预算资金',
  },
];

/**
 * 资金情况详情弹窗：与项目清单弹窗分开的独立组件
 * 相框背景 + 标题（下载/关闭）+ 资金情况表格（行 hover 用光效图做背景）
 */
export const FundDetailModal = defineComponent({
  // 输入约束
  props: {
    /** 是否显示（配合 onUpdate:visible 关闭） */
    visible: { type: Boolean, default: false },
    /** 弹窗标题 */
    title: { type: String, default: '片区资金情况' },
  },
  // 输出约束
  emits: {
    /** 请求关闭（点击遮罩 / 关闭按钮时触发） */
    'update:visible': (_: boolean) => true,
  },
  setup(props, { emit }) {
    const close = () => emit('update:visible', false);

    return () => {
      if (!props.visible) return null;

      return (
        <div class="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
          {/* 遮罩：点击关闭 */}
          <div class="absolute inset-0 bg-black/10 backdrop-blur-sm" />

          {/* 弹窗主体：相框背景 + 内容层 */}
          <div class="relative z-10 w-1200px max-h-640px pb-42px" onClick={(e) => e.stopPropagation()}>
            {/* 相框背景 */}
            <img src={frameImg} alt="" class="pointer-events-none absolute inset-0 size-full object-fill" />

            {/* 内容层（盖在相框之上） */}
            <div class="relative z-10 size-full">
              {/* 标题 */}
              <div class="flex h-68px items-center px-32px pt-24px pb-12px">
                <div
                  class="text-20px font-700 text-white"
                  style={{
                    background: 'linear-gradient(180deg, #FFF 20.83%, #8AC9FF 83.33%)',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {props.title}
                </div>

                {/* 下载按钮 */}
                <div
                  class="ml-auto flex size-32px cursor-pointer items-center justify-center rd-8px transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                >
                  <div class="i-ri:download-line size-18px bg-linear-to-b from-[#40DFFF] to-[#FFFFFF]"></div>
                </div>

                {/* 关闭按钮 */}
                <div
                  class="ml-12px flex size-32px cursor-pointer items-center justify-center rd-8px transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={close}
                >
                  <div class="i-ri-close-line size-18px bg-linear-to-b from-[#40DFFF] to-[#FFFFFF]"></div>
                </div>
              </div>

              <div class="h-1px w-full bg-white/6" />

              {/* 资金情况表格 */}
              <div class="mt-24px overflow-y-auto px-24px">
                {/* 表头（内阴影模拟光照） */}
                <div
                  class="flex h-48px items-center rounded-6px text-13px text-white/85"
                  style={{
                    border: '1px solid #28DBFF60',
                    boxShadow: 'inset 0 0 10px 4px #28DBFF30',
                    background:
                      'linear-gradient(90deg, rgba(2, 64, 100, 0.10) 0%, rgba(2, 64, 100, 0.75) 38.77%, rgba(2, 64, 100, 0.75) 62.02%, rgba(2, 64, 100, 0.10) 100%)',
                  }}
                >
                  <div class="w-56px text-center">编号</div>
                  <div class="w-250px pl-16px">项目名称</div>
                  <div class="w-120px pl-10px">五改类别</div>
                  <div class="w-90px">投资预算</div>
                  <div class="w-90px">已投资</div>
                  <div class="flex-1 pl-16px">完成比例</div>
                  <div class="w-300px pl-16px">资金来源</div>
                </div>

                {/* 数据行 */}
                <div class="mt-6px flex flex-col gap-6px">
                  {FUND_ROWS.map((r) => (
                    <div
                      key={r.id}
                      class="group relative flex items-center rounded-6px border border-white/8 px-4px py-14px transition-all duration-200"
                    >
                      {/* hover 光效背景 */}
                      <img
                        src={glowImg}
                        alt=""
                        class="pointer-events-none absolute inset-0 size-full rounded-6px object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />

                      <div class="relative z-10 w-56px text-center text-14px text-white/50">{r.id}</div>
                      <div class="relative z-10 w-250px pl-16px text-14px text-white">{r.name}</div>
                      <div class="relative z-10 flex w-120px items-center gap-6px">
                        <span class="size-8px rd-full" style={{ backgroundColor: r.color }} />
                        <span class="text-14px text-white/80">{r.cat}</span>
                      </div>
                      <div class="relative z-10 w-90px text-14px text-white/75">{r.budget}</div>
                      <div class="relative z-10 w-90px text-14px text-white/75">{r.invested}</div>

                      {/* 完成比例：进度条（渐变发光 + 白色圆形滑块） */}
                      <div class="relative z-10 flex flex-1 items-center gap-8px pl-16px">
                        <div class="relative h-5px w-88px rd-full bg-white/10">
                          {/* 填充：青→蓝渐变发光 */}
                          <div
                            class="absolute left-0 top-0 h-full rd-full"
                            style={{
                              width: `${r.ratio}%`,
                              background: 'linear-gradient(90deg, #25D3C4 0%, #47D9EC 100%)',
                              boxShadow: '0 0 8px rgba(80, 218, 230, 0.6)',
                            }}
                          />
                          {/* 白色圆形滑块（发光晕） */}
                          <div
                            class="absolute top-1/2 size-12px -translate-x-1/2 -translate-y-1/2 rd-full bg-white"
                            style={{
                              left: `${r.ratio}%`,
                              boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.18), 0 0 14px rgba(120, 230, 255, 0.9)',
                            }}
                          />
                        </div>
                        <div class="text-13px text-white/85">{r.ratio}%</div>
                      </div>

                      <div class="relative z-10 w-300px pl-16px text-14px text-white/80">{r.source}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
  },
});
