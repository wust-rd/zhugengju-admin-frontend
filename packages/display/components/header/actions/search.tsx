import { computed, defineComponent, nextTick, onUnmounted, ref, shallowRef, watch, Teleport, Transition } from 'vue';
import { Input } from 'antdv-next';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { useI18n } from '@jeesite/core/hooks/web/useI18n';
import { getMenus } from '@jeesite/core/router/menus';
import type { Menu } from '@jeesite/core/router/types';
import { cn } from '@jeesite/core/libs';
import { CornerDownLeft, FileText, Search as SearchIcon } from 'lucide-vue-next';
import { ActionButton } from './action-button';

interface SearchEntry {
  /** 展示名（带父级前缀「父级 > 子级」） */
  name: string;
  /** 自身名（参与匹配，与原版一致：父级名不参与叶子命中） */
  own: string;
  path: string;
  icon?: string;
}

/** 转义正则特殊字符（同 useMenuSearch） */
function transform(c: string) {
  const code: string[] = ['$', '(', ')', '*', '+', '.', '[', ']', '?', '\\', '^', '{', '}', '|'];
  return code.includes(c) ? `\\${c}` : c;
}

/** 逐字符模糊正则（同 useMenuSearch.createSearchReg）：'ab' 等价于 .*.a.*b.* 模式 */
function createSearchReg(key: string) {
  const keys = [...key].map((item) => transform(item));
  const str = ['', ...keys, ''].join('.*');
  return new RegExp(str);
}

/**
 * Search —— 菜单搜索（对标 core 的 AppSearchModal.vue）
 *
 * 交互与原版一致：
 * - 打开后只有搜索框，**路由必须输入关键词后才出现**，空关键词/无命中显示「暂无数据」；
 * - 数据源为后端菜单 getMenus()（同 menu/index.vue），只命中叶子菜单，展示「父级 > 子级」；
 * - ↑↓ 切换、Enter 跳转、Esc 关闭、点击遮罩/取消关闭；逐字符模糊匹配，200ms 防抖。
 */
