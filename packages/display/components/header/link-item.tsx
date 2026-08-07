import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
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
    const renderContent = (isActive: boolean, navigate?: () => void) => (
      <div
        class="relative w-194px h-56px flex items-center"
        onClick={() => {
          if (!props.disabled && navigate) {
            navigate();
          }
        }}
      >
        <img src={isActive ? activeLinkImg : linkImg} alt="tab" class="size-full" />

        <div
          class={cn('size-20px absolute left-20px', props.icon, {
            'text-white': isActive,
            'text-gray-400': !isActive,
          })}
        />
        <div
          class={cn('text-18px absolute left-68px whitespace-nowrap', {
            'text-white font-600': isActive,
            'text-gray-400': !isActive,
          })}
        >
          {props.label}
        </div>
      </div>
    );

    return () =>
      props.disabled
        ? renderContent(false)
        : (
            <RouterLink
              to={props.to}
              v-slots={{
                default: ({ isActive, navigate }) => renderContent(isActive, navigate),
              }}
            />
          );
  },
});
