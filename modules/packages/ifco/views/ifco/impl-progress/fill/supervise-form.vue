<!--
  ifco —— 提示/督办处理（查看 / 去处理 一体处理抽屉 · 填报端）

  抽屉标题 = [督办|提示]处理 · 项目名；浅蓝横幅只读展示下发信息
  （下发编号/督查月份/下发时间/处理截止日期/下发部门 + 具体问题 + 下发文件）。
  处理表单：处理完成时间（必填）/ 处理情况说明（必填）/ 相关证明材料（上传）。
  底部按钮：查看=关闭；处理=取消/提交（提交后处理状态转已处理）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-progress 的 SUPERVISE_ROWS，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
    </template>

    <!-- 下发信息横幅（浅蓝底两行：基础信息 + 具体问题/下发文件） -->
    <div class="mb-16px rd-4px bg-#e8f2ff px-16px py-12px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">下发编号：</span>{{ record.dispatchNo }}</span>
        <span><span class="text-gray-500">督查月份：</span>{{ inspectMonthLabel }}</span>
        <span><span class="text-gray-500">下发时间：</span>{{ record.dispatchDate }}</span>
        <span><span class="text-gray-500">处理截止日期：</span>{{ record.deadline }}</span>
        <span><span class="text-gray-500">下发部门：</span>{{ record.dispatchOrg }}</span>
      </div>
      <div class="mt-6px text-gray-800"> <span class="text-gray-500">具体问题：</span>{{ record.problem || '/' }} </div>
      <div class="mt-6px flex items-center">
        <span class="text-gray-500">下发文件：</span>
        <span class="ml-4px cursor-pointer text-#1677ff" @click="handleTodo('预览')">{{
          record.dispatchFile || '/'
        }}</span>
        <span class="ml-12px cursor-pointer text-#1677ff" @click="handleTodo('下载')">下载</span>
      </div>
    </div>

    <!-- 处理表单 -->
    <BasicForm @register="registerForm">
      <template #handleFileList>
        <Upload
          v-if="!isView"
          v-model:file-list="handleFileList"
          multiple
          :before-upload="() => false"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        >
          <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
        </Upload>
        <!-- 查看态：只读文件清单 -->
        <div v-else class="flex flex-col gap-4px">
          <div v-for="file in handleFileList" :key="file.uid" class="flex items-center gap-6px text-14px text-gray-800">
            <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
            {{ file.name }}
          </div>
          <div v-if="!handleFileList.length" class="text-14px text-gray-400">未上传文件</div>
        </div>
      </template>
    </BasicForm>

    <!-- 底部按钮：查看=关闭；处理=取消/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <a-button v-if="!isView" type="primary" @click="handleSubmit"> 提交 </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillSuperviseForm">
  import { computed, ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Button } from '@jeesite/core/components/Button';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { SUPERVISE_ROWS, type SuperviseHandleRow } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<SuperviseHandleRow>>({});

  const title = computed(
    () => `${record.value.superviseType === '督办' ? '督办处理' : '提示处理'} · ${record.value.projectName ?? ''}`,
  );

  /** 督查月份展示（YYYY-MM → N月） */
  const inspectMonthLabel = computed(() => {
    const month = Number((record.value.inspectMonth ?? '').split('-')[1]);
    return month ? `${month}月` : '/';
  });

  const schemas: FormSchema[] = [
    { label: '处理情况', field: 'handleGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '处理完成时间',
      field: 'handleDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择处理完成时间' },
      rules: [{ required: true, message: '请选择处理完成时间' }],
    },
    {
      label: '处理情况说明',
      field: 'handleDesc',
      component: 'InputTextArea',
      componentProps: { rows: 4, maxlength: 500, placeholder: '请输入处理情况说明' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入处理情况说明' }],
    },
    {
      label: '相关证明材料',
      field: 'handleFileList',
      component: 'Input',
      slot: 'handleFileList',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, setProps, validate, resetFields, getFieldsValue }] = useForm({
    labelWidth: 140,
    schemas,
    showActionButtonGroup: false,
  });

  /** 附件清单（上传控件模型；保存时收拢文件名写回行） */
  const handleFileList = ref<UploadFile[]>([]);

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<SuperviseHandleRow>;
    handleFileList.value = (record.value.handleFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    await setFieldsValue({
      handleDate: record.value.handleDate || undefined,
      handleDesc: record.value.handleDesc ?? '',
    });
    setProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  /** 提交处理结果：写回内存行，处理状态转已处理 */
  async function handleSubmit() {
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const target = SUPERVISE_ROWS.find(
      (item) => item.dispatchNo === record.value.dispatchNo && item.projectCode === record.value.projectCode,
    );
    if (target) {
      target.handleDate = String(values.handleDate ?? '');
      target.handleDesc = String(values.handleDesc ?? '');
      target.handleFileList = handleFileList.value.map((file) => file.name);
      target.handleStatus = '已处理';
    }
    showMessage('提交成功');
    closeDrawer();
    emit('success', target);
  }

  /** 占位操作（TODO：随文件服务接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
