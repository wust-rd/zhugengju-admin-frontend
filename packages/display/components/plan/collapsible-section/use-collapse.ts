import { ref } from 'vue';

/**
 * 可折叠状态 Hook：非受控内部状态 + 显式动作
 *
 * Hook 优先：逻辑收进纯函数，组件只负责拼装 Hook + 渲染；
 * 可直接单元测试，其他组件（如手风琴互斥）也能复用。
 */
export function useCollapse(defaultOpen = false) {
  const isOpen = ref(defaultOpen);

  /** 切换展开/收起 */
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  /** 显式设置展开状态 */
  const setOpen = (open: boolean) => {
    isOpen.value = open;
  };

  return { isOpen, toggle, setOpen };
}