export const Search = defineComponent({
  name: 'DisplaySearch',
  setup() {
    const go = useGo();
    const { t } = useI18n();

    const open = ref(false);
    const keyword = ref('');
    const searchResult = ref<SearchEntry[]>([]);
    const activeIndex = ref(0);
    const inputRef = shallowRef<{ focus: () => void } | null>(null);
    const listRef = ref<HTMLElement | null>(null);

    /** 扁平化的叶子菜单索引（仅叶子 / hideChildrenInMenu 节点可被命中） */
    const entries = ref<SearchEntry[]>([]);

    (async () => {
      try {
        const list = await getMenus();
        const flatten = (items: Menu[], parent?: Menu) => {
          items.forEach((item) => {
            if (item.hideMenu) return;
            const own = t(item.name);
            const isLeaf = item.meta?.hideChildrenInMenu || !item.children?.length;
            if (isLeaf) {
              entries.value.push({
                name: parent ? `${t(parent.name)} > ${own}` : own,
                own,
                path: item.path,
                icon: item.icon,
              });
            } else {
              flatten(item.children!, item);
            }
          });
        };
        flatten(list);
      } catch {
        entries.value = [];
      }
    })();

    const hasData = computed(() => !!keyword.value && searchResult.value.length > 0);

    // 滚动锁：zoom-fade 离场会 scale(1.06)，全屏遮罩溢出视口会闪现滚动条导致布局抖动；
    // 后台靠全局 html{overflow:hidden} 掩盖，这里在打开时锁 body 滚动、离场动画结束后再恢复。
    let prevBodyOverflow = '';
    watch(open, (o) => {
      if (o) {
        prevBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    });
    function afterLeave() {
      document.body.style.overflow = prevBodyOverflow;
    }
    onUnmounted(() => {
      document.body.style.overflow = prevBodyOverflow;
    });

    // 纯 opacity 过渡（禁用 CSS 类钩子）：不用带 scale 的 zoom-fade，
    // 避免全屏遮罩缩放溢出视口产生滚动条
    function onEnter(el: Element, done: () => void) {
      const h = el as HTMLElement;
      h.style.opacity = '0';
      requestAnimationFrame(() => {
        h.style.transition = 'opacity 0.18s ease-out';
        h.style.opacity = '1';
        window.setTimeout(done, 200);
      });
    }
    function onLeave(el: Element, done: () => void) {
      const h = el as HTMLElement;
      h.style.transition = 'opacity 0.15s ease-out';
      h.style.opacity = '0';
      window.setTimeout(done, 160);
    }

    watch(open, (o) => {
      if (o) nextTick(() => inputRef.value?.focus());
    });
    watch(activeIndex, () => {
      nextTick(() => {
        listRef.value?.querySelector(`[data-index='${activeIndex.value}']`)?.scrollIntoView({ block: 'nearest' });
      });
    });

    function search(value: string) {
      keyword.value = value.trim();
      if (!keyword.value) {
        searchResult.value = [];
        return;
      }
      const reg = createSearchReg(keyword.value);
      searchResult.value = entries.value.filter((e) => reg.test(e.own));
      activeIndex.value = 0;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleSearch = (e: any) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => search(e?.target?.value || ''), 200);
    };

    function close() {
      searchResult.value = [];
      open.value = false;
    }

    function move(d: number) {
      const len = searchResult.value.length;
      if (!len) return;
      activeIndex.value = (activeIndex.value + d + len) % len;
    }

    function enter(index = activeIndex.value) {
      const target = searchResult.value[index];
      if (!target) return;
      close();
      nextTick(() => go(target.path));
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        enter();
      } else if (e.key === 'Escape') {
        close();
      }
    }

    return () => (
      <>
        <ActionButton iconOnly icon="i-ri-search-line" title="搜索" onClick={() => (open.value = true)} />

        <Teleport to="body">
          <Transition css={false} onEnter={onEnter} onLeave={onLeave} onAfterLeave={afterLeave}>
            {open.value && (
              <div class="fixed inset-0 z-[800] flex justify-center bg-black/25 pt-50px h-full" onClick={close}>
                <div
                  class="relative flex w-632px flex-col self-start rounded-16px bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
                  onClick={(e: Event) => e.stopPropagation()}
                >
                  {/* 搜索输入行 */}
                  <div class="flex items-center px-14px pt-14px">
                    <Input
                      ref={inputRef}
                      class="h-48px"
                      placeholder={t('common.searchText')}
                      allowClear
                      onChange={handleSearch}
                      onKeydown={onKeydown}
                    >
                      {{
                        prefix: () => <SearchIcon class="size-18px text-gray-400" />,
                      }}
                    </Input>
                  </div>

                  {/* 空关键词 / 无命中：与原版一致，输入后才出现结果 */}
                  {!hasData.value && (
                    <div class="flex h-100px items-center justify-center text-14px text-gray-400">
                      {t('component.app.searchNotData')}
                    </div>
                  )}

                  {hasData.value && (
                    <ul ref={listRef} class="mt-14px max-h-472px list-none overflow-auto px-14px pb-20px">
                      {searchResult.value.map((item, index) => (
                        <li
                          key={item.path}
                          data-index={index}
                          class={cn(
                            'mt-8px flex h-56px cursor-pointer items-center rounded-4px px-14px text-14px shadow-[0_1px_3px_#d4d9e1]',
                            activeIndex.value === index ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700',
                          )}
                          onMouseenter={() => (activeIndex.value = index)}
                          onClick={() => enter(index)}
                        >
                          <div class="flex w-30px items-center">
                            {item.icon ? (
                              <span class={cn('inline-block size-20px align-middle', item.icon)} />
                            ) : (
                              <FileText class="size-20px" />
                            )}
                          </div>
                          <div class="flex-1 truncate">{item.name}</div>
                          <div
                            class={cn(
                              'flex w-30px items-center justify-end',
                              activeIndex.value === index ? 'opacity-100' : 'opacity-0',
                            )}
                          >
                            <CornerDownLeft class="size-18px" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 按键提示（对应原版 AppSearchFooter） */}
                  <div class="flex items-center justify-center gap-16px pb-12px pt-6px text-12px text-gray-400">
                    <span>↑↓ 切换</span>
                    <span>Enter 跳转</span>
                    <span>Esc 关闭</span>
                  </div>
                </div>
              </div>
            )}
          </Transition>
        </Teleport>
      </>
    );
  },
});
