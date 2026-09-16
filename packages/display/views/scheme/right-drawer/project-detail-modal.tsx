import { defineComponent, type CSSProperties } from 'vue';
import { useRouter } from 'vue-router';

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
  /** 建设内容 */
  content: string;
  /** 实施主体 */
  main: string;
  /** 投资估算（亿元） */
  invest: string;
  /** 资金来源 */
  fund: string;
  /** 开工时间 */
  start: string;
  /** 完工时间 */
  end: string;
};

const DETAIL_ROWS: DetailRow[] = [
  {
    id: '01',
    cat: '老旧街区改造',
    color: '#5B9DF0',
    name: '皮子街F地块',
    content:
      '新建居住、复合社会停车场、公园绿地项目（推广名：武汉城建南洋里），新建2栋高层住宅，4栋小高层住宅，以及配套底商',
    main: '汉水桥街道 市城建集团',
    invest: '14.07',
    fund: '产权单位出资、金融机构信贷资金',
    start: '2025.05',
    end: '2028.12',
  },
  {
    id: '02',
    cat: '老旧厂区改造',
    color: '#F5C443',
    name: '皮子街两厂改造项目',
    content: '对康成酒厂和南洋卷烟厂实施改造，并新增地下停车场。',
    main: '硚口城建集团',
    invest: '4.88',
    fund: '中央预算内投资约、专项债资金、金融机构信贷资金',
    start: '2025.07',
    end: '2026.12',
  },
  {
    id: '03',
    cat: '老旧小区改造',
    color: '#52D273',
    name: '燧华里、仁硚新村、房开小区老旧小区改造项目',
    content:
      '燧华里、仁硚新村、房开小区老旧小区改造项目，对房屋本体、弱电、排水、绿化、照明、道路等基础设施进行提升改造。',
    main: '硚口城建集团',
    invest: '0.24',
    fund: '中央财政补助、市级财政补助、专项债券',
    start: '2025.03',
    end: '2025.11',
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
    const router = useRouter();

    const close = () => emit('update:visible', false);

    /** 点击表格 → 关闭弹窗并跳转「项目实施」页面 */
    const goProject = () => {
      close();
      router.push('/display/project');
    };

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

              {/* 项目清单表格（点击整表 → 跳转「项目实施」页面 /display/project） */}
              <div class="mt-24px cursor-pointer overflow-y-auto scrollbar-none px-24px" onClick={goProject}>
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
                  <div class="w-104px pl-10px">五改类别</div>
                  <div class="w-140px pl-10px">项目名称</div>
                  <div class="w-240px pl-10px">建设内容</div>
                  <div class="w-120px pl-10px">实施主体</div>
                  <div class="w-100px pl-10px text-center">投资估算（亿元）</div>
                  <div class="min-w-0 flex-1 pl-16px">资金来源</div>
                  <div class="w-96px pl-10px">开工时间</div>
                  <div class="w-96px pl-10px">完工时间</div>
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
                      <div class="relative z-10 flex w-104px items-center gap-6px">
                        <span class="size-8px shrink-0 rd-full" style={{ backgroundColor: r.color }} />
                        <span class="text-13px text-white/80 lh-20px">{r.cat}</span>
                      </div>
                      <div class="relative z-10 w-140px pl-10px text-14px text-white lh-20px">{r.name}</div>
                      <div class="relative z-10 w-240px pl-10px text-13px text-white/80 lh-20px">{r.content}</div>
                      <div class="relative z-10 w-120px pl-10px text-13px text-white/70 lh-20px">{r.main}</div>
                      <div class="relative z-10 w-100px text-center text-14px text-white/80">{r.invest}</div>
                      <div class="relative z-10 min-w-0 flex-1 pl-16px pr-12px text-13px text-white/80 lh-20px">
                        {r.fund}
                      </div>
                      <div class="relative z-10 w-96px pl-10px text-13px text-white/70 lh-20px">{r.start}</div>
                      <div class="relative z-10 w-96px pl-10px text-13px text-white/70 lh-20px">{r.end}</div>
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
