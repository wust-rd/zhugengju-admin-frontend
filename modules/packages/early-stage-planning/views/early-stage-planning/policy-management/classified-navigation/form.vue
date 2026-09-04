<!--
  市住更局 —— 政策 新增/编辑/查看 表单抽屉(政策分类导航页)

  组件格式对齐 urban-health-check 各 form.vue:
   - BasicDrawer + useDrawerInner + BasicForm(FormSchema);
   - 查看模式:表单 disabled + 抽屉隐藏底部按钮;
   - force-render 且不绑定响应式 :show-footer,打开方在 openDrawer 前预设 showFooter(见 list.vue 头注释)。
  数据走 kd_server 接口(dev 经 /policy_api 代理):
   - 编辑/查看打开时拉取详情 /api/v1/policies/{id}(含版本变更记录);
   - 保存时先上传文件(POST /api/v1/files)再 POST/PUT /api/v1/policies。
  抽屉体在表单下方另有「上传文件」与「版本变更记录」只读表(对齐原型 policy.html 表单)。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />

    <!-- 上传文件 -->
    <div class="mt-2">
      <div class="mb-1 text-14px"> 上传文件 <span class="text-red-500">*</span> </div>
      <div class="rounded-lg border border-dashed border-blue-300 p-4" :class="isView ? 'opacity-60' : ''">
        <div class="text-13px text-gray-500">支持 pdf、word、jpg、png 格式</div>
        <Upload
          v-if="!isView"
          :before-upload="handleSelectFile"
          :max-count="1"
          :show-upload-list="false"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        >
          <a-button class="mt-2"> 选择文件 </a-button>
        </Upload>
        <div class="mt-2 text-14px" :class="fileName ? '' : 'text-gray-400'">
          {{ fileName || '未选择文件' }}
        </div>
      </div>
    </div>

    <!-- 版本变更记录 -->
    <h3 class="mt-4 mb-2 text-15px font-semibold">版本变更记录</h3>
    <Table size="small" :columns="versionColumns" :data-source="versions" :pagination="false" :scroll="{ x: 600 }">
      <template #emptyText>
        <span class="text-gray-400">暂无</span>
      </template>
    </Table>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningPolicyManagementClassifiedNavigationForm">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Table, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type {
    Policy,
    PolicyVersion,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import {
    fetchDicts,
    policyInfo,
    policySave,
    uploadPolicyFile,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const fileName = ref('');
  const versions = ref<PolicyVersion[]>([]);
  const record = ref<Policy & { isNewRecord?: boolean }>({} as Policy & { isNewRecord?: boolean });

  /** 字典(接口拉取):Select 选项经 componentProps 函数动态读取 */
  const dicts = ref<Record<string, { label: string; value: string }[]>>({});

  onMounted(async () => {
    dicts.value = await fetchDicts();
  });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: isView.value ? '查看政策' : record.value.isNewRecord ? '新增政策' : '编辑政策',
  }));

  /** 版本变更记录表列(只读) */
  const versionColumns = [
    { title: '文件版本', dataIndex: 'fileVersion', width: 300 },
    { title: '变更日期', dataIndex: 'changeDate', width: 140 },
    { title: '变更部门', dataIndex: 'changeDept', width: 120 },
    { title: '操作人', dataIndex: 'operator', width: 120 },
  ];

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '标题',
      field: 'title',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ type: 'string', required: true, message: '请输入标题' }],
    },
    {
      label: '文号',
      field: 'docNo',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ type: 'string', required: true, message: '请输入文号' }],
    },
    {
      label: '政策层级',
      field: 'policyLevel',
      component: 'Select',
      componentProps: () => ({ options: dicts.value.policy_level || [], allowClear: true }),
    },
    {
      label: '政策类型',
      field: 'policyType',
      component: 'Select',
      componentProps: () => ({ options: dicts.value.policy_type || [], allowClear: true }),
    },
    {
      label: '业务领域',
      field: 'businessArea',
      component: 'Select',
      componentProps: () => ({ options: dicts.value.business_area || [], allowClear: true }),
    },
    {
      label: '发布日期',
      field: 'publishDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
      rules: [{ type: 'string', required: true, message: '请选择发布日期' }],
    },
    {
      label: '发布单位',
      field: 'sourceOrg',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入' },
    },
    {
      label: '废止时间',
      field: 'abolishDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%' },
    },
    {
      label: '时效状态',
      field: 'timeStatus',
      component: 'Select',
      componentProps: () => ({ options: dicts.value.time_status || [], allowClear: true }),
    },
    {
      label: '关键词标签',
      field: 'keywords',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '多个用分号分隔' },
    },
    {
      label: '适用片区/项目类型标签',
      field: 'areaTags',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '多个用分号分隔' },
    },
    {
      label: '适用阶段标签',
      field: 'phaseTags',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '多个用分号分隔' },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 170,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Policy;
    record.value.isNewRecord = data?.isNewRecord ?? data?.code == null;
    fileName.value = '';
    versions.value = [];
    selectedFile.value = null;

    // 编辑/查看:拉详情(含版本变更记录)
    if (data?.code) {
      record.value = await policyInfo(data.code);
      record.value.isNewRecord = false;
      versions.value = record.value.versions || [];
      fileName.value = record.value.fileName || '';
    }

    await setFieldsValue({
      title: record.value.title ?? '',
      docNo: record.value.docNo ?? '',
      policyLevel: record.value.policyLevel,
      policyType: record.value.policyType,
      businessArea: record.value.businessArea,
      publishDate: record.value.publishDate ?? '',
      sourceOrg: record.value.sourceOrg ?? '',
      abolishDate: record.value.abolishDate || undefined,
      timeStatus: record.value.timeStatus,
      keywords: record.value.keywords ?? '',
      areaTags: record.value.areaTags ?? '',
      phaseTags: record.value.phaseTags ?? '',
    });
    await setProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  /** 新选的本地文件(保存时上传;仅记录文件名用于展示) */
  const selectedFile = ref<File | null>(null);

  function handleSelectFile(file: File) {
    selectedFile.value = file;
    fileName.value = file.name;
    return false;
  }

  async function handleSubmit() {
    if (isView.value) {
      closeDrawer();
      return;
    }
    if (!fileName.value) {
      showMessage('请上传文件');
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
    setDrawerProps({ loading: true, showFooter: true });
    try {
      let fileId = record.value.fileId;
      let fileUrl = record.value.fileUrl;
      if (selectedFile.value) {
        const uploaded = await uploadPolicyFile(selectedFile.value);
        fileId = uploaded.fileId;
        fileUrl = uploaded.fileUrl;
      }
      await policySave({ ...data, fileId, fileUrl }, record.value.code);
      showMessage('已保存（待提交的政策需点列表「提交」后才会进入知识库）');
      setTimeout(closeDrawer);
      emit('success');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
