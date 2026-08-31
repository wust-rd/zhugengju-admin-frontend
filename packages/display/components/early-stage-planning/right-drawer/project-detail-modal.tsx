import { defineComponent, type CSSProperties } from 'vue';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';
import glowImg from '@jeesite/assets/images/display/plan/光效.webp';

/** 磨砂卡片外壳（关闭按钮，与图册弹窗同款样式） */
const FROST_SHELL: CSSProperties = {
  border: '0.5px solid #57859E30',
  background: 'var(--alpha---ui-bg-6, rgba(255, 255, 255, 0.06))',
  boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
};

/** 项目详情表格行数据 */
const DETAIL_ROWS = [
  { id: '01', name: '老万成副食店', cat: '既有建筑', color: '#5B9DF0', main: '-', content: '建筑修缮，产业导入。' },
  {
    id: '02',
    name: '长江书店遗址',
    cat: '既有建筑',
    color: '#5B9DF0',
    main: '-',
    content: '建筑修缮，产业导入。',
  },
  {
    id: '03',
    name: '任东新村',
    cat: '老旧小区',
    color: '#52D273',
    main: '-',
    content: '包括基础设施、道路通行、消防安防、建筑修缮、环境监控改造以及公共服务提升。',
  },
  {
    id: '04',
    name: '绍兴片城市更新项目',
    cat: '老旧街区',
    color: '#F5C443',
    main: '-',
    content:
      '北区总规划建筑面积64638.1平方米。其中，计容面积50138.58平方米，不计容建筑面积14499.52平方米。南区总规划建筑面积95982.77平方米，其中计容面积69031.42平方米，不计容建筑面积26951.35平方米',
  },
  {
    id: '05',
    name: '楚宝片改造项目',
    cat: '老旧街区',
    color: '#F5C443',
    main: '城建集团',
    content:
      '1栋4层商业4.21万平方米。商业地块将与华润合作，建设商业服务业及相关配套设施，打造4万余平方米的开放式、传承历史特色的商业街区。片区住宅开发。',
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
                  <div class="w-56px text-center">编号</div>
                  <div class="w-232px pl-16px">项目名称</div>
                  <div class="w-108px pl-10px">五改类别</div>
                  <div class="w-90px">实施主体</div>
                  <div class="flex-1 pl-16px">建设内容</div>
                  <div class="w-104px text-center">实施方案</div>
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

                      <div class="relative z-10 w-56px text-center text-14px text-white/50">{r.id}</div>
                      <div class="relative z-10 w-232px pl-16px text-14px text-white">{r.name}</div>
                      <div class="relative z-10 flex w-108px items-center gap-6px">
                        <span class="size-8px rd-full" style={{ backgroundColor: r.color }} />
                        <span class="text-14px text-white/80">{r.cat}</span>
                      </div>
                      <div class="relative z-10 w-90px text-14px text-white/55">{r.main}</div>
                      <div class="relative z-10 flex-1 pl-16px pr-12px text-13px text-white/80 lh-20px">
                        {r.content}
                      </div>

                      {/* 查看按钮 */}
                      <div class="relative z-10 flex w-104px justify-center">
                        <div
                          class="flex h-26px w-64px cursor-pointer items-center justify-center gap-4px rd-6px text-12px text-[#7FC0FF] transition-all duration-200 hover:brightness-125"
                          style={{
                            border: '0.5px solid rgba(95, 156, 240, 0.45)',
                            background: 'rgba(95, 156, 240, 0.15)',
                          }}
                        >
                          <div class="i-ri:file-list-2-line size-14px"></div>
                          查看
                        </div>
                      </div>
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
