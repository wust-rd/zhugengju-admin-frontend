<!--
  填报页区块二：片区体检情况（对齐设计稿）

  三个清单字段（均必填，一行一条、可添加/删除多行）：
   - 问题整治清单 problemList / 发展机遇清单 opportunityList / 更新诉求清单 demandList。
  清单经 schema slot（ListEditor 行编辑器）挂进 BasicForm：
   - 输入即时把「去空行」后的数组同步回 formModel（setFieldsValueSilently），
     必填校验（type: array）与保存取值、Excel 导出复用统一接口。
-->
<template>
  <BasicForm @register="registerForm">
    <template #problemList>
      <ListEditor v-model:value="problemRows" :disabled="disabled" @change="(v) => syncList('problemList', v)" />
    </template>
    <template #opportunityList>
      <ListEditor
        v-model:value="opportunityRows"
        :disabled="disabled"
        @change="(v) => syncList('opportunityList', v)"
      />
    </template>
    <template #demandList>
      <ListEditor v-model:value="demandRows" :disabled="disabled" @change="(v) => syncList('demandList', v)" />
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionHealthCheck">
  import { ref } from 'vue';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { useSectionForm } from './use-section-form';
  import ListEditor from './list-editor.vue';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 通栏字段（占满整行） */
  const FULL_COL = { span: 24, md: 24, lg: 24 };

  const inputFormSchemas: FormSchema[] = [
    {
      label: '问题整治清单',
      field: 'problemList',
      component: 'Input',
      slot: 'problemList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加问题整治清单' }],
    },
    {
      label: '发展机遇清单',
      field: 'opportunityList',
      component: 'Input',
      slot: 'opportunityList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加发展机遇清单' }],
    },
    {
      label: '更新诉求清单',
      field: 'demandList',
      component: 'Input',
      slot: 'demandList',
      colProps: FULL_COL,
      rules: [{ required: true, type: 'array', message: '请添加更新诉求清单' }],
    },
  ];

  const { registerForm, exposed } = useSectionForm({
    data: props.data,
    disabled: props.disabled,
    layout: 'vertical',
    rowProps: { gutter: 24 },
    baseColProps: { md: 24, lg: 12 },
    schemas: inputFormSchemas,
  });

  /** 行初值：记录里有数组用之，否则按一行空行展示 */
  function initRows(v: unknown): string[] {
    const arr = Array.isArray(v) ? v.map(String) : [];
    return arr.length ? arr : [''];
  }

  const problemRows = ref(initRows(props.data?.problemList));
  const opportunityRows = ref(initRows(props.data?.opportunityList));
  const demandRows = ref(initRows(props.data?.demandList));

  /** 行编辑回调：去空行后同步进 formModel（空数组会触发必填校验失败） */
  function syncList(field: string, rows: string[]) {
    exposed.setFieldsValueSilently({ [field]: rows.map((r) => String(r).trim()).filter(Boolean) });
  }

  defineExpose(exposed);
</script>
