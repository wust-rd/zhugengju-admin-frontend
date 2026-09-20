<!--
  联合审查 · 选择联合审查单位弹窗（scheme-declaration-review 共用）

  设计稿：顶部橙色提示「提交后将自动推送至选中单位进行联合审查」+ 三列圆形多选单位 +
  底部 取消/确定。确认后由调用方调 pushJointReview()：轮次 +1、片区状态 → 联合审查中、
  被选中单位收到通知（现在没有单位账号，前端用框架 notification 提示 + 本地推送记录，
  接角色后改调框架内消息接口）。
  控件说明：设计稿画的是「圆形」勾选（同一行可选中多个）→ 多选语义，故用自绘圆点
  而不是 antd Checkbox（方形）以贴合设计。
  非 a-button/a-input 的 antd 组件必须显式 import（Modal）。
-->
<template>
  <Modal :open="open" title="联合审查" :width="560" :footer="null" centered @cancel="handleCancel">
    <div class="flex flex-col gap-16px">
      <!-- 提示条 -->
      <div class="rd-6px bg-[#fff7e6] px-12px py-8px text-13px text-[#d46b08]">
        提交后将自动推送至选中单位进行联合审查
      </div>

      <!-- 单位多选（三列圆形勾选） -->
      <div class="flex flex-col gap-12px">
        <span class="text-14px font-500 text-gray-800">选择联合审查单位</span>
        <div class="grid grid-cols-3 gap-x-8px gap-y-18px">
          <div
            v-for="unit in units"
            :key="unit.code"
            class="flex cursor-pointer items-center gap-8px text-14px text-gray-700"
            @click="toggle(unit.code)"
          >
            <span
              class="flex h-16px w-16px shrink-0 items-center justify-center rd-full border-1px transition-colors"
              :class="selected.includes(unit.code) ? 'border-[#3A8EF6]' : 'border-gray-300'"
            >
              <span v-if="selected.includes(unit.code)" class="h-8px w-8px rd-full bg-[#3A8EF6]"></span>
            </span>
            <span>{{ unit.name }}</span>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-end gap-12px pt-4px">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleConfirm">确定</a-button>
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationJointReviewModal">
  import { ref, watch } from 'vue';
  import { Modal } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { JOINT_REVIEW_UNITS, type ReviewerIdentity } from './review-mock';

  const props = defineProps<{ open: boolean }>();
  const emit = defineEmits(['update:open', 'confirm']);

  const { showMessage } = useMessage();

  /** 候选单位（正式版应改为接口下发） */
  const units = JOINT_REVIEW_UNITS;

  const selected = ref<string[]>([]);

  // 每次打开都从空选开始（避免误触把上一轮单位直接推出去）
  watch(
    () => props.open,
    (open) => {
      if (open) selected.value = [];
    },
  );

  function toggle(code: string) {
    selected.value = selected.value.includes(code)
      ? selected.value.filter((item) => item !== code)
      : [...selected.value, code];
  }

  function handleCancel() {
    emit('update:open', false);
  }

  function handleConfirm() {
    if (!selected.value.length) {
      showMessage('请选择联合审查单位');
      return;
    }
    const chosen: ReviewerIdentity[] = units.filter((unit) => selected.value.includes(unit.code));
    emit('confirm', chosen);
    emit('update:open', false);
  }
</script>
