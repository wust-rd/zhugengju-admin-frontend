<!--
  @jeesite/ui —— Stepper 步骤条（进度条 + 页签双角色）

  shadcn-vue stepper（reka-ui 版）的定制移植：不引 reka-ui，纯展示、状态驱动——
  每个步骤显式声明 status（finish/process/wait），样式完全由本组件掌控，
  规避 antdv-next Steps 无法覆盖的状态色（如已完成环节的浅蓝勾、current 默认点亮首项）。

  结构对照 shadcn-vue stepper：圆形 indicator（完成=打钩、当前/未到=序号）+
  标题（可选描述）+ 分隔线。颜色语义：process=强调蓝实心（与选中态蓝色语言
  统一，组件内无绿色），finish=中性灰实心，wait=白底灰描边；分隔线统一浅灰，
  不参与强调。

  兼作页签：每项可点击，v-model:active 绑定选中下标（步骤条与内容页签联动）。
  disabled 项不可点击进入（置灰降透明度），用于按业务阶段限制可进入的步骤。
  选中态：圆圈泛荧光 shadow；标题变实底白字胶囊（统一 px-8px，未选中背景
  透明，切换不跳动）。选中态与 status 语义独立叠加。高亮色由 tone 决定：
  blue（默认，在库项目）= 蓝 shadow + 蓝底；gray（如已退出项目）= 灰 shadow + 灰底。
-->
<template>
  <div class="flex w-full items-start">
    <div v-for="(step, index) in steps" :key="`${index}-${step.title}`" class="flex min-w-0 flex-1 items-start">
      <!-- 与上一环节的连线（首项无）；两侧连线均 flex-1，末项的圆被推到最右，整条铺满宽度 -->
      <div v-if="index > 0" class="mt-15px h-2px min-w-8px flex-1 rounded-full bg-#e5e5e5"></div>
      <div
        class="flex min-w-64px flex-col items-center gap-6px px-8px transition-opacity"
        :class="step.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'"
        @click="handleStepClick(index)"
      >
        <div
          class="flex h-32px w-32px shrink-0 items-center justify-center rounded-full text-14px font-500 transition-shadow"
          :class="[ICON_CLASS[step.status ?? 'wait'], active === index ? tone.shadow : undefined]"
        >
          <span v-if="step.status === 'finish'" class="i-ant-design:check-outlined text-14px"></span>
          <template v-else>{{ index + 1 }}</template>
        </div>
        <div
          class="rounded-4px px-8px text-center text-13px transition-colors"
          :class="[active === index ? tone.pill : undefined, active === index ? '' : 'text-gray-500']"
        >
          {{ step.title }}
        </div>
        <div v-if="step.description" class="text-center text-12px text-gray-400">{{ step.description }}</div>
      </div>
      <!-- 与下一环节的连线（末项无） -->
      <div v-if="index < steps.length - 1" class="mt-15px h-2px min-w-8px flex-1 rounded-full bg-#e5e5e5"></div>
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { computed } from 'vue';
  import type { StepItem, StepStatus } from './types';

  const props = withDefaults(defineProps<{ steps: StepItem[]; tone?: 'blue' | 'gray' }>(), {
    tone: 'blue',
  });

  /** 选中项下标（步骤条兼作页签）：v-model:active 与内容区联动 */
  const active = defineModel<number>('active', { default: 0 });

  /** 各状态圆形 indicator 的样式 */
  const ICON_CLASS: Record<StepStatus, string> = {
    finish: 'bg-#d9d9d9 text-white',
    process: 'bg-#1677ff text-white',
    wait: 'bg-white text-gray-400 b-1 b-solid b-#d9d9d9',
  };

  /** 选中态高亮色：blue=在库项目（蓝 shadow + 蓝底胶囊）；gray=已退出等项目，
   *  背景与「已退出」状态 Tag（Tag color=default variant=solid → rgba(0,0,0,0.88)）同色 */
  const TONE_CLASS = {
    blue: { shadow: 'shadow-[0_0_10px_2px_rgba(22,119,255,0.45)]', pill: 'bg-#1677ff text-white' },
    gray: { shadow: 'shadow-[0_0_10px_2px_rgba(0,0,0,0.45)]', pill: 'bg-[rgba(0,0,0,0.88)] text-white' },
  } as const;

  const tone = computed(() => TONE_CLASS[props.tone]);

  /** 步骤页签点击：禁用项不可进入 */
  function handleStepClick(index: number) {
    if (props.steps[index]?.disabled) return;
    active.value = index;
  }
</script>
