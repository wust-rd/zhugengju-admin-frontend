<!--
  市住更局 —— 体检成果清单明细 新增/编辑/查看 表单抽屉（问题/资源/意愿清单，表11+表12）

  字段：分析描述(必填)/对应一级维度(可空，选项取关联体系指标项的一级维度)/
   程度范围(严重/一般严重/限时解决)/备注 + 关联指标项区块：
   - 多选 Select 从关联体系指标项中添加（选中即加入关联，指标值/评估结果由后端
     保存时按体系结果自动带出快照）；
   - 历史数据中 indicatorItemId 为空的关联行（名称未唯一对应）原样保留展示、可移除；
   - 保存明细时携带 indicatorList 整批覆盖表12（后端先校验后替换）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="55%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />

    <!-- 关联指标项（表12）：多选添加 + 已关联列表，随明细一并保存 -->
    <div class="px-4 pb-2">
      <div class="mb-2 font-medium">
        关联指标项
        <span class="ml-2 text-gray-400 text-xs">指标值/评估结果由系统按关联体系结果自动带出</span>
      </div>
      <Select
        v-model:value="selectedIds"
        mode="multiple"
        :options="itemOptions"
        :disabled="formDisabled"
        show-search
        option-filter-prop="label"
        placeholder="搜索并选择要关联的指标项（可多选）"
        style="width: 100%"
        :max-tag-count="6"
        @change="onSelectChange"
      />
      <div v-if="indicatorRows.length" class="mt-3">
        <div
          v-for="(row, idx) in indicatorRows"
          :key="row.id ?? row.indicatorItemId ?? `${row.itemName}-${idx}`"
          class="flex items-center justify-between rounded border px-3 py-2 mb-2"
          style="background: #fafafa"
        >
          <div class="flex items-center flex-wrap" style="column-gap: 16px">
            <span class="max-w-md ellipsis" :title="row.itemName">{{ row.itemName }}</span>
            <span class="text-gray-500">
              指标值：<span class="font-medium">{{ displayValue(row) || '-' }}</span>
            </span>
            <span class="text-gray-500">
              评估结果：<span class="font-medium">{{ row.itemEvaluate || '-' }}</span>
            </span>
          </div>
          <a-button v-if="!formDisabled" size="small" danger @click="removeRow(idx)">移除</a-button>
        </div>
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementIdForm">
  import { computed, ref, unref } from 'vue';
  import { Select } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import type { AchievementDetail, AchievementIndicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    achievementDetailSave,
    SCOPE_LEVEL_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 所属目录已提交/查看态时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
    /** 关联指标体系的指标项全集（供关联选择与一级维度下拉） */
    indicatorItems: { type: Array as () => Indicator[], default: () => [] },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const formDisabled = ref(false);
  const record = ref<AchievementDetail & { isNewRecord?: boolean }>(
    {} as AchievementDetail & { isNewRecord?: boolean },
  );

  /** 已关联指标项行（含历史 id=null 行；保存时整批回传） */
  const indicatorRows = ref<AchievementIndicator[]>([]);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看清单明细' : record.value.isNewRecord ? '新增清单明细' : '编辑清单明细',
  }));

  /** 关联选择器受控值（仅管理有 indicatorItemId 的行） */
  const selectedIds = computed(() =>
    indicatorRows.value.map((r) => r.indicatorItemId).filter((v): v is string => !!v),
  );

  /** 指标项全集下拉（关联选择用） */
  const itemOptions = computed(() =>
    props.indicatorItems.map((item) => ({ label: item.indicatorName ?? '', value: item.id! })),
  );

  /** 一级维度下拉（体系指标项维度 + 编辑行历史值兜底） */
  const dim1Options = computed(() => {
    const names = new Set<string>();
    props.indicatorItems.forEach((item) => item.dim1 && names.add(item.dim1));
    const legacy = record.value.firstDimensionName;
    const list = [...names].sort().map((name) => ({ label: name, value: name }));
    if (legacy && !names.has(legacy)) {
      list.push({ label: legacy, value: legacy });
    }
    return list;
  });

  /** 程度范围下拉（标准三选一 + 编辑行历史值兜底） */
  const scopeOptions = computed(() => {
    const list = [...SCOPE_LEVEL_OPTIONS];
    const legacy = record.value.scopeLevel;
    if (legacy && !list.some((o) => o.value === legacy)) {
      list.push({ label: legacy, value: legacy });
    }
    return list;
  });

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '分析描述',
      field: 'analysisDesc',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入分析描述' }],
    },
    {
      label: '对应一级维度',
      field: 'firstDimensionName',
      component: 'Select',
      componentProps: () => ({
        options: dim1Options.value,
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
      }),
      helpMessage: '原表未填写维度时保持为空，系统不推算',
    },
    {
      label: '程度范围',
      field: 'scopeLevel',
      component: 'Select',
      componentProps: () => ({
        // 历史数据存在「尽力解决」等枚举外取值，编辑时兜底展示避免空显
        options: scopeOptions.value,
        allowClear: true,
      }),
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 2 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  /** 指标值展示（文字轨优先，数字轨尾 .0 去除） */
  function displayValue(row: AchievementIndicator) {
    if (row.itemValueText) return row.itemValueText;
    if (row.itemValue != null) return String(row.itemValue).replace(/\.0$/, '');
    return '';
  }

  /** 多选变化：新增按 id 追加行（名称取全集），取消的移除对应行（不影响历史 id=null 行） */
  function onSelectChange(ids: string[]) {
    const nameByid = new Map(props.indicatorItems.map((i) => [i.id!, i.indicatorName ?? '']));
    const kept = indicatorRows.value.filter((r) => !r.indicatorItemId || ids.includes(r.indicatorItemId));
    ids.forEach((id) => {
      if (!kept.some((r) => r.indicatorItemId === id)) {
        kept.push({ indicatorItemId: id, itemName: nameByid.get(id) ?? '' });
      }
    });
    indicatorRows.value = kept;
  }

  function removeRow(idx: number) {
    indicatorRows.value.splice(idx, 1);
  }

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // resetFields 可能因表单未挂载不 resolve，超时兜底（历史坑）
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    isView.value = !!data?.isView;
    formDisabled.value = isView.value || props.readOnly;
    record.value = (data || {}) as AchievementDetail;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    indicatorRows.value = (record.value.indicatorList ?? []).map((r) => ({ ...r }));
    await setFieldsValue({
      analysisDesc: record.value.analysisDesc ?? '',
      firstDimensionName: record.value.firstDimensionName ?? undefined,
      scopeLevel: record.value.scopeLevel ?? undefined,
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: formDisabled.value });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (formDisabled.value) {
      closeDrawer();
      return;
    }
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    setDrawerProps({ loading: true });
    try {
      await achievementDetailSave({
        id: record.value.id,
        // 父级 handleForm 注入页面持有的目录主键（info 明细行不自带）
        catalogId: record.value.catalogId!,
        analysisDesc: data.analysisDesc,
        firstDimensionName: data.firstDimensionName ?? null,
        scopeLevel: data.scopeLevel ?? null,
        remarks: data.remarks,
        indicatorList: indicatorRows.value,
      });
      showMessage('保存成功');
      setTimeout(closeDrawer);
      emit('success');
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
