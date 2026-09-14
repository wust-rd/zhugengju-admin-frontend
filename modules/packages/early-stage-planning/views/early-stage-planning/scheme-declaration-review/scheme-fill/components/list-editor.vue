<!--
  清单编辑器：一行一条、可添加/删除多行（片区体检情况三个清单字段共用）

  受控用法：父级传 value（行文本数组）+ v-model:value；输入/增删即时 emit。
  仅负责行编辑交互，值收集（去空行）与必填校验由父级区块经 formModel 负责。
  a-input / a-button 为项目全局注册组件，无需显式导入。
-->
<template>
  <div class="flex flex-col gap-8px">
    <div v-for="(_, idx) in rows" :key="idx" class="flex items-center gap-8px">
      <a-input v-model:value="rows[idx]" :placeholder="placeholder" :disabled="disabled" @change="emitChange" />
      <a-button
        v-if="!disabled"
        type="text"
        class="flex-none text-gray-400 hover:text-red-500!"
        title="删除本行"
        @click="removeRow(idx)"
      >
        <span class="i-fluent:delete-12-filled"></span>
      </a-button>
    </div>
    <a-button v-if="!disabled" type="dashed" block @click="addRow">
      <span class="inline-flex items-center gap-4px"><span class="i-fluent:add-12-filled"></span> 添加一行</span>
    </a-button>
  </div>
</template>
<script lang="ts" setup>
  import { ref } from 'vue';

  const props = withDefaults(
    defineProps<{
      /** 行文本数组（初值；空数组按一行空行展示） */
      value?: string[];
      placeholder?: string;
      disabled?: boolean;
    }>(),
    { value: () => [''], placeholder: '一行一条，可添加多条', disabled: false },
  );
  const emit = defineEmits(['update:value', 'change']);

  /** 本地行状态（初值取自父级，此后行编辑只在本组件内流转，经 emit 通知父级） */
  const rows = ref<string[]>(props.value.length ? [...props.value] : ['']);

  function emitChange() {
    const snapshot = [...rows.value];
    emit('update:value', snapshot);
    emit('change', snapshot);
  }

  function addRow() {
    rows.value.push('');
    emitChange();
  }

  function removeRow(idx: number) {
    rows.value.splice(idx, 1);
    emitChange();
  }
</script>
