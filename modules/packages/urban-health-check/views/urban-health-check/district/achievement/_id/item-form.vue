<!--
  市住更局 —— 区级体检成果清单明细 新增/编辑/查看 抽屉（问题整治/发展机遇/更新诉求共用）

  字段按后端现状：清单内容描述(必填)；问题整治另填对应体检维度、发展机遇另填机遇类型
  （更新诉求仅描述）。itemType 由父级传（item:1/2/3）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="40%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementItemForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { DistrictAchievementItem } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    districtAchievementItemSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    readOnly: { type: Boolean, default: false },
    /** 当前清单页签（item:1 问题整治 / item:2 发展机遇 / item:3 更新诉求） */
    itemType: { type: String, default: 'item:1' },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<DistrictAchievementItem & { isNewRecord?: boolean }>(
    {} as DistrictAchievementItem & { isNewRecord?: boolean },
  );

  const typeCode = computed(() => props.itemType.replace('item:', ''));
  const typeName = computed(
    () => ({ '1': '问题整治', '2': '发展机遇', '3': '更新诉求' } as Record<string, string>)[typeCode.value] ?? '清单',
  );

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: `${isView.value ? '查看' : record.value.isNewRecord ? '新增' : '编辑'} · ${typeName.value}清单`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '清单内容描述',
      field: 'itemDesc',
      component: 'InputTextArea',
      componentProps: { maxlength: 1000, showCount: true, rows: 5 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入清单内容描述' }],
    },
    {
      label: '对应体检维度',
      field: 'firstDimension',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '如：基础运行评估 / 功能发展评估',
      ifShow: () => typeCode.value === '1',
    },
    {
      label: '机遇类型',
      field: 'resourceType',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '如：历史文化 / 生态资源 / 产业空间',
      ifShow: () => typeCode.value === '2',
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 130,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    isView.value = !!data?.isView;
    record.value = (data || {}) as DistrictAchievementItem;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    await setFieldsValue({
      itemDesc: record.value.itemDesc ?? '',
      firstDimension: record.value.firstDimension ?? '',
      resourceType: record.value.resourceType ?? '',
    });
    await setProps({ disabled: isView.value || props.readOnly });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value || props.readOnly) {
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
      await districtAchievementItemSave({
        id: record.value.id,
        catalogId: record.value.catalogId!,
        itemType: typeCode.value,
        itemDesc: data.itemDesc,
        firstDimension: typeCode.value === '1' ? data.firstDimension ?? null : null,
        resourceType: typeCode.value === '2' ? data.resourceType ?? null : null,
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
