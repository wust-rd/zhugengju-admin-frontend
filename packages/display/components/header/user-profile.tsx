import { defineComponent } from 'vue';
import { UserDropDown } from './actions';

/**
 * UserProfile —— display header 右侧功能坞（精简后）
 *
 * 按需求移除「在线人数」「设置」；仅保留用户下拉 UserDropDown。
 */
export const UserProfile = defineComponent({
  setup() {
    return () => (
      <div class="flex h-full items-center gap-2 pl-3 pr-4">
        <UserDropDown />
      </div>
    );
  },
});
