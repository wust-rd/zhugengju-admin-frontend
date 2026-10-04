<!--
  市住更局 —— 体检成果 新增表单抽屉

  仅用于新增成果目录（表10）：体检年份/成果类型（仅问题清单+资源清单，用户决策）/
  关联指标体系（问题/资源清单必填，后端校验体系年份须与成果年份一致，用于自动代入
  与关联指标项校验）/填报单位/备注。
  填报时间由后端自动记录、明细数量随明细自动同步、提交状态由编辑页「提交结果」驱动。
  编辑入口不走本抽屉 —— 列表「编辑」直接下钻 RESTful 编辑页。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="35%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanAchievementForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import {
    ACHIEVEMENT_TYPE_OPTIONS,
    achievementSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/achievement';
  import {
    indicatorSystemPage,
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: '新增体检成果',
  }));

  /** 关联指标体系下拉（随体检年份联动加载；后端要求体系年份=成果年份） */
  const setOptions = ref<{ label: string; value: string }[]>([]);

  async function loadSets(year?: string) {
    setOptions.value = [];
    if (!year) return;
    try {
      const page = await indicatorSystemPage({ year, pageNo: 1, pageSize: 20 });
      setOptions.value = page.list.map((set: any) => ({
        label: `${set.indicatorName ?? set.name ?? set.id}（${set.indicatorCount ?? 0}项）`,
        value: set.id as string,
      }));
    } catch (e: any) {
      showMessage(e?.message || '指标体系列表加载失败', 'error');
    }
  }

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '体检年份',
      field: 'setYear',
      component: 'Select',
      componentProps: {
        options: YEAR_OPTIONS,
        allowClear: true,
        onChange: (year: string) => {
          // 年份切换后原体系不再可选（后端校验年度一致）
          setFieldsValue({ indicatorSetId: undefined });
          loadSets(year);
        },
      },
      rules: [{ type: 'string', required: true, message: '请选择体检年份' }],
    },
    {
      label: '成果类型',
      field: 'achievementType',
      component: 'Select',
      componentProps: { options: ACHIEVEMENT_TYPE_OPTIONS, allowClear: true },
      rules: [{ type: 'string', required: true, message: '请选择成果类型' }],
      helpMessage: '本期开放问题清单/资源清单；明细表头按成果类型自动适配',
    },
    {
      label: '关联指标体系',
      field: 'indicatorSetId',
      component: 'Select',
      componentProps: () => ({
        options: setOptions.value,
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
        placeholder: '请先选择体检年份',
      }),
      rules: [{ type: 'string', required: true, message: '请选择关联指标体系' }],
      helpMessage: '用于自动代入指标项结果与关联指标项校验；体系年份须与体检年份一致',
    },
    {
      label: '填报单位',
      field: 'fillUnit',
      component: 'Input',
      componentProps: { maxlength: 100 },
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    // resetFields 可能因表单未挂载不 resolve，超时兜底（历史坑）
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    setOptions.value = [];
    await setFieldsValue({ setYear: YEAR_OPTIONS[0]?.value });
    await loadSets(YEAR_OPTIONS[0]?.value);
    await setProps({ disabled: false });
    setDrawerProps({ loading: false, showFooter: true });
  });

  async function handleSubmit() {
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
      await achievementSave({
        setYear: data.setYear,
        achievementType: data.achievementType,
        indicatorSetId: data.indicatorSetId,
        fillUnit: data.fillUnit,
        remarks: data.remarks,
      });
      showMessage('保存成功，请进入编辑页维护清单明细');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
