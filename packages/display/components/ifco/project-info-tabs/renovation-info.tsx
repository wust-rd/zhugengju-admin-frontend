import { defineComponent, type PropType } from 'vue';
import { Steps } from 'antdv-next';
import type { StepsProps } from 'antdv-next';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';

/** 改造阶段 */
const STAGES: StepsProps['items'] = [
  { title: '准备阶段', status: 'finish' },
  { title: '实施阶段', status: 'process' },
  { title: '竣工阶段', status: 'wait' },
];

/* ============ 批复文件数据结构（对应图示分组） ============ */

/** 单个文件 */
export interface ApprovalFile {
  /** 文件名（含后缀），如「青石小区老旧小区改造项目方案确定稿.pdf」 */
  name: string;
  /** 文件地址（下载/预览用） */
  url: string;
  /** 是否高亮（图示里可行研究报告中被选中高亮的那项） */
  active?: boolean;
}

/** 文件分组 */
export interface ApprovalFileGroup {
  /** 分组标题，如「改造方案」「可行性研究报告」「审批文件」 */
  title: string;
  /** 该分组下的文件列表 */
  files: ApprovalFile[];
}

/** 「皮子街两厂改造项目」模块的文件分组（验收类） */
const FILE_GROUPS: ApprovalFileGroup[] = [
  {
    title: '预验收',
    files: [
      { name: '皮子街两厂改造项目竣工备案表.pdf', url: '' },
      { name: '皮子街两厂改造项目竣工报告.pdf', url: '' },
      { name: '皮子街两厂改造项目质量评估报告.pdf', url: '' },
    ],
  },
  {
    title: '正式验收',
    files: [
      { name: '皮子街两厂改造项目质量检查报告.pdf', url: '' },
      { name: '皮子街两厂改造项目竣工验收报告.pdf', url: '' },
      { name: '皮子街两厂改造项目验收意见书.pdf', url: '' },
      { name: '皮子街两厂改造项目竣工验收证书.pdf', url: '', active: true },
    ],
  },
];

/** 「产权办理」模块的文件分组 */
const OWNERSHIP_GROUPS: ApprovalFileGroup[] = [
  {
    title: '不动产权证书',
    files: [{ name: '皮子街两厂改造项目不动产权证书.pdf', url: '' }],
  },
];

/** 自定义图标：已完成=实心圆 / 进行中=环形进度弧 / 未开始=灰环 */
const stageIcon = (status?: string) => {
  if (status === 'finish') {
    return (
      <div
        class="size-24px rd-full bg-[#29B6F6] flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #2FB8FF 0%, #9EECD9 100%)',
        }}
      >
        <div class="size-18px rd-full bg-linear-to-b from-[#1B81D0] to-[#0FB8D7]" />
      </div>
    );
  }
  if (status === 'process') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="renov-process-grad" x1="0" y1="1" x2="1" y2="0">
            <stop stop-color="#7FF3FF" />
            <stop offset="0.6" stop-color="#29B6F6" />
            <stop offset="1" stop-color="#1476C0" />
          </linearGradient>
        </defs>
        {/* 底环 */}
        <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.1)" stroke-width="3" />
        {/* 渐变进度弧（约 80%，圆头，顶部起笔） */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="url(#renov-process-grad)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray={`${0.8 * 2 * Math.PI * 10} ${2 * Math.PI * 10}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
    );
  }
  return <div class="size-24px rd-full border-3px border-white/25" />;
};

/**
 * FileModule —— 一个「可折叠文件模块」
 *
 * 头部：圆形勾图标 + 模块标题 + 展开/收起箭头；主体：左侧渐变竖条 + 分组文件卡片列表。
 * 「皮子街两厂改造项目」与「产权办理」两个模块结构完全一致，所以抽出来复用，只传标题与分组数据。
 */
