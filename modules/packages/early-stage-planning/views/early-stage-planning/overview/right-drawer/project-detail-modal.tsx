import { computed, defineComponent, type CSSProperties, type PropType } from 'vue';
import { useMessage } from '@jeesite/core/hooks/web/useMessage';

import frameImg from '@jeesite/assets/images/display/plan/相框.webp';
import glowImg from '@jeesite/assets/images/display/plan/光效.webp';
import { dash } from '../area-format';
import type { EspSchemeProject } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

/** 磨砂卡片外壳（关闭按钮，与图册弹窗同款样式） */
const FROST_SHELL: CSSProperties = {
  border: '0.5px solid #57859E30',
  background: 'var(--alpha---ui-bg-6, rgba(255, 255, 255, 0.06))',
  boxShadow: '4.364px 4.364px 8.727px 0 rgba(0, 0, 0, 0.16)',
};

/** 改造类别配色（填报五类；项目清单圆点与本详情表共用，未知类别兜底灰） */
const PROJECT_CATEGORY_COLOR: Record<string, string> = {
  既有建筑改造: '#5B9DF0',
  老旧小区改造: '#52D273',
  老旧街区改造: '#F5C443',
  老旧厂区改造: '#F97316',
  城中村改造: '#A78BFA',
};

/** 类别 → 圆点色（未知类别兜底灰） */
export function categoryColorOf(category?: string): string {
  return PROJECT_CATEGORY_COLOR[category ?? ''] ?? '#94a3b8';
}

/** 表格列宽（列宽按 1360px 弹窗排布、表头不换行核定；flex-1 列吸收余量） */
const COL_CLASS = {
  序号: 'w-52px shrink-0 text-center',
  五改类别: 'w-120px shrink-0 pl-10px',
  项目名称: 'w-170px shrink-0 pl-12px',
  主要建设内容: 'min-w-0 flex-1 pl-12px pr-12px',
  实施主体: 'w-100px shrink-0',
  投资估算: 'w-148px shrink-0 text-center',
  资金来源: 'w-140px shrink-0',
  开工时间: 'w-96px shrink-0 text-center',
  竣工时间: 'w-96px shrink-0 text-center',
  实施方案: 'w-92px shrink-0 justify-center',
} as const;

/**
 * 项目详情弹窗：片区项目清单全字段表格（填报 projects 数据）
 * 相框背景 + 标题 + 关闭按钮 + 十列表格（行 hover 用光效图做背景）；
 * 最后一列「实施方案」查看按钮：planFiles 直链新窗打开（未上传 message 提示）
 */
