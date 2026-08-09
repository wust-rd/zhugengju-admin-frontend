<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@jeesite/core/libs";

type Props = {
  /** Visual variant: "popover" (rounded card) or "tooltip" (compact, dark). */
  variant?: "popover" | "tooltip";
  /** Render a close button in the top-right corner (popover variant only). */
  closeButton?: boolean;
  /** Additional CSS classes. */
  class?: string;
};

const props = withDefaults(defineProps<Props>(), {
  variant: "popover",
  closeButton: false,
});

defineEmits<{ close: [] }>();

const cls = computed(() =>
  props.variant === "tooltip"
    ? cn(
        "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 pointer-events-none rounded-md px-2 py-1 text-xs text-balance shadow-md",
        "duration-200 ease-out",
        props.class,
      )
    : cn(
        "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white relative max-w-62 rounded-md border p-3 shadow-md",
        "duration-200 ease-out",
        props.class,
      ),
);
</script>

<template>
  <div :class="cls">
    <button
      v-if="variant === 'popover' && closeButton"
      type="button"
      aria-label="Close popup"
      class="focus-visible:ring-neutral-950 dark:ring-white hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white absolute top-0.5 right-0.5 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2"
      @click="$emit('close')"
    >
      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <slot />
  </div>
</template>
