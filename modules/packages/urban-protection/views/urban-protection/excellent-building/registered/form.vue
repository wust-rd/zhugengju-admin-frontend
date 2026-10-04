<!--
  市住更局 —— 名城保护 · 在册优保建筑新增抽屉

  对齐老系统「新增优保建筑」：所在行政区*/建筑原名称*/建筑现使用名称*/建筑坐落*/建成年份*/
  建筑面积(平方米)*/产权人*/保护等级（默认一级）/公布批次*/公布时间，单列表单。
  建成年份/公布时间不做格式限制（存量为自由文本，如「1937年前」）；底部按钮：新增=保存/关闭，修改=确定/取消。
  保存走 excellent/save（id 空=新增 status='1' 在册，带 id=修改不动 status），成功后 emit success 由列表刷新。
  打开方式：openDrawer(false, data) 只传数据，回调末尾 setDrawerProps({ open: true }) 掀开（防闪烁）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    :title="isNew ? '新增优保建筑' : '修改优保建筑'"
    width="600px"
    force-render
    :showFooter="true"
    :okText="isNew ? '保存' : '确定'"
    :cancelText="isNew ? '关闭' : '取消'"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>

<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRegisteredForm">
  import { ref } from 'vue';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { fetchExcellentDetail, fetchExcellentDict, saveExcellent, ExcellentRow } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import { batchLabel } from '../../shared/excellent-format';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const saving = ref(false);
  const isNew = ref(true);
  const editId = ref<string | undefined>();

  const districtOptions = ref<{ label: string; value: string }[]>([]);
  /** 公布批次下拉：全部 + 库内批次 + 第十五批（库内暂无，老系统要求提供） */
  const batchOptions = ref<{ label: string; value: string }[]>([
    { label: '全部', value: '' },
    { label: '第十五批', value: '15' },
  ]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = [
      { label: '全部', value: '' },
      ...dict.districts.map((d) => ({ label: d, value: d })),
    ];
    batchOptions.value = [
      { label: '全部', value: '' },
      ...dict.batches.map((b) => ({ label: batchLabel(String(b)), value: String(b) })),
      { label: '第十五批', value: '15' },
    ];
  });

  const inputFormSchemas: FormSchema[] = [
    {
      label: '所在行政区',
      field: 'xzqName',
      component: 'Select',
      componentProps: { options: districtOptions, allowClear: true, showSearch: true, placeholder: '请选择' },
      rules: [{ required: true, message: '请选择所在行政区' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑原名称',
      field: 'jzOldName',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入建筑原名称' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑现使用名称',
      field: 'jzNowName',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入建筑现使用名称' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑坐落',
      field: 'jzLoccation',
      component: 'Input',
      componentProps: { maxlength: 300, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入建筑坐落' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建成年份',
      field: 'buildYear',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入四位数字,例如2014' },
      // 存量数据为自由文本（如「1937年前」「1949-1966」），不做四位数字限制
      rules: [{ required: true, message: '请输入建成年份' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑面积(平方米)',
      field: 'jzArar',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入建筑面积' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '产权人',
      field: 'cqr',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '请输入' },
      rules: [{ required: true, message: '请输入产权人' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '保护等级',
      field: 'protectLeve',
      component: 'Select',
      defaultValue: '1',
      componentProps: {
        options: [
          { label: '一级', value: '1' },
          { label: '二级', value: '2' },
        ],
        allowClear: true,
        placeholder: '请选择',
      },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '公布批次',
      field: 'publishPc',
      component: 'Select',
      componentProps: { options: batchOptions, allowClear: true, placeholder: '请选择' },
      rules: [{ required: true, message: '请选择公布批次' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '公布时间',
      field: 'publishTime',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '请输入四位数字,例如2014' },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 140,
    baseColProps: { md: 24, lg: 24 },
    schemas: inputFormSchemas,
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data) => {
    setDrawerProps({ open: false });
    await resetFields();
    const id = data?.id as string | undefined;
    isNew.value = !id;
    editId.value = id;
    if (id) {
      const detail = await fetchExcellentDetail(id);
      await setFieldsValue({
        xzqName: detail.xzqName || undefined,
        jzOldName: detail.jzOldName,
        jzNowName: detail.jzNowName,
        jzLoccation: detail.jzLoccation,
        buildYear: detail.buildYear,
        jzArar: detail.jzArar,
        cqr: detail.cqr,
        protectLeve: detail.protectLeve || undefined,
        publishPc: detail.publishPc || undefined,
        publishTime: detail.publishTime,
      });
    }
    setDrawerProps({ open: true });
  });

  async function handleSubmit() {
    try {
      if (saving.value) return;
      const values = await validate();
      saving.value = true;
      setDrawerProps({ confirmLoading: true });
      await saveExcellent({
        ...values,
        id: isNew.value ? undefined : editId.value,
        // 新增=在册；修改不动 status（拟优保行不被转正）
        status: isNew.value ? '1' : undefined,
      } as Partial<ExcellentRow> & { status?: string });
      showMessage(isNew.value ? '新增成功' : '保存成功');
      closeDrawer();
      emit('success');
    } catch (e) {
      if (e instanceof Error && e.message) {
        showMessage(e.message, 'error');
      }
    } finally {
      saving.value = false;
      setDrawerProps({ confirmLoading: false });
    }
  }
</script>