export const ProjectDetailModal = defineComponent({
  // 输入约束
  props: {
    /** 是否显示（配合 onUpdate:visible 关闭） */
    visible: { type: Boolean, default: false },
    /** 弹窗标题 */
    title: { type: String, default: '片区项目清单' },
    /** 项目行（填报表单 projects 全字段） */
    projects: { type: Array as PropType<EspSchemeProject[]>, default: () => [] },
  },
  // 输出约束
  emits: {
    /** 请求关闭（点击遮罩 / 关闭按钮时触发） */
    'update:visible': (_: boolean) => true,
  },
  setup(props, { emit }) {
    const close = () => emit('update:visible', false);
    const { showMessage } = useMessage();

    /** 资金来源（字符串数组分号拼接展示） */
    const fundSourcesOf = (p: EspSchemeProject) => p.fundSources?.join('、') || '—';

    /** 实施方案查看：填报 planFiles（≤1 个）取直链新窗打开（pdf/word 外链预览、图片同理），
        未上传提示（同填报页「有直链的文件点击新窗打开」的口径） */
    function openPlanFile(p: EspSchemeProject) {
      const file = p.planFiles?.[0];
      if (!file?.url) {
        showMessage('该项目暂无实施方案文件', 'warning');
        return;
      }
      window.open(file.url, '_blank', 'noopener');
    }

    return () => {
      if (!props.visible) return null;

      return (
        <div class="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
          {/* 遮罩：点击关闭 */}
          <div class="absolute inset-0 bg-black/10 backdrop-blur-sm" />

          {/* 弹窗主体：相框背景 + 内容层 */}
          <div class="relative z-10 w-1360px max-h-680px pb-42px" onClick={(e) => e.stopPropagation()}>
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
                  <div class="whitespace-nowrap w-52px shrink-0 text-center">序号</div>
                  <div class="whitespace-nowrap w-120px shrink-0 pl-10px">五改类别</div>
                  <div class="whitespace-nowrap w-170px shrink-0 pl-12px">项目名称</div>
                  <div class="whitespace-nowrap min-w-0 flex-1 pl-12px pr-12px">主要建设内容</div>
                  <div class="whitespace-nowrap w-100px shrink-0">实施主体</div>
                  <div class="whitespace-nowrap w-148px shrink-0 text-center">项目投资估算（亿元）</div>
                  <div class="whitespace-nowrap w-140px shrink-0">项目资金来源</div>
                  <div class="whitespace-nowrap w-96px shrink-0 text-center">计划开工时间</div>
                  <div class="whitespace-nowrap w-96px shrink-0 text-center">计划竣工时间</div>
                  <div class="whitespace-nowrap w-92px shrink-0 text-center">实施方案</div>
                </div>

                {/* 数据行 */}
                <div class="mt-6px flex flex-col gap-6px">
                  {props.projects.map((p, i) => (
                    <div
                      key={p.id ?? p.pUid ?? i}
                      class="group relative flex items-center rounded-6px border border-white/8 px-4px py-14px transition-all duration-200 cursor-pointer"
                    >
                      {/* hover 光效背景 */}
                      <img
                        src={glowImg}
                        alt=""
                        class="pointer-events-none absolute inset-0 size-full rounded-6px object-fill opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />

                      <div class={`relative z-10 text-14px text-white/50 ${COL_CLASS.序号}`}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div class={`relative z-10 flex items-center gap-6px ${COL_CLASS.五改类别}`}>
                        <span
                          class="size-8px rd-full shrink-0"
                          style={{ backgroundColor: categoryColorOf(p.category) }}
                        />
                        <span class="truncate text-14px text-white/80" title={p.category ?? ''}>
                          {dash(p.category)}
                        </span>
                      </div>
                      <div
                        class={`relative z-10 truncate text-14px text-white ${COL_CLASS.项目名称}`}
                        title={p.name ?? ''}
                      >
                        {dash(p.name)}
                      </div>
                      <div class={`relative z-10 text-13px text-white/80 lh-20px ${COL_CLASS.主要建设内容}`}>
                        {p.content?.trim() || '—'}
                      </div>
                      <div
                        class={`relative z-10 truncate text-14px text-white/55 ${COL_CLASS.实施主体}`}
                        title={p.implOrg ?? ''}
                      >
                        {dash(p.implOrg)}
                      </div>
                      <div class={`relative z-10 text-14px text-white/80 ${COL_CLASS.投资估算}`}>
                        {p.investEstimate != null ? p.investEstimate : '—'}
                      </div>
                      <div
                        class={`relative z-10 truncate text-13px text-white/80 ${COL_CLASS.资金来源}`}
                        title={fundSourcesOf(p)}
                      >
                        {fundSourcesOf(p)}
                      </div>
                      <div class={`relative z-10 text-14px text-white/70 ${COL_CLASS.开工时间}`}>
                        {dash(p.startDate)}
                      </div>
                      <div class={`relative z-10 text-14px text-white/70 ${COL_CLASS.竣工时间}`}>{dash(p.endDate)}</div>

                      {/* 实施方案查看按钮：文件直链新窗打开，未上传提示 */}
                      <div class={`relative z-10 flex ${COL_CLASS.实施方案}`}>
                        <div
                          class="flex h-26px w-64px cursor-pointer items-center justify-center gap-4px rd-6px text-14px text-[#7FC0FF] transition-all duration-200 hover:brightness-125"
                          style={{
                            border: '0.5px solid rgba(95, 156, 240, 0.45)',
                            background: 'rgba(95, 156, 240, 0.15)',
                          }}
                          onClick={() => openPlanFile(p)}
                        >
                          <div class="i-ri:file-list-2-line size-14px"></div>
                          查看
                        </div>
                      </div>
                    </div>
                  ))}

                  {props.projects.length === 0 && (
                    <div class="py-32px text-center text-14px text-white/40">暂无数据</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
  },
});
