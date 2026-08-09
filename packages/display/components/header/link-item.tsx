import { computed, defineComponent } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import linkImg from '@jeesite/assets/images/display/link.webp';
import activeLinkImg from '@jeesite/assets/images/display/active-link.webp';

import { cn } from '@jeesite/core/libs';

export const LinkItem = defineComponent({
  props: {
    to: { type: String, default: '' },
    icon: { type: String, default: '' },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    const route = useRoute();
    // 前缀匹配：/display/scheme 及 /display/scheme/detail 等子路径都点亮
    const isActive = computed(
      () => route.path === props.to || route.path.startsWith(`${props.to}/`),
    );

    const renderContent = (navigate?: () => void) => (
      <div
        class="relative w-194px h-56px flex items-center"
        onClick={() => {
          if (!props.disabled && navigate) {
            navigate();
          }
        }}
      >
        <img src={isActive.value ? activeLinkImg : linkImg} alt="tab" class="size-full" />

        <div
          class={cn('size-20px absolute left-20px', props.icon, {
            'text-white': isActive.value,
            'text-gray-400': !isActive.value,
          })}
        />
        <div
          class={cn('text-18px absolute left-68px whitespace-nowrap', {
            'text-white font-600': isActive.value,
            'text-gray-400': !isActive.value,
          })}
        >
          {props.label}
        </div>
      </div>
    );

    return () =>
      props.disabled
        ? renderContent()
        : (
            <RouterLink
              to={props.to}
              v-slots={{
                default: ({ navigate }) => renderContent(navigate),
              }}
            />
          );
  },
});
