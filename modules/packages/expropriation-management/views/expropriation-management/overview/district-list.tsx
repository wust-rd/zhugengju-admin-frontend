import { ArtFont } from '@jeesite/display/components/art-font';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { CollapseGroups, type CollapseGroupItem } from '@jeesite/display/components/collapse-groups';
import { SearchFilter } from '@jeesite/display/components/search-filter';
import { defineComponent, ref } from 'vue';

import homeButton from '@jeesite/assets/images/expropriation-management/倾斜渐变按钮.webp';
import type { MenuItemType } from 'antdv-next';
import { DistrictRow, type DistrictRowItem } from './district-row';

/** 批次筛选下拉选项（占位，接入接口后替换） */
const BATCH_ITEMS: MenuItemType[] = [
  { key: 'all', label: '全部批次' },
  { key: 'batch1', label: '第一批' },
  { key: 'batch2', label: '第二批' },
];

/** 各区征收片区分组（占位数据，接入接口后替换；items 按名称排序后的展示顺序） */
const DISTRICT_GROUPS: CollapseGroupItem<DistrictRowItem>[] = [
  {
    title: '江岸区',
    badgeValue: '7片',
    items: [
      { label: '西马片', shiwu: true, yuzheng: true },
      { label: '黑泥湖片', wuzhongxin: true, wugai: true },
      { label: '江汉关征收片区', wugai: true },
      { label: '澳门金角启动片', shiwu: true, yuzheng: true },
      { label: '大智门火车站片', wuzhongxin: true, zhili: true },
      { label: '新兴街店', shiwu: true, wugai: true },
      { label: '合作路片', wuzhongxin: true },
    ],
  },
  {
    title: '江汉区',
    badgeValue: '3片',
    items: [
      { label: '循环片', shiwu: true },
      { label: '唐家墩片', wugai: true },
      { label: '杨子片', yuzheng: true },
    ],
  },
  {
    title: '硚口区',
    badgeValue: '3片',
    items: [
      { label: '汉正街片', wuzhongxin: true },
      { label: '六角亭片', shiwu: true },
      { label: '宗关片', wugai: true },
    ],
  },
  {
    title: '汉阳区',
    badgeValue: '3片',
    items: [
      { label: '钟家村片', wugai: true },
      { label: '归元寺片', shiwu: true, zhili: true },
      { label: '四新片', yuzheng: true },
    ],
  },
  {
    title: '武昌区',
    badgeValue: '5片',
    items: [
      { label: '昙华林片', wuzhongxin: true, wugai: true },
      { label: '农讲所片', shiwu: true },
      { label: '首义片', wugai: true, yuzheng: true },
      { label: '白沙洲片', zhili: true },
      { label: '杨园片', shiwu: true },
    ],
  },
  {
    title: '青山区',
    badgeValue: '5片',
    items: [
      { label: '红钢城片', wugai: true },
      { label: '工人村片', shiwu: true },
      { label: '钢花村片', wuzhongxin: true },
      { label: '白玉山片', yuzheng: true },
      { label: '武东片', wugai: true },
    ],
  },
];

/**
 * DistrictList —— 片区列表二级页（左侧面板）
 *
 * 由总览页「片区列表」按钮进入：GlowTitle2 头部（标题 + 主页按钮）、
 * 搜索筛选行（片区名称搜索框 + 批次下拉）、CollapseGroups 各区折叠分组
 * （区内征收片区行：圆点 + 名称 + 分类标签胶囊，点击行高亮）。
 *
 * props：
 * - onBack：点击「主页」返回上级页的回调
 */
export const DistrictList = defineComponent({
  name: 'DistrictList',

  props: {
    onBack: { type: Function, default: null },
  },

  setup(props) {
    /** 搜索框关键字（TODO: 接入接口后作为列表查询参数） */
    const keyword = ref('');
    /** 批次筛选选中项（v-model，null 表示未选/全部） */
    const batchKey = ref<string | number | null>(null);

    return () => (
      <>
        {/* 面板头部：标题 + 批次下拉 + 收起按钮 */}
        <GlowTitle2 class="w-full h-56px">
          <ArtFont class="ml-72px text-20px font-400 lh-30px">征收片区列表</ArtFont>

          {/* 主页按钮：倾斜渐变底图按钮 */}
          <div
            class="ml-auto py-4px mr-8px h-34px w-92px rd-6px text-14px font-400 text-white cursor-pointer transition-opacity hover:opacity-85 flex items-center justify-center"
            style={{
              backgroundImage: `url(${homeButton})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            onClick={() => props.onBack?.()}
          >
            <div class="i-mingcute:home-4-fill size-14px bg-white/75 mr-8px"></div>
            主页
          </div>
        </GlowTitle2>

        {/* 搜索筛选行：片区名称搜索框 + 批次下拉（SearchFilter 公共组件） */}
        <SearchFilter
          v-model:value={keyword.value}
          v-model:activeKey={batchKey.value}
          items={BATCH_ITEMS}
          placeholder="输入片区名称"
          class="mt-24px"
        />

        {/* 各区折叠分组：区内征收片区行（圆点 + 名称 + 标签胶囊，点击行高亮） */}
        <CollapseGroups groups={DISTRICT_GROUPS} isRound panelClass="rd-8px mt-12px">
          {{
            row: (item) => <DistrictRow item={item as DistrictRowItem} />,
          }}
        </CollapseGroups>
      </>
    );
  },
});
