import { defineComponent, type CSSProperties } from 'vue';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';
import glowImg from '@jeesite/assets/images/display/plan/光效.webp';

/** 磨砂卡片外壳（关闭按钮，与图册弹窗同款样式） */
const FROST_SHELL: CSSProperties = {
  border: '0.5px solid #57859E30',
  background: 'var(--alpha---ui-bg-6, rgba(255, 255, 255, 0.06))',
  boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
};

/** 项目详情表格行数据（皮子街片区项目清单） */
type DetailRow = {
  /** 序号 */
  id: string;
  /** 五改类别（左侧圆点取 color） */
  cat: string;
  color: string;
  /** 项目名称 */
  name: string;
  /** 实施主体 */
  main: string;
  /** 投资估算 */
  invest: string;
  /** 资金来源及落实情况 */
  fund: string;
  /** 开工时间 */
  start: string;
  /** 完工时间 */
  end: string;
  /** 片区责任主体 */
  resp: string;
};

const DETAIL_ROWS: DetailRow[] = [
  {
    id: '01',
    cat: '老旧街区改造',
    color: '#5B9DF0',
    name: '皮子街F地块',
    main: '汉水桥街道 市城建集团',
    invest: '14.07',
    fund: '企业资金、银行融资',
    start: '2025.05',
    end: '2028.12',
    resp: '汉水桥街道',
  },
  {
    id: '02',
    cat: '老旧厂区改造',
    color: '#F5C443',
    name: '皮子街两厂改造项目',
    main: '硚口城建集团',
    invest: '4.77',
    fund: '一期拟申报2026年中央预算内资金约6163万元，拟申报专项债资金约10000万元；拟争取湖北银行前期融资约3000万元；二期拟申报2026年中央预算内资金约6700万元，拟申报专项债资金约23000万元',
    start: '一期：2025.07；二期：计划2025.12',
    end: '一期：2026.06；二期：计划2026.12',
    resp: '汉水桥街道',
  },
  {
    id: '03',
    cat: '老旧小区改造',
    color: '#52D273',
    name: '燧华里、仁硚新村、房开小区老旧小区改造项目',
    main: '硚口城建集团',
    invest: '0.24',
    fund: '中央财政补助、市级财政补助、专项债',
    start: '2025.03',
    end: '2025.11',
    resp: '汉水桥街道',
  },
];

/**
 * 项目详情弹窗：与图册弹窗分开的独立组件（不复用）
 * 相框背景 + 标题 + 关闭按钮 + 项目清单表格（行 hover 用光效图做背景）
 */
export const ProjectDetailModal = defineComponent({
  // 输入约束
  props: {
    /** 是否显示（配合 onUpdate:visible 关闭） */
    visible: { type: Boolean, default: false },
    /** 弹窗标题 */
    title: { type: String, default: '片区项目清单' },
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

                {/* 关闭按钮 */}
                <div
                  class="ml-auto flex size-32px cursor-pointer items-center justify-center rd-8px transition-all duration-200 hover:brightness-125"
                  style={FROST_SHELL}
                  onClick={close}
                >
                  <div class="i-ri-close-line size-18px bg-linear-to-b from-[#40DFFF] to-[#FFFFFF]"></div>
                </div>
              </div>

              <div class="h-1px w-full bg-white/6" />

              {/* 项目清单表格 */}
              <div class="mt-24px overflow-y-auto scrollbar-none px-24px">
                {/* 表头（内阴影模拟光照：顶部内高光 + 底部内暗） */}
                <div
                  class="flex h-48px items-center rounded-6px text-13px text-white/85"
                  style={{
                    border: '1px solid #28DBFF60',
                    boxShadow: 'inset 0 0 10px 4px #28DBFF30',
                    background:
                      'linear-gradient(90deg, rgba(2, 64, 100, 0.10) 0%, rgba(2, 64, 100, 0.75) 38.77%, rgba(2, 64, 100, 0.75) 62.02%, rgba(2, 64, 100, 0.10) 100%)',
                  }}
                >
                  <div class="w-48px text-center">序号</div>
                  <div class="w-112px pl-10px">五改类别</div>
                  <div class="w-160px pl-10px">项目名称</div>
                  <div class="w-130px pl-10px">实施主体</div>
                  <div class="w-72px pl-10px">投资估算</div>
                  <div class="min-w-0 flex-1 pl-16px">资金来源及落实情况</div>
                  <div class="w-96px pl-10px">开工时间</div>
                  <div class="w-96px pl-10px">完工时间</div>
                  <div class="w-88px pl-10px">片区责任主体</div>
                </div>

                {/* 数据行 */}
                <div class="mt-6px flex flex-col gap-6px">
                  {DETAIL_ROWS.map((r) => (
                    <div
                      key={r.id}
                      class="group relative flex items-center rounded-6px border border-white/8 px-4px py-14px transition-all duration-200 cursor-pointer"
                    >
                      {/* hover 光效背景 */}
                      <img
                        src={glowImg}
                        alt=""
                        class="pointer-events-none absolute inset-0 size-full rounded-6px object-fill opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />

                      <div class="relative z-10 w-48px text-center text-14px text-white/50">{r.id}</div>
                      <div class="relative z-10 flex w-112px items-center gap-6px">
                        <span class="size-8px shrink-0 rd-full" style={{ backgroundColor: r.color }} />
                        <span class="text-13px text-white/80 lh-20px">{r.cat}</span>
                      </div>
                      <div class="relative z-10 w-160px pl-10px text-14px text-white lh-20px">{r.name}</div>
                      <div class="relative z-10 w-130px pl-10px text-13px text-white/70 lh-20px">{r.main}</div>
                      <div class="relative z-10 w-72px pl-10px text-14px text-white/80">{r.invest}</div>
                      <div class="relative z-10 min-w-0 flex-1 pl-16px pr-12px text-13px text-white/80 lh-20px">
                        {r.fund}
                      </div>
                      <div class="relative z-10 w-96px pl-10px text-13px text-white/70 lh-20px">{r.start}</div>
                      <div class="relative z-10 w-96px pl-10px text-13px text-white/70 lh-20px">{r.end}</div>
                      <div class="relative z-10 w-88px pl-10px text-13px text-white/70 lh-20px">{r.resp}</div>
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