const FileModule = defineComponent({
  name: 'FileModule',
  props: {
    /** 模块标题（折叠头部） */
    title: { type: String, required: true },
    /** 该模块下的文件分组 */
    groups: { type: Array as PropType<ApprovalFileGroup[]>, required: true },
  },
  setup(props) {
    return () => (
      <CollapsibleSection
        defaultOpen
        class="mt-24px"
        v-slots={{
          header: ({ isOpen }) => (
            <div class="flex h-48px items-center pr-8px">
              {/* 图标：青色圆形勾 */}
              <div class="flex size-24px shrink-0 items-center justify-center rounded-full bg-white/6">
                <div class="i-ri:check-line size-16px text-[#34FFFF]" />
              </div>

              <div class="text-16px font-500 text-white/90 ml-12px">{props.title}</div>

              {/* 展开/收起圆形箭头按钮 */}
              <div
                class={cn(
                  'ml-auto flex size-24px items-center justify-center rounded-full border border-white/10 bg-white/10 transition-transform duration-200',
                  { '-rotate-90': !isOpen },
                )}
              >
                <div class="i-ri:arrow-down-s-line text-white" />
              </div>
            </div>
          ),
          body: () => (
            <div class="flex mt-12px">
              {/* 左侧条 */}
              <div class="h-full w-1px bg-linear-to-b from-[#34FFFF]/75 to-[#9EECD9]/0 shrink-0 mx-12px" />

              {/* 文件列表 */}
              <div class="w-362px mt-4px space-y-8px">
                {props.groups.map((group) => (
                  <div
                    class="group relative overflow-hidden rd-8px border border-white/6 bg-#0F172A/15 cursor-pointer"
                    id={group.title}
                  >
                    {/* hover 渐变背景层（左上→右下），默认隐藏 */}
                    <div
                      class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(3, 155, 245, 0.25) 0%, rgba(3, 155, 245, 0.00) 100%), linear-gradient(135deg, rgba(103, 219, 248, 0.25) 0%, rgba(12, 27, 35, 0.00) 100%)',
                        backgroundBlendMode: 'plus-lighter, normal, normal',
                      }}
                    />

                    {/* 内容（盖在渐变之上） */}
                    <div class="relative z-10 px-6px py-10px">
                      <div class="flex h-30px items-center">
                        <div class="text-14px font-500 text-white/90 ml-8px">{group.title}</div>

                        {/* 预览（眼睛）+ 下载（云）图标 */}
                        <div class="ml-auto flex items-center gap-8px">
                          <div class="i-ri:eye-line size-16px text-white/75 cursor-pointer" />

                          <div class="h-16px w-1px bg-white/15" />

                          <div class="i-ri-download-cloud-2-line size-16px text-white/75 cursor-pointer" />
                        </div>
                      </div>

                      {group.files.map((file) => (
                        <div
                          class="h-28px text-14px font-400 text-cyan-400 hover:text-[#61E5FF] px-8px py-4px truncate rd-4px b-1 b-solid b-transparent lh-20px hover:b-[#137AAE] hover:bg-linear-to-r from-[#1CD8F4]/25 to-[#029DEB]/25 hover:underline decoration-cyan-400 underline-offset-4"
                          key={file.name}
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        }}
      />
    );
  },
});

/** 项目改造情况内容 */
export const RenovationInfo = defineComponent({
  name: 'RenovationInfo',
  setup() {
    return () => (
      <div
        class="h-full max-h-900px p-12px rd-16px backdrop-blur-10px overflow-auto pt-32px scrollbar-none"
        style={{ background: 'linear-gradient(270deg, #0F172A 1.26%, rgba(37, 86, 126, 0.90) 99.65%)' }}
      >
        {/* 改造阶段步骤条（标题白色 + 自定义图标） */}
        <Steps
          current={1}
          percent={80}
          size="small"
          titlePlacement="vertical"
          items={STAGES}
          styles={{
            itemTitle: { color: '#ffffff' },
            itemIcon: { width: '26px', height: '26px', background: 'transparent' },
            itemRail: { background: '#2FB8FF' }, // 中间连接条改为红色
          }}
          v-slots={{
            // iconRender：按状态渲染自定义图标
            iconRender: ({ info }) => stageIcon(info.item?.status),
          }}
        />

        {/* 皮子街两厂改造项目：验收类文件 */}
        <FileModule title="皮子街两厂改造项目" groups={FILE_GROUPS} />

        {/* 产权办理：不动产权证书 */}
        <FileModule title="产证办理" groups={OWNERSHIP_GROUPS} />
      </div>
    );
  },
});
