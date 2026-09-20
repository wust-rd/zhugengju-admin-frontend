<!--
  联合审查 · 选择联合审查单位弹窗（scheme-declaration-review 共用）

  设计稿：顶部橙色提示「提交后将自动推送至选中单位进行联合审查」+ 三列圆形多选单位 +
  底部 取消/确定。确认后由调用方调 schemeReview/jointPush：轮次 +1、状态 → 联合审查中，
  站内消息由后端按部门（receive_type=2）精确推送。
  候选单位取后端审查字典（授有机构角色 esp_pqchsbsc_joint_review 的部门，
  【机构管理】关联角色维护），打开时拉取一次并缓存。
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

      <!-- 单位多选（三列圆形勾选）；空态/加载中给维护入口提示 -->
      <div class="flex flex-col gap-12px">
        <span class="text-14px font-500 text-gray-800">选择联合审查单位</span>
        <div v-if="units.length" class="grid grid-cols-3 gap-x-8px gap-y-18px">
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
        <div v-else class="rd-6px bg-[#f7f9fc] px-12px py-10px text-12px text-gray-400">
          {{
            unitsLoaded
              ? '暂无可选的联合审查单位：请在【系统设置 → 机构管理】为参与联审的市级部门关联角色 esp_pqchsbsc_joint_review 后再来推送。'
              : '联合审查单位列表加载中…'
          }}
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
  import { schemeReviewDict } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';

  const props = defineProps<{ open: boolean }>();
  const emit = defineEmits(['update:open', 'confirm']);

  const { showMessage } = useMessage();

  /** 候选单位（后端联审单位字典：授有联审角色的机构，js_sys_office_role 数据；缓存一次拉取） */
  const units = ref<{ code: string; name: string }[]>([]);
  /** 拉取结束标记（区分「加载中」与「确实没有可选单位」两种空态） */
  const unitsLoaded = ref(false);
  let loading: Promise<void> | null = null;

  function loadUnits() {
    unitsLoaded.value = false;
    loading ??= schemeReviewDict()
      .then((dict) => {
        units.value = dict.jointUnits ?? [];
      })
      .catch((error) => {
        console.warn('[scheme-review] 联审单位字典拉取失败：', error);
        loading = null; // 失败允许下次重试
      })
      .finally(() => {
        unitsLoaded.value = true;
      });
    return loading;
  }

  watch(
    () => props.open,
    (open) => {
      if (open) {
        selected.value = [];
        void loadUnits();
      }
    },
  );

  /** 已选单位编码（每次打开重置，避免误触把上一轮单位直接推出去） */
  const selected = ref<string[]>([]);

  function toggle(code: string) {
    selected.value = selected.value.includes(code)
      ? selected.value.filter((item) => item !== code)
      : [...selected.value, code];
  }

  function handleCancel() {
    emit('update:open', false);
  }

  function handleConfirm() {
    if (!units.value.length) {
      showMessage('联合审查单位列表未加载，请稍后重试');
      return;
    }
    if (!selected.value.length) {
      showMessage('请选择联合审查单位');
      return;
    }
    const chosen = units.value.filter((unit) => selected.value.includes(unit.code));
    emit('confirm', chosen);
    emit('update:open', false);
  }
</script>
