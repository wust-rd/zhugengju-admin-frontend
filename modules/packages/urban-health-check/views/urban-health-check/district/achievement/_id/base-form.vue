<!--
  市住更局 —— 区级体检成果基础资料 新增/编辑/查看 抽屉（含多附件维护）

  字段：资料分组/文档名称 + 附件列表（上传走 /district/file/upload，保存时 fileList
  整批覆盖：新传附件带 filePath，已有附件保留原 id/filePath）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="45%" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />

    <!-- 附件列表 -->
    <div class="px-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-base font-medium">附件（{{ files.length }} 个）</span>
        <Upload v-if="!formDisabled" :show-upload-list="false" multiple :before-upload="handleUpload">
          <a-button size="small" type="primary">
            <Icon icon="ant-design:upload-outlined" /> 上传附件
          </a-button>
        </Upload>
      </div>
      <div
        v-for="(f, idx) in files"
        :key="f.id ?? f.filePath ?? idx"
        class="flex items-center rounded border px-3 py-2 mb-2"
      >
        <Icon icon="ant-design:paper-clip-outlined" class="mr-2 shrink-0" />
        <a class="truncate flex-1" :title="f.fileName" @click="handleDownload(f)">{{ f.fileName }}</a>
        <span class="ml-2 text-xs shrink-0" style="color: #999">{{ formatSize(f.fileSize) }}</span>
        <a-button v-if="!formDisabled" type="link" size="small" danger @click="files.splice(idx, 1)">移除</a-button>
      </div>
      <div v-if="!files.length" class="text-gray-400">暂无附件</div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictAchievementBaseForm">
  import { computed, ref, unref } from 'vue';
  import { Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type {
    DistrictAchievementBase,
    DistrictAchievementBaseFile,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import {
    districtAchievementBaseFileDownload,
    districtAchievementBaseSave,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-achievement';
  import { checkFileUpload } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-result';

  const emit = defineEmits(['success', 'register']);

  const props = defineProps({
    readOnly: { type: Boolean, default: false },
  });

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const isView = ref(false);
  const record = ref<DistrictAchievementBase & { isNewRecord?: boolean }>(
    {} as DistrictAchievementBase & { isNewRecord?: boolean },
  );
  /** 附件列表（编辑起点=后端 fileList，上传/移除后整批回传） */
  const files = ref<DistrictAchievementBaseFile[]>([]);

  const formDisabled = computed(() => isView.value || props.readOnly);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: `${isView.value ? '查看' : record.value.isNewRecord ? '新增' : '编辑'} · 基础资料`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '基本信息',
      field: 'basicInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '资料分组',
      field: 'groupName',
      component: 'Input',
      componentProps: { maxlength: 100 },
      rules: [{ required: true, message: '请输入资料分组' }],
    },
    {
      label: '文档名称',
      field: 'docName',
      component: 'Input',
      componentProps: { maxlength: 200 },
      rules: [{ required: true, message: '请输入文档名称' }],
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
    record.value = (data || {}) as DistrictAchievementBase;
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    files.value = (record.value.fileList ?? []).map((f) => ({ ...f }));
    await setFieldsValue({
      groupName: record.value.groupName ?? '',
      docName: record.value.docName ?? '',
    });
    await setProps({ disabled: formDisabled.value });
    setDrawerProps({ loading: false });
  });

  async function handleUpload(file: File) {
    try {
      const uploaded = await checkFileUpload(file);
      files.value.push({ fileName: uploaded.name, filePath: uploaded.url });
      showMessage('上传成功');
    } catch (e: any) {
      showMessage(e?.message || '上传失败', 'error');
    }
    return false;
  }

  function formatSize(size?: number) {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  async function handleDownload(f: DistrictAchievementBaseFile) {
    if (f.filePath) {
      await districtAchievementBaseFileDownload(f.filePath, f.fileName ?? '附件');
    }
  }

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
    // 后端要求基础资料至少携带一条附件
    if (files.value.length === 0) {
      showMessage('请至少上传一个附件');
      return;
    }
    setDrawerProps({ loading: true });
    try {
      await districtAchievementBaseSave({
        id: record.value.id,
        catalogId: record.value.catalogId!,
        groupName: data.groupName,
        docName: data.docName,
        fileList: files.value.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          filePath: f.filePath,
          sortNo: f.sortNo,
        })),
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
