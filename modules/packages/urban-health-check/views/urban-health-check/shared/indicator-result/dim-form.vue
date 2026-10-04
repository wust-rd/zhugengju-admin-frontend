<!--
  市住更局 —— 一级维度图层信息 新增/编辑 表单抽屉（dim-table 子组件）

  接口已接入：dimensionSave（{id?, setId, firstDimensionName, layerObjectCount,
  layerTotalArea, shpFile}）。新增时 dimName 可填（补充体系未覆盖的维度）；
  编辑时 dimName 只读仅维护图层信息。
  上传图层对象（shp）：shp 图层一般由 .shp/.shx/.dbf 等多个文件组成，
  后端单文件接口 → 多文件请打包 zip 上传（白名单 zip/shp）；
  附件以 {"name","url"} JSON 存 shpFile 列（原始文件名随存，落盘名为时间戳）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="500px" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>
    <BasicForm @register="registerForm" />
    <div class="mt-2">
      <div class="mb-1" style="font-weight: 600">上传图层对象（shp）</div>
      <Upload.Dragger
        accept=".zip,.shp"
        :show-upload-list="false"
        :disabled="uploading"
        :before-upload="handleUpload"
      >
        <p class="m-2">
          <Icon :icon="uploading ? 'ant-design:loading-outlined' : 'ant-design:cloud-upload-outlined'" :size="28" />
        </p>
        <p class="px-2">{{ uploading ? '上传中…' : '点击或拖拽文件到此处上传' }}</p>
        <p class="text-gray-400">支持 .shp 文件上传，多个 shp 文件请打包为 .zip 后上传</p>
      </Upload.Dragger>
      <div v-if="shpAtt" class="mt-2 flex items-center">
        <Icon icon="ant-design:paper-clip-outlined" class="mr-1" />
        <a :title="shpAtt.name" @click="handleDownload">{{ shpAtt.name }}</a>
        <a-button type="link" size="small" danger class="ml-2" @click="shpAtt = undefined">删除</a-button>
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultDimForm">
  import { computed, ref, unref } from 'vue';
  import { Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { AttFile } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import {
    dimensionSave,
    checkFileUpload,
    checkFileDownload,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const record = ref<Recordable>({});

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: record.value.isNewRecord ? '新增一级维度' : `编辑 · ${record.value.dimName ?? '一级维度'}`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '一级维度名称',
      field: 'dimName',
      component: 'Input',
      componentProps: { maxlength: 50 },
      rules: [{ required: true, message: '请输入一级维度名称' }],
      dynamicDisabled: () => !record.value.isNewRecord,
      helpMessage: '维度行由系统按体系指标项自动同步；此处可手工补充未覆盖的维度',
    },
    {
      label: '图层对象数量',
      field: 'layerCount',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0, style: 'width: 100%' },
    },
    {
      label: '图层覆盖面积（km²）',
      field: 'layerArea',
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width: 100%' },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 160,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 24 },
  });

  /** 已上传图层对象（name=原始文件名，url=相对路径） */
  const shpAtt = ref<AttFile>();
  const uploading = ref(false);

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    record.value = { ...(data || {}) };
    record.value.isNewRecord = data?.isNewRecord ?? data?.id == null;
    shpAtt.value = data?.shpAtt;
    await setFieldsValue({
      dimName: record.value.dimName ?? '',
      layerCount: record.value.layerCount,
      layerArea: record.value.layerArea,
    });
    setDrawerProps({ loading: false });
  });

  /** 选文件即手动上传（beforeUpload 返回 false 阻止 antd 自动上传） */
  function handleUpload(file: File): boolean {
    uploading.value = true;
    checkFileUpload(file, 'shp')
      .then((att) => {
        shpAtt.value = att;
        showMessage('上传成功');
      })
      .catch((e: any) => {
        showMessage(e?.message || '上传失败', 'error');
      })
      .finally(() => {
        uploading.value = false;
      });
    return false;
  }

  async function handleDownload() {
    if (shpAtt.value) await checkFileDownload(shpAtt.value);
  }

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
      await dimensionSave({
        id: record.value.isNewRecord ? undefined : record.value.id,
        setId: record.value.setId,
        dimName: data.dimName,
        layerCount: data.layerCount,
        layerArea: data.layerArea,
        shpAtt: shpAtt.value,
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
