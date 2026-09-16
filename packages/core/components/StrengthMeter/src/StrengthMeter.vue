<template>
  <div class="jeesite-strength-meter relative">
    <InputPassword
      v-if="showInput"
      v-bind="$attrs"
      allowClear
      :value="innerValueRef"
      @change="handleChange"
      :disabled="disabled"
      autocomplete="new-password"
    >
      <template #[item]="data" v-for="item in Object.keys($slots)">
        <slot :name="item" v-bind="data || {}"></slot>
      </template>
    </InputPassword>
    <div class="jeesite-strength-meter-bar">
      <div class="jeesite-strength-meter-bar--fill" :data-score="getPasswordStrength"></div>
    </div>
  </div>
</template>

<script lang="ts" setup name="StrengthMeter">
  import { computed, ref, watch, unref, watchEffect } from 'vue';
  import { Input } from 'antdv-next';
  import { propTypes } from '@jeesite/core/utils/propTypes';

  const InputPassword = Input.Password;

  const props = defineProps({
    value: propTypes.string,
    showInput: propTypes.bool.def(true),
    disabled: propTypes.bool,
  });

  const emit = defineEmits(['score-change', 'change', 'update:value']);

  const innerValueRef = ref('');

  /**
   * 密码等级（与后端 PwdService 同款口径，sys.user.passwordModifySecurityLevel 的计分规则）：
   * 五项检测——长度≥8、大写字母、小写字母、数字、特殊符号；
   * 命中 1 项→很弱(1)、2 项→弱(2)、3~4 项→安全(3)、5 项→很安全(4)
   */
  function getPasswordLevel(password: string): number {
    const hits = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    if (hits >= 5) return 4;
    if (hits >= 3) return 3;
    return hits;
  }

  const getPasswordStrength = computed(() => {
    const { disabled } = props;
    if (disabled) return -1;
    const innerValue = unref(innerValueRef);
    const score = innerValue ? getPasswordLevel(innerValue) : -1;
    emit('score-change', score);
    return score;
  });

  function handleChange(e: ChangeEvent) {
    innerValueRef.value = e.target.value || '';
  }

  watchEffect(() => {
    innerValueRef.value = props.value || '';
  });

  watch(
    () => unref(innerValueRef),
    (val) => {
      emit('update:value', val);
      emit('change', val);
    },
  );
</script>
<style lang="less">
  .jeesite-strength-meter {
    &-bar {
      position: relative;
      height: 6px;
      margin: 10px auto 6px;
      background-color: @disabled-color;
      border-radius: 6px;

      &::before,
      &::after {
        position: absolute;
        z-index: 10;
        display: block;
        width: 20%;
        height: inherit;
        background-color: transparent;
        border-color: @white;
        border-style: solid;
        border-width: 0 5px;
        content: '';
      }

      &::before {
        left: 20%;
      }

      &::after {
        right: 20%;
      }

      &--fill {
        position: absolute;
        width: 0;
        height: inherit;
        background-color: transparent;
        border-radius: inherit;
        transition:
          width 0.5s ease-in-out,
          background 0.25s;

        &[data-score='0'] {
          width: 20%;
          background-color: darken(@error-color, 10%);
        }

        &[data-score='1'] {
          width: 40%;
          background-color: @error-color;
        }

        &[data-score='2'] {
          width: 60%;
          background-color: @warning-color;
        }

        &[data-score='3'] {
          width: 80%;
          background-color: fade(@success-color, 50%);
        }

        &[data-score='4'] {
          width: 100%;
          background-color: @success-color;
        }
      }
    }
  }
</style>
