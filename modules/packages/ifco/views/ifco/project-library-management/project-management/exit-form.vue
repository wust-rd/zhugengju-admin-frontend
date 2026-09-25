<!--
  ifco —— 在库项目管理 · 转退出抽屉（操作列「转退出」入口）

  提交即生效（无审批流）：顶部警示条（退出不可恢复，重启须重录策划库）→
  退出类型 Select（必选）→ 上传附件（Upload 拦截真实上传仅收集文件名，可选）→
  退出原因说明 textarea（必填）。提交调 transferExit 接口（exitFiles=文件名
  JSON 数组），成功后 emit success 由列表刷新表格与统计卡。
  校验错误为字段下方红字（不走 message，填报页同约定）。
  打开时序（防闪烁）：打开方 openDrawer 传 open=false，回填就绪后掀开
  （见前端 AGENTS.md 抽屉硬性规则）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    force-render
    width="30%"
    :title="`转退出 · ${project.pj_name ?? ''}`"
    okText="确定退出"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <!-- 警示文案（退出不可恢复） -->
    <Alert type="warning" show-icon class="mb-16px">
      退出后项目档案转为只读且不可恢复；如需重新启动，须重新录入策划库走完整入库流程。
    </Alert>

    <div class="flex flex-col gap-16px">
      <!-- 退出类型（必选） -->
      <div>
        <div class="mb-8px text-14px"> <span class="text-red-500">*</span> 请选择退出类型 </div>
        <Select
          v-model:value="exitType"
          placeholder="请选择退出类型"
          :options="exitTypeOptions"
          @change="exitTypeError = ''"
        />
        <div v-if="exitTypeError" class="mt-4px text-13px text-red-500">{{ exitTypeError }}</div>
      </div>

      <!-- 上传附件（可选；拦截真实上传，仅收集文件名） -->
      <div>
        <div class="mb-8px text-14px">上传附件</div>
        <Upload v-model:file-list="fileList" multiple :before-upload="() => false">
          <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
        </Upload>
      </div>

      <!-- 退出原因说明（必填） -->
      <div>
        <div class="mb-8px text-14px"> <span class="text-red-500">*</span> 退出原因说明 </div>
        <TextArea
          v-model:value="exitReason"
          :rows="4"
          :maxlength="500"
          placeholder="请输入退出原因说明"
          @input="exitReasonError = ''"
        />
        <div v-if="exitReasonError" class="mt-4px text-13px text-red-500">{{ exitReasonError }}</div>
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectLibraryManagementProjectManagementExitForm">
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Alert, Select, TextArea, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { Button } from '@jeesite/core/components/Button';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { EXIT_TYPE_OPTIONS, transferLibExit } from '@jeesite/ifco/api/ifco/project-library';
  import { ref } from 'vue';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  /** 打开方传入的目标项目行（p_uid/pj_name 取自列表行） */
  const project = ref<Recordable>({});

  const exitType = ref<string>();
  const exitReason = ref('');
  const fileList = ref<UploadFile[]>([]);
  const exitTypeError = ref('');
  const exitReasonError = ref('');
  const submitting = ref(false);

  const exitTypeOptions = EXIT_TYPE_OPTIONS.map((label) => ({ label, value: label }));

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    // 打开方 openDrawer 传 open=false：回填就绪后才掀开（防闪烁，见文件头注释）
    project.value = data?.project ?? {};
    exitType.value = undefined;
    exitReason.value = '';
    fileList.value = [];
    exitTypeError.value = '';
    exitReasonError.value = '';
    setDrawerProps({ open: true });
  });

  /** 提交：字段红字校验 → transferExit（提交即生效）→ emit success 交列表刷新 */
  async function handleSubmit() {
    exitTypeError.value = exitType.value ? '' : '请选择退出类型';
    exitReasonError.value = exitReason.value.trim() ? '' : '请输入退出原因说明';
    if (exitTypeError.value || exitReasonError.value) return;
    if (submitting.value) return;
    submitting.value = true;
    try {
      await transferLibExit(project.value.p_uid, {
        exitType: exitType.value!,
        exitReason: exitReason.value.trim(),
        exitFiles: fileList.value.map((file) => file.name),
      });
      showMessage('已转退出');
      closeDrawer();
      emit('success');
    } finally {
      submitting.value = false;
    }
  }
</script>
