<!--
  ifco —— 提示/督办下发表单抽屉（市级端 · 新增提示/新增督办/下发 待下发行）

  标题 = 新增提示/新增督办/下发 · 下发编号（编号系统生成恒只读）。
  字段：通知类型（由入口按钮带入，可改）/ 对应行政区 / 督查月份 / 下发时间 /
  处理截止日期 / 下发部门（市住更局恒只读）/ 联系人 / 联系电话 / 具体问题 /
  涉及项目（多选，保存时按项目所属片区归组为涉及片区和项目的处理情况）。
  底部按钮：取消 / 暂存（状态=待下发，仅市级列表可见）/ 下发（状态=已下发，
  进入填报端与区级端处理流程）。当前后端尚未介入：保存直接改内存
  （api/ifco/impl-progress 的 SUPERVISES，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
    </template>

    <BasicForm @register="registerForm" />

    <!-- 底部按钮：取消 / 暂存（待下发）/ 下发（已下发） -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> 取消 </a-button>
      <a-button class="mr-2" @click="handleSave('待下发')"> 暂存 </a-button>
      <a-button type="primary" @click="handleSave('已下发')"> 下发 </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressUrbanDispatchForm">
  import { computed, ref } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { DISTRICTS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    SCHEDULES,
    SUPERVISES,
    SUPERVISE_TYPE_OPTIONS,
    nextDispatchNo,
    type DispatchStatus,
    type SuperviseItem,
    type SuperviseType,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isNew = ref(true);
  /** 通知类型（新增时由入口按钮带入：工具栏「新增提示」/「新增督办」） */
  const presetType = ref<SuperviseType>('督办');
  const record = ref<Partial<SuperviseItem>>({});

  const title = computed(() =>
    isNew.value ? `新增${presetType.value === '督办' ? '督办' : '提示'}` : `下发 · ${record.value.dispatchNo ?? ''}`,
  );

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const typeOptions = SUPERVISE_TYPE_OPTIONS.map((name) => ({
    label: name === '督办' ? '督办' : '工作提示',
    value: name,
  }));
  /** 涉及项目候选（在库项目全集） */
  const projectOptions = SCHEDULES.map((item) => ({ label: item.projectName, value: item.projectName }));

  const schemas: FormSchema[] = [
    { label: '下发信息', field: 'dispatchGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '下发编号',
      field: 'dispatchNo',
      component: 'Input',
      dynamicDisabled: () => true,
      componentProps: { placeholder: '保存后系统自动生成' },
    },
    {
      label: '通知类型',
      field: 'superviseType',
      component: 'RadioGroup',
      componentProps: { options: typeOptions },
      rules: [{ required: true, message: '请选择通知类型' }],
    },
    {
      label: '对应行政区',
      field: 'district',
      component: 'Select',
      componentProps: { options: districtOptions, allowClear: true, placeholder: '请选择对应行政区' },
      rules: [{ required: true, message: '请选择对应行政区' }],
    },
    {
      label: '督查月份',
      field: 'inspectMonth',
      component: 'MonthPicker',
      componentProps: { valueFormat: 'YYYY-MM', style: 'width: 100%', placeholder: '请选择督查月份' },
      rules: [{ required: true, message: '请选择督查月份' }],
    },
    {
      label: '下发时间',
      field: 'dispatchDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择下发时间' },
      rules: [{ required: true, message: '请选择下发时间' }],
    },
    {
      label: '处理截止日期',
      field: 'deadline',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择处理截止日期' },
      rules: [{ required: true, message: '请选择处理截止日期' }],
    },
    {
      label: '下发部门',
      field: 'dispatchOrg',
      component: 'Input',
      dynamicDisabled: () => true,
    },
    {
      label: '联系人',
      field: 'contactPerson',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '请输入联系人' },
    },
    {
      label: '联系电话',
      field: 'contactPhone',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '请输入联系电话' },
    },
    {
      label: '具体问题',
      field: 'problem',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 500, placeholder: '请输入具体问题' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入具体问题' }],
    },
    {
      label: '涉及项目',
      field: 'involvedProjects',
      component: 'Select',
      componentProps: {
        options: projectOptions,
        mode: 'multiple',
        allowClear: true,
        placeholder: '请选择涉及项目（可多选）',
      },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, validate, resetFields, getFieldsValue }] = useForm({
    labelWidth: 140,
    schemas,
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isNew.value = !!data?.isNewRecord;
    presetType.value = (data?.superviseType as SuperviseType) ?? '督办';
    record.value = (data || {}) as Partial<SuperviseItem>;
    await setFieldsValue({
      dispatchNo: isNew.value ? nextDispatchNo(presetType.value) : (record.value.dispatchNo ?? ''),
      superviseType: isNew.value ? presetType.value : record.value.superviseType,
      district: record.value.district ?? undefined,
      inspectMonth: record.value.inspectMonth ?? undefined,
      dispatchDate: record.value.dispatchDate || new Date().toISOString().slice(0, 10),
      deadline: record.value.deadline ?? undefined,
      dispatchOrg: record.value.dispatchOrg ?? '市住更局',
      contactPerson: record.value.contactPerson ?? '',
      contactPhone: record.value.contactPhone ?? '',
      problem: record.value.problem ?? '',
      involvedProjects: (record.value.areaItems ?? []).flatMap((area) =>
        area.projects.map((project) => project.projectName),
      ),
    });
    setDrawerProps({ loading: false });
  });

  /** 暂存（待下发）/ 下发（已下发）：写回内存（新行 push，待下行原位更新） */
  async function handleSave(nextStatus: DispatchStatus) {
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const involved: string[] = values.involvedProjects ?? [];
    const item: SuperviseItem = {
      dispatchNo: isNew.value ? nextDispatchNo(values.superviseType) : (record.value.dispatchNo as string),
      superviseType: values.superviseType,
      district: String(values.district ?? ''),
      dispatchStatus: nextStatus,
      inspectMonth: String(values.inspectMonth ?? ''),
      dispatchDate: String(values.dispatchDate ?? ''),
      deadline: String(values.deadline ?? ''),
      dispatchOrg: String(values.dispatchOrg ?? '市住更局'),
      problem: String(values.problem ?? ''),
      dispatchFile: '督办单.pdf',
      contactPerson: String(values.contactPerson ?? ''),
      contactPhone: String(values.contactPhone ?? ''),
      districtHandleStatus: '待处理',
      districtHandleDate: '',
      districtHandleDesc: '',
      districtHandleFileList: [],
      // 涉及项目按所属片区归组（未匹配到片区的项目归「其他」）
      areaItems: Object.values(
        involved.reduce<
          Record<string, { area: string; projects: { projectName: string; problem: string; foundProblem: string }[] }>
        >((grouped, projectName) => {
          const area = SCHEDULES.find((item) => item.projectName === projectName)?.renewalAreaName || '其他';
          (grouped[area] ??= { area, projects: [] }).projects.push({
            projectName,
            problem: String(values.problem ?? ''),
            foundProblem: '是',
          });
          return grouped;
        }, {}),
      ),
    };
    if (isNew.value) {
      SUPERVISES.push(item);
    } else {
      const index = SUPERVISES.findIndex((row) => row.dispatchNo === record.value.dispatchNo);
      if (index >= 0) SUPERVISES[index] = item;
    }
    showMessage(nextStatus === '待下发' ? '暂存成功（待下发）' : '下发成功，已进入填报端与区级端处理流程');
    closeDrawer();
    emit('success', item);
  }
</script>
