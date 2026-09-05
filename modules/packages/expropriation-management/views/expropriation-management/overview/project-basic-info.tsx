import { defineComponent } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import pictureBoxImg from '@jeesite/assets/images/display/plan/picture-box.webp';

/** 项目实景图（占位，接入接口后替换为片区实景） */
const PROJECT_PHOTO =
  'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E9%87%91%E5%AD%97%E5%A1%94.webp';

/** 项目基本信息：标签 + 取值（两列网格） */
const INFO_ITEMS = [
  { label: '项目名称', value: '江汉关征收片区项目' },
  { label: '所属片区', value: '魅力江汉关片' },
  { label: '土地面积', value: '1924亩' },
  { label: '项目编号', value: 'PQ001' },
  { label: '项目总成本', value: '192亿元' },
  { label: '2026资金需求', value: '169亿元' },
];

/** 建筑面积小节（青色数值为关键指标） */
const BUILDING_ITEMS = [
  { label: '总建筑面积', value: '192万方', highlight: true },
  { label: '剩余建筑面积', value: '168万方', highlight: false },
  { label: '2026年任务规模', value: '152万方', highlight: false },
];

/** 项目属性标签（配色对齐片区列表页 DistrictRow 胶囊） */
const PROPERTY_TAGS = [
  { text: '五个中心', color: '#E8E34A' },
  { text: '五改四好', color: '#35D0E8' },
];

/**
 * ExpropriationBasicInfo —— 征收项目基本信息（Tab 一）
 *
 * 顶部项目实景大图（青色描边圆角相框）→ 基本信息 2×3 网格 →
 * 「建筑面积」白竖条小节（关键指标青色高亮）→「项目属性」标签胶囊 →
 * 底部「查看该征收片区数字档案」渐变胶囊按钮。
 * 数据静态占位，接入接口后按选中地块替换。
 */
export const ExpropriationBasicInfo = defineComponent({
  name: 'ExpropriationBasicInfo',

  setup() {
    /** 折叠小节标题（白竖条 + 文字，与 ifco BasicInfo 同款头部） */
    const sectionHeader = (title: string) => (
      <div class="flex h-36px items-center px-8px">
        <div
          class="h-16px w-3px shrink-0 rd-full bg-white"
          style={{
            boxShadow:
              '0 0 32px 0 rgba(255, 255, 255, 0.30), 0 0 24px 0 #FFF, 1px 0 12px 0 rgba(255, 255, 255, 0.30), 2px 0 8px 0 rgba(255, 255, 255, 0.60)',
          }}
        />
        <div class="ml-12px text-14px font-500 text-white">{title}</div>
      </div>
    );

    return () => (
      <div
        class="p-12px rd-16px backdrop-blur-10px max-h-[calc(100vh-300px)] overflow-auto scrollbar-none"
        style={{ background: 'linear-gradient(270deg, #0F172A 1.26%, rgba(37, 86, 126, 0.90) 99.65%)' }}
      >
        {/* 项目实景图：picture-box 相框图叠加在照片上层（与 area-overview-modal 同款手法） */}
        <div class="relative h-184px w-full">
          <div
            class="absolute inset-x-16px inset-y-12px rd-28px overflow-hidden"
            style={{ backgroundImage: `url(${PROJECT_PHOTO})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <img src={pictureBoxImg} alt="" class="absolute inset-0 size-full object-fill pointer-events-none" />
        </div>

        {/* 基本信息 2×3 网格 */}
        <div class="grid grid-cols-2 gap-x-32px gap-y-18px p-8px pt-16px">
          {INFO_ITEMS.map((item) => (
            <div key={item.label}>
              <div class="text-14px text-white/40">{item.label}</div>
              <div class="mt-6px text-14px text-white">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 建筑面积小节 */}
        <CollapsibleSection
          class="mt-16px"
          defaultOpen
          v-slots={{
            header: () => sectionHeader('建筑面积'),
            body: () => (
              <div class="space-y-10px px-8px py-6px">
                {BUILDING_ITEMS.map((item) => (
                  <div key={item.label} class="flex items-center justify-between">
                    <div class="text-14px text-white/75 flex-1">{item.label}</div>

                    <div
                      class={cn('text-15px font-500 flex-1', item.highlight ? 'text-[#00E5FF]' : 'text-white')}
                      style={item.highlight ? { textShadow: '0 0 8px rgba(0, 229, 255, 0.5)' } : undefined}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ),
          }}
        />

        {/* 项目属性小节：标签胶囊 */}
        <CollapsibleSection
          class="mt-16px"
          defaultOpen
          v-slots={{
            header: () => sectionHeader('项目属性'),
            body: () => (
              <div class="flex flex-wrap gap-10px px-8px py-6px">
                {PROPERTY_TAGS.map((tag) => (
                  <div
                    key={tag.text}
                    class="rd-full border px-14px py-3px text-13px"
                    style={{ borderColor: `${tag.color}88`, color: tag.color, background: `${tag.color}1A` }}
                  >
                    {tag.text}
                  </div>
                ))}
              </div>
            ),
          }}
        />

        {/* 底部按钮：查看数字档案（青色渐变胶囊） */}
        <div
          class="mt-26px h-44px w-full cursor-pointer rd-full flex items-center justify-center text-15px font-500 text-white transition-opacity hover:opacity-85"
          style={{
            background: 'linear-gradient(90deg, rgba(14, 131, 189, 0.35) 0%, rgba(14, 165, 233, 0.75) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.55)',
          }}
        >
          查看该征收片区数字档案
        </div>
      </div>
    );
  },
});
