import { defineComponent, ref } from 'vue';
import type { MenuItemType } from 'antdv-next';
import chartSvg from '@jeesite/assets/svg/display/chart.svg';
import { buildYearItems } from '@jeesite/core/libs';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlowButton } from '@jeesite/display/components/glow-button';

export default defineComponent({
  name: 'DisplayInspection',
  setup() {
    // 指标分类下拉菜单项
    const items: MenuItemType[] = [
      {
        key: '1',
        label: '一好基础指标',
      },
      {
        key: '2',
        label: '二好基础指标',
      },
      {
        key: '3',
        label: '三好基础指标',
      },
      {
        key: '4',
        label: '四好基础指标',
      },
    ];

    // 年份下拉：最近 N 年（当前改为最近两年，变更年数只改 buildYearItems 参数）
    const yearItems = buildYearItems(2);

    // 受控选中项：指标分类默认选中「四好基础指标」，年份默认选中最近一年（当前年）
    const indicatorKey = ref<string | number>('4');
    const yearKey = ref<string | number>(yearItems[0]?.key ?? '');

    return () => (
      <>
        <img
          src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/首页/首页drawer.webp"
          alt=""
          class="h-full object-fill"
        />

        <div class="blue-bg pl-12px pt-24px pr-20px w-460px h-full">
          <div class="flex items-center w-full">
            <DropdownSelector v-model:activeKey={indicatorKey.value} icon={chartSvg} items={items} />

            <DropdownSelector v-model:activeKey={yearKey.value} width="w-120px" items={yearItems} class="ml-auto" />
          </div>

          <div class="mt-16px rd-12px p-6px w-full h-54px b b-gray-500 bg-black/6">
            <GlowButton class="px-12px w-102px h-42px rd-12px">
              <div class="i-ri-map-2-line text-white size-20px"></div>
              <div class="ml-6px text-14px text-white font-500">城区</div>
            </GlowButton>
          </div>
        </div>

        {/* <img
          src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/首页/底图.webp"
          alt=""
          class="flex-1 h-full object-fill"
        /> */}
      </>
    );
  },
});
