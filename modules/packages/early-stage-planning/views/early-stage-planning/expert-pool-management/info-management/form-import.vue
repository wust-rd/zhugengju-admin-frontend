<!--
  市住更局 —— 三师信息管理（批量导入弹窗）

  对齐模版：第 1 行表头、第 2 行范例（导入时自动跳过）。
  模版从 MinIO 下载（后端转发文件流 + saveAs）；导入走 POST /a/esp/expert/importData。
-->
<template>
  <BasicModal
    v-bind="$attrs"
    title="批量导入专家"
    ok-text="开始导入"
    :minHeight="160"
    :width="480"
    @register="registerModal"
    @ok="handleSubmit"
  >
    <div class="flex flex-col gap-12px">
      <div class="rd-6px bg-#f6ffed px-12px py-10px text-14px text-gray-600">
        请先下载模版填写后再上传。第 2 行范例导入时会自动跳过；所属更新片区可空，多个片区用英文分号分隔。
      </div>
      <div>
        <Upload
          v-model:file-list="fileList"
          :before-upload="() => false"
          accept=".xlsx,.xls"
          :max-count="1"
        >
          <a-button> <Icon icon="i-ant-design:upload-outlined" /> 选择文件 </a-button>
        </Upload>
      </div>
      <div>
        <a-button type="link" class="px-0" @click="handleDownloadTemplate">
          <Icon icon="i-fa:file-excel-o" /> 下载导入模版
        </a-button>
      </div>
      <div v-if="errors.length" class="flex flex-col gap-4px rd-6px bg-#fff2f0 px-12px py-10px">
        <div class="text-14px font-600 text-red-500">部分行导入失败：</div>
        <div v-for="(item, index) in errors" :key="index" class="text-13px text-red-400">
          第 {{ item.row }} 行 {{ item.name || '' }}：{{ item.msg }}
        </div>
      </div>
    </div>
  </BasicModal>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolInfoManagementFormImport">
  import { ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { saveAs } from 'file-saver';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicModal, useModalInner } from '@jeesite/core/components/Modal';
  import {
    espExpertImportData,
    espExpertImportTemplate,
    espExpertImportTemplateFile,
    type EspExpertImportError,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const fileList = ref<UploadFile[]>([]);
  const errors = ref<EspExpertImportError[]>([]);

  const [registerModal, { setModalProps, closeModal }] = useModalInner(() => {
    fileList.value = [];
    errors.value = [];
  });

  async function handleDownloadTemplate() {
    const info = await espExpertImportTemplate();
    const blob = await espExpertImportTemplateFile();
    saveAs(blob, info.fileName || '三师库批量导入模版.xlsx');
  }

  async function handleSubmit() {
    errors.value = [];
    const raw = fileList.value[0]?.originFileObj;
    if (!raw) {
      showMessage('请选择要导入的 Excel 文件');
      return;
    }
    setModalProps({ confirmLoading: true });
    try {
      const result = await espExpertImportData(raw);
      errors.value = result.errors ?? [];
      showMessage(`导入完成：成功 ${result.success} 条，失败 ${result.fail} 条`);
      if ((result.fail ?? 0) === 0) {
        emit('success');
        setTimeout(closeModal);
      } else if ((result.success ?? 0) > 0) {
        emit('success');
      }
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '导入失败');
    } finally {
      setModalProps({ confirmLoading: false });
    }
  }
</script>
