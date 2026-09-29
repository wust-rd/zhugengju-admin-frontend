<!--
  市住更局 —— 指标 新增/编辑/查看 表单抽屉

  组件格式对齐 indicator-system/form.vue:
   - BasicDrawer + useDrawerInner + BasicForm(FormSchema);
   - 查看模式:表单 disabled + 抽屉隐藏底部按钮。
  接口已接入：indicatorSave（setId 归属体系主键，列表/新增时由父级传入）。
  指标单位/指标来源/数据来源 为后端表非空列，前端同步设为必填。
  指标解释(itemExplain)非必填文本域；资料清单(materialList)为动态多条(≤20 条,
  仅资料名称——必交/选交后端默认选交 isRequired=0,原型未画该标记经确认不做),
  随指标项整单提交(后端先物理删旧清单再重插);编辑回显由父级从体系详情 itemList
  带出 materialList(指标项分页接口不返回该字段)。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
    <!-- 资料清单:动态多条,不进 BasicForm schemas(自绘管理增删行) -->
    <div class="mt-2 px-1">
      <div class="mb-2 flex items-center">
        <span class="mr-3 font-medium">资料清单</span>
        <a-button v-if="!isReadonly" size="small" type="primary" @click="handleAddMaterial">
          <Icon icon="i-fluent:add-12-filled" /> 添加
        </a-button>
        <span class="ml-3 text-xs text-gray-400">最多 {{ MATERIAL_LIMIT }} 条</span>
      </div>
      <div v-for="(m, idx) in materials" :key="m.key" class="mb-3">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-gray-600">资料清单{{ idx + 1 }}</span>
          <a-button v-if="!isReadonly" type="link" size="small" danger @click="materials.splice(idx, 1)">
            删除
          </a-button>
        </div>
        <a-textarea
          v-model:value="m.name"
          :disabled="isReadonly"
          :rows="2"
          :maxlength="200"
          show-count
          placeholder="请输入资料名称，如：混凝土结构构件裂缝检测报告"
        />
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="UhcSharedIndicatorSystemIdForm">
  import { computed, ref, unref } from 'vue';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorSave } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    /** 所属体系已提交时整个表单只读（父级传入） */
    readOnly: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<Indicator & { isNewRecord?: boolean }>({} as Indicator & { isNewRecord?: boolean });

  /** 查看模式或体系已提交时,表单与资料清单整块只读 */
  const isReadonly = computed(() => isView.value || props.readOnly);

  /** 资料清单单条上限(后端 MATERIAL_LIMIT 同口径) */
  const MATERIAL_LIMIT = 20;

  /** 资料清单行(key 仅为 v-for 稳定;name 提交时映射 materialName;id 编辑回显携带,后端整单替换不依赖) */
  type MaterialRow = { key: number; id?: string; name: string };
  const materials = ref<MaterialRow[]>([]);
  let materialKey = 0;

  function handleAddMaterial() {
    if (materials.value.length >= MATERIAL_LIMIT) {
      showMessage(`资料清单最多 ${MATERIAL_LIMIT} 条`);
      return;
    }
    materials.value.push({ key: ++materialKey, name: '' });
  }

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看指标' : record.value.isNewRecord ? '新增指标' : '编辑指标',
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '维度信息',
      field: 'dimInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
    {
      label: '一级维度',
      field: 'dim1',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入一级维度' }],
    },
    {
      label: '二级维度',
      field: 'dim2',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入二级维度' }],
    },
    {
      label: '三级维度',
      field: 'dim3',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '可空:指标直接挂二级维度时留空',
    },
    {
      label: '指标信息',
      field: 'indicatorInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
    {
      label: '指标项名称',
      field: 'indicatorName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入指标项名称' }],
    },
    {
      label: '指标单位',
      field: 'unit',
      component: 'Input',
      componentProps: { maxlength: 20 },
      rules: [{ required: true, message: '请输入指标单位' }],
    },
    {
      label: '指标来源',
      field: 'indicatorSource',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入指标来源' }],
    },
    {
      label: '数据来源',
      field: 'dataSource',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入数据来源' }],
    },
    {
      label: '责任部门',
      field: 'responsibleDept',
      component: 'Input',
      componentProps: { maxlength: 50 },
      helpMessage: '无责任部门时填 /',
    },
    {
      label: '指标解释',
      field: 'itemExplain',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3, placeholder: '请输入指标解释' },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
    {
      label: '备注',
      field: 'remarks',
      component: 'InputTextArea',
      componentProps: { maxlength: 500, rows: 3 },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Indicator;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    // 资料清单回显:父级编辑/查看时从体系详情 itemList 带出;新增为空
    materials.value = ((data?.materialList as Indicator['materialList']) ?? []).map((m) => ({
      key: ++materialKey,
      id: m?.id,
      name: m?.materialName ?? '',
    }));
    await setFieldsValue({
      dim1: record.value.dim1 ?? '',
      dim2: record.value.dim2 ?? '',
      dim3: record.value.dim3 ?? '',
      indicatorName: record.value.indicatorName ?? '',
      unit: record.value.unit ?? '',
      indicatorSource: record.value.indicatorSource ?? '',
      dataSource: record.value.dataSource ?? '',
      responsibleDept: record.value.responsibleDept ?? '',
      itemExplain: record.value.itemExplain ?? '',
      remarks: record.value.remarks ?? '',
    });
    await setProps({ disabled: isView.value || props.readOnly });
    setDrawerProps({ loading: false });
  });

  async function handleSubmit() {
    if (isView.value) {
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
    // 资料清单:存在已填行时不允许夹带空行;全部为空视为清空清单(整单替换语义)
    const filled = materials.value.filter((m) => m.name.trim());
    if (filled.length < materials.value.length) {
      showMessage('存在未填写名称的资料清单，请补全或删除空行');
      return;
    }
    setDrawerProps({ loading: true });
    try {
      await indicatorSave({
        ...data,
        id: record.value.isNewRecord ? undefined : record.value.id,
        setId: record.value.setId,
        materialList: filled.map((m) => ({ id: m.id, materialName: m.name.trim(), isRequired: 0 })),
      });
      showMessage('保存成功');
      setTimeout(closeDrawer);
      emit('success', data);
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
