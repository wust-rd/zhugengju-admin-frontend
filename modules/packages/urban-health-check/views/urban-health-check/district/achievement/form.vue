<!--
  市住更局 —— 区级体检成果 新增表单抽屉

  与指标体系管理的新增抽屉同款：体检片区下拉取前期规划片区（选中带出行政区/片区唯一号），
  必填 体检年份/行政区划/体检片区/填报单位；同年同区同片区唯一（后端校验）。
  编辑入口不走本抽屉 —— 列表「编辑」直接下钻五页签编辑页。
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
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementForm">
  import { computed, onMounted, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { EspAreaOption } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    districtAchievementSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import { fetchEspAreas } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { DISTRICTS, toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: '新增 · 体检成果',
  }));

  /** 前期规划片区列表 */
  const espAreas = ref<EspAreaOption[]>([]);
  const selectedAreaCode = ref('');

  function normalizeDistrict(dist: string): string | undefined {
    return DISTRICTS.find((d) => dist.includes(d));
  }

  onMounted(async () => {
    try {
      espAreas.value = await fetchEspAreas();
    } catch (e: any) {
      showMessage(e?.message || '前期规划片区列表加载失败', 'error');
    }
  });

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
      componentProps: { options: YEAR_OPTIONS },
      rules: [{ type: 'string', required: true, message: '请选择体检年份' }],
    },
    {
      label: '行政区划',
      field: 'district',
      component: 'Select',
      componentProps: { options: toOptions(DISTRICTS), showSearch: true, allowClear: true },
      rules: [{ type: 'string', required: true, message: '请选择行政区划' }],
    },
    {
      label: '体检片区',
      field: 'areaName',
      component: 'Select',
      componentProps: () => ({
        options: espAreas.value.map((a) => ({
          label: `${a.district ? a.district + ' · ' : ''}${a.name}`,
          value: a.name,
        })),
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
        placeholder: '选择前期规划片区（按名称搜索）',
        onChange: (name: string) => handleAreaChange(name),
      }),
      rules: [{ type: 'string', required: true, message: '请选择体检片区' }],
      helpMessage: '片区来自前期规划模块；同年同区同片区仅允许一套成果',
    },
    {
      label: '填报单位',
      field: 'fillUnit',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入填报单位' }],
    },
    {
      label: '填报责任人',
      field: 'responsibleUser',
      component: 'Input',
      componentProps: { maxlength: 50 },
    },
    {
      label: '联系电话',
      field: 'contactPhone',
      component: 'Input',
      componentProps: { maxlength: 20 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  function handleAreaChange(name?: string) {
    selectedAreaCode.value = '';
    const area = espAreas.value.find((a) => a.name === name);
    if (!area) return;
    selectedAreaCode.value = area.uid;
    const district = normalizeDistrict(area.district);
    if (district) {
      setFieldsValue({ district });
    }
  }

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
    selectedAreaCode.value = '';
    await setFieldsValue({ setYear: YEAR_OPTIONS[0]?.value });
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
      await districtAchievementSave({
        setYear: data.setYear,
        district: data.district,
        areaCode: selectedAreaCode.value || undefined,
        areaName: data.areaName,
        fillUnit: data.fillUnit,
        responsibleUser: data.responsibleUser,
        contactPhone: data.contactPhone,
      });
      showMessage('保存成功，请进入编辑页维护五类清单');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
