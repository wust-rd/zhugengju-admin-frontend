<!--
  市住更局 —— 区级体检指标体系 新增表单抽屉（原型图2 第一步：基本信息）

  体检片区为下拉选择，数据来自前期规划模块片区列表（esp 地图，约 182 个）：
  选中后自动带出 所属行政区/功能定位/片区面积（公顷→平方公里），并存片区唯一号到
  areaCode 实现与前期规划片区的关联（areaName 存片区名称）。
  保存成功后自动调用 applyStdIndicator 代入 17 项必选指标项（基础运行评估全部），
  用户随后在编辑页多选添加功能发展类可选指标（原型图3）。
  编辑入口不走本抽屉 —— 列表「编辑」直接下钻 RESTful 编辑页。
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
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorSystemForm">
  import { computed, onMounted, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type {
    EspAreaOption,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    districtItemApplyStd,
    districtSetSave,
    fetchEspAreas,
    stdIndicatorList,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    YEAR_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import { DISTRICTS, toOptions } from '@jeesite/urban-health-check/api/urban-health-check/common';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: '新增 · 片区体检指标体系',
  }));

  /** 前期规划片区列表（下拉数据源） */
  const espAreas = ref<EspAreaOption[]>([]);

  /** esp 行政区长写法 → 标准行政区短名（如「武汉经开区」无法映射时留空手选） */
  function normalizeDistrict(dist: string): string | undefined {
    return DISTRICTS.find((d) => dist.includes(d));
  }

  onMounted(async () => {
    try {
      espAreas.value = await fetchEspAreas();
    } catch (e: any) {
      showMessage(e?.message || '前期规划片区列表加载失败，可稍后重试', 'error');
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
      helpMessage: '片区来自前期规划模块；同年同片区仅允许一套指标体系',
    },
    {
      label: '片区功能定位',
      field: 'funcOrientation',
      component: 'Input',
      componentProps: { maxlength: 100 },
      helpMessage: '选择体检片区后自动带出，可修改',
    },
    {
      label: '片区面积（平方公里）',
      field: 'areaSizeKm2',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, style: 'width: 100%' },
    },
    {
      label: '常住人口数',
      field: 'residentPopulation',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0, style: 'width: 100%' },
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
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, showCount: true, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 150,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 24, md: 24, lg: 24 },
  });

  /** 选中前期规划片区 → 带出行政区/功能定位/面积，并记片区唯一号 */
  const selectedAreaCode = ref('');
  function handleAreaChange(name?: string) {
    selectedAreaCode.value = '';
    const area = espAreas.value.find((a) => a.name === name);
    if (!area) return;
    selectedAreaCode.value = area.uid;
    const district = normalizeDistrict(area.district);
    const areaHa = typeof area.areaHa === 'number' ? area.areaHa : parseFloat(String(area.areaHa ?? ''));
    setFieldsValue({
      ...(district ? { district } : {}),
      funcOrientation: area.funcType || undefined,
      areaSizeKm2: Number.isFinite(areaHa) && areaHa > 0 ? Math.round(areaHa * 0.01 * 100) / 100 : undefined,
    });
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
      // 保存体系 → 自动代入 17 项必选指标项（基础运行评估全部）
      const { id, sysNo } = await districtSetSave({
        setYear: data.setYear,
        district: data.district,
        areaCode: selectedAreaCode.value || undefined,
        areaName: data.areaName,
        funcOrientation: data.funcOrientation,
        areaSizeKm2: data.areaSizeKm2,
        residentPopulation: data.residentPopulation,
        fillUnit: data.fillUnit,
        responsibleUser: data.responsibleUser,
        contactPhone: data.contactPhone,
        remarks: data.remarks,
      });
      let requiredCount = 0;
      try {
        const stdList = await stdIndicatorList();
        const required = stdList.filter((s) => s.isRequired === 1);
        requiredCount = required.length;
        if (required.length > 0) {
          await districtItemApplyStd(id, required.map((s) => ({ stdId: s.id! })));
        }
      } catch (e: any) {
        showMessage(`体系已保存（${sysNo}），但必选指标项代入失败：${e?.message || e}`, 'error');
        emit('success', data);
        return;
      }
      showMessage(`保存成功（${sysNo}），已自动代入 ${requiredCount} 项必选指标项`);
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
