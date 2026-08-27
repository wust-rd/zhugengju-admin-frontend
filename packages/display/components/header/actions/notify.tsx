import { computed, defineComponent, ref } from 'vue';
import { Dropdown } from 'antdv-next';
import { cn } from '@jeesite/core/libs';
import { ActionButton } from './action-button';

interface NoticeItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

/** 初始通知（display 演示用；可替换为真实通知数据源） */
const initialNotices: NoticeItem[] = [
  {
    id: '1',
    title: '系统维护通知',
    desc: '本周六 00:00 - 06:00 系统升级维护，请提前保存工作。',
    time: '10 分钟前',
    read: false,
  },
  { id: '2', title: '数据更新完成', desc: '城市体检 / 前期规划 数据已同步至最新版本。', time: '1 小时前', read: false },
  { id: '3', title: '新建项目待确认', desc: '“徐家棚更新项目”等待管理员确认。', time: '昨天', read: true },
];

/**
 * Notify —— 通知按钮（display 风格 icon+文字 + 未读角标）
 *
 * 下拉展示通知列表，支持「全部已读」交互，未读数量实时反映到角标。
 */
export const Notify = defineComponent({
  name: 'DisplayNotify',
  setup() {
    const items = ref<NoticeItem[]>(initialNotices.map((i) => ({ ...i })));
    const unread = computed(() => items.value.filter((i) => !i.read).length);

    function markAllRead() {
      items.value.forEach((i) => (i.read = true));
    }
    function markRead(item: NoticeItem) {
      item.read = true;
    }

    const renderList = () => (
      <div class="w-380px bg-white px-4 py-3 shadow-lg rd-8px">
        <div class="flex items-center justify-between px-1 pb-2">
          <span class="text-14px font-600 text-gray-700">通知</span>
          <button type="button" class="text-12px text-cyan-600 hover:text-cyan-500" onClick={markAllRead}>
            全部已读
          </button>
        </div>
        {items.value.length === 0 ? (
          <div class="py-8 text-center text-13px text-gray-400">暂无通知</div>
        ) : (
          <ul class="max-h-300px overflow-auto space-y-1">
            {items.value.map((item) => (
              <li
                key={item.id}
                class={cn(
                  'cursor-pointer rounded-md p-2 transition-colors hover:bg-gray-50',
                  !item.read && 'bg-cyan-50',
                )}
                onClick={() => markRead(item)}
              >
                <div class="flex items-center gap-1.5">
                  <span class={cn('inline-block size-6px rounded-full', item.read ? 'bg-gray-300' : 'bg-red-500')} />
                  <span class={cn('text-13px', item.read ? 'text-gray-500' : 'text-gray-800 font-600')}>
                    {item.title}
                  </span>
                </div>
                <div class="mt-1 pl-2 text-12px text-gray-500">{item.desc}</div>
                <div class="mt-1 pl-2 text-11px text-gray-400">{item.time}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );

    return () => (
      <Dropdown trigger={['click']} placement="bottomRight">
        {{
          default: () => <ActionButton iconOnly icon="i-ri-notification-3-line" badge={unread.value} title="通知" />,
          popupRender: () => renderList(),
        }}
      </Dropdown>
    );
  },
});
