<!--
  市住更局 —— 名城保护 · 优保建筑表单（新增 / 编辑抽屉）

  字段对齐老系统「在册优保建筑新增/修改」表单 + 详情页全量字段：
  基本信息 / 责任主体信息 / 介绍文本 三段；「拟优保」开关写 STATUS='0'，
  「责任书已上传」开关写 SFSCZRZ='1'（责任书原件上传待文件存储接入后再做）。
  编辑时先回填后掀开（防闪烁），保存成功后 emit success 由列表刷新。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="70%" force-render @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingManagementForm">
  import { computed, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchExcellentDetail,
    fetchExcellentDict,
    saveExcellent,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isNew = ref(true);
  const editId = ref('');
  /** 保存中标记（防重复提交） */
  const saving = ref(false);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:bank-outlined',
    value: isNew.value ? '新增优保建筑' : '编辑优保建筑',
  }));

  /** 区下拉（库内实际区名，允许手输兜底） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  const inputFormSchemas: FormSchema[] = [
    { label: '基本信息', field: 'basicInfo', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '建筑原名称',
      field: 'jzOldName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入建筑原名称' }],
    },
    { label: '建筑现使用名称', field: 'jzNowName', component: 'Input', componentProps: { maxlength: 200 } },
    {
      label: '建筑坐落',
      field: 'jzLoccation',
      component: 'Input',
      componentProps: { maxlength: 300 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建成年份',
      field: 'buildYear',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '如：1931 / 二十世纪二十年代' },
    },
    { label: '建筑面积(平方米)', field: 'jzArar', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '产权人', field: 'cqr', component: 'Input', componentProps: { maxlength: 100 } },
    {
      label: '保护等级',
      field: 'protectLeve',
      component: 'Select',
      componentProps: {
        options: [
          { label: '一级', value: '1' },
          { label: '二级', value: '2' },
        ],
        allowClear: true,
      },
    },
    {
      label: '公布批次',
      field: 'publishPc',
      component: 'Select',
      componentProps: { options: [], allowClear: true },
    },
    {
      label: '公布时间',
      field: 'publishTime',
      component: 'Input',
      componentProps: { maxlength: 20, placeholder: '公布年份，如 2023' },
    },
    {
      label: '所在行政区',
      field: 'xzqName',
      component: 'Select',
      componentProps: { options: districtOptions, allowClear: true, showSearch: true },
    },
    { label: '所在街道', field: 'jiedaoName', component: 'Input', componentProps: { maxlength: 100 } },
    { label: '所在社区', field: 'szSq', component: 'Input', componentProps: { maxlength: 100 } },
    { label: '文物级别', field: 'relicLevel', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '地标码', field: 'dbm', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '新地标码', field: 'newDbm', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '坐标X(纬度)', field: 'locationX', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '坐标Y(经度)', field: 'locationY', component: 'Input', componentProps: { maxlength: 50 } },
    {
      label: '拟优保建筑',
      field: 'proposed',
      component: 'Switch',
      componentProps: { checkedChildren: '拟优保', unCheckedChildren: '在册' },
      colProps: { md: 12, lg: 8 },
    },
    {
      label: '责任书已上传',
      field: 'sfScZrz',
      component: 'Switch',
      colProps: { md: 12, lg: 8 },
    },
    { label: '责任主体信息', field: 'respInfo', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '责任工作部门', field: 'zrGzBm', component: 'Input', componentProps: { maxlength: 100 } },
    { label: '责任部门负责人', field: 'zrGzBmFzr', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '责任部门电话', field: 'zrGzBmTel', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '监管负责人', field: 'jgFzr', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '社区巡查负责人', field: 'sqXcFzr', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '社区巡查负责人电话', field: 'sqXcFzrTel', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '业主', field: 'zyz', component: 'Input', componentProps: { maxlength: 100 } },
    { label: '业主电话', field: 'zyzTel', component: 'Input', componentProps: { maxlength: 50 } },
    { label: '介绍文本', field: 'textInfo', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '简介',
      field: 'js',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 2000, showCount: true },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '基本信息',
      field: 'jbxx',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 4000 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '建筑详情',
      field: 'buildingDet',
      component: 'InputTextArea',
      componentProps: { rows: 4, maxlength: 8000 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '英文介绍',
      field: 'englishIntr',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 8000 },
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, resetFields, validate }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { md: 12, lg: 8 },
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: Recordable) => {
    // 先回填后掀开：动画期间零翻转
    setDrawerProps({ open: false, confirmLoading: false });
    await resetFields();
    isNew.value = !!data._isNew;
    editId.value = isNew.value ? '' : String(data.id ?? '');

    // 公布批次选项（第N批）
    const dict = await fetchExcellentDict();
    const batchField = inputFormSchemas.find((item) => item.field === 'publishPc');
    if (batchField && batchField.componentProps) {
      (batchField.componentProps as Recordable).options = dict.batches.map((n) => ({
        label: `第${cnNumber(n)}批`,
        value: String(n),
      }));
    }

    if (isNew.value) {
      await setFieldsValue({ proposed: false, sfScZrz: false });
    } else {
      const row: ExcellentRow = await fetchExcellentDetail(editId.value);
      await setFieldsValue({
        jzOldName: row.jzOldName,
        jzNowName: row.jzNowName,
        jzLoccation: row.jzLoccation,
        buildYear: row.buildYear,
        jzArar: row.jzArar,
        cqr: row.cqr,
        protectLeve: row.protectLeve || undefined,
        publishPc: row.publishPc || undefined,
        publishTime: row.publishTime,
        xzqName: row.xzqName || undefined,
        jiedaoName: row.jiedaoName,
        szSq: row.szSq,
        relicLevel: row.relicLevel,
        dbm: row.dbm,
        newDbm: row.newDbm,
        locationX: row.locationX,
        locationY: row.locationY,
        proposed: row.proposed,
        sfScZrz: row.sfScZrz,
        zrGzBm: row.zrGzBm,
        zrGzBmFzr: row.zrGzBmFzr,
        zrGzBmTel: row.zrGzBmTel,
        jgFzr: row.jgFzr,
        sqXcFzr: row.sqXcFzr,
        sqXcFzrTel: row.sqXcFzrTel,
        zyz: row.zyz,
        zyzTel: row.zyzTel,
        js: row.js,
        jbxx: row.jbxx,
        buildingDet: row.buildingDet,
        englishIntr: row.englishIntr,
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
      const { proposed, sfScZrz, ...rest } = values;
      await saveExcellent({
        ...rest,
        id: isNew.value ? undefined : editId.value,
        status: proposed ? '0' : '1',
        sfScZrz: sfScZrz ? '1' : null,
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

  /** 批次数字转中文（1~14） */
  function cnNumber(n: number): string {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四'];
    return digits[n] ?? String(n);
  }
</script>
