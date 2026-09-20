<!--
  ifco —— 提示/督办处理（查看 / 去处理 一体处理抽屉 · 区级端）

  抽屉标题 = 处理 · 下发编号；浅灰蓝横幅只读展示下发信息
  （下发编号/巡查月份/下发时间/处理截止日期/下发部门 + 下发文件 预览/下载）；
  「涉及片区和项目的处理情况」按片区子块只读展示（项目/问题/是否发现问题）；
  处理表单（区级处理情况）：处理完成时间（区级，必填）/ 处理情况说明（必填）/
  上传照片附件。底部按钮：查看=关闭；处理=取消/提交（提交后处理状态转已处理）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-progress 的 SUPERVISES，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="55%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
    </template>

    <!-- 下发信息横幅（浅灰蓝底；文件名可点 预览/下载） -->
    <div class="mb-16px rd-4px bg-#e8ecf5 px-16px py-12px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">下发编号：</span>{{ record.dispatchNo }}</span>
        <span><span class="text-gray-500">巡查月份：</span>{{ inspectMonthLabel }}</span>
        <span><span class="text-gray-500">下发时间：</span>{{ record.dispatchDate }}</span>
        <span><span class="text-gray-500">处理截止日期：</span>{{ record.deadline }}</span>
        <span><span class="text-gray-500">下发部门：</span>{{ record.dispatchOrg }}</span>
      </div>
      <div class="mt-6px flex items-center">
        <span class="text-gray-500">下发文件：</span>
        <span class="ml-4px cursor-pointer text-#1677ff" @click="handleTodo('预览')">{{
          record.dispatchFile || '/'
        }}</span>
        <span class="ml-12px cursor-pointer text-#1677ff" @click="handleTodo('下载')">下载</span>
      </div>
    </div>

    <!-- 涉及片区和项目的处理情况（按片区子块只读展示） -->
    <div class="mb-16px bg-white rd-8px px-24px py-16px">
      <div class="text-15px font-600 text-gray-900">涉及片区和项目的处理情况</div>
      <div v-for="area in record.areaItems ?? []" :key="area.area" class="mt-12px">
        <div class="mb-4px text-14px font-600 text-#1677ff">{{ area.area }}</div>
        <div class="flex flex-col gap-4px">
          <div
            v-for="project in area.projects"
            :key="project.projectName"
            class="grid grid-cols-1 gap-x-16px gap-y-2px b-1 b-solid b-gray-100 rd-4px px-12px py-8px text-14px md:grid-cols-3"
          >
            <span class="text-gray-800">{{ project.projectName }}</span>
            <span class="text-gray-500">{{ project.problem || '/' }}</span>
            <span :class="project.foundProblem === '是' ? 'text-#d46b08' : 'text-gray-500'">
              是否发现问题：{{ project.foundProblem }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 区级处理情况表单 -->
    <BasicForm @register="registerForm">
      <template #districtHandleFileList>
        <Upload
          v-if="!isView"
          v-model:file-list="districtHandleFileList"
          list-type="picture-card"
          multiple
          :before-upload="() => false"
          accept=".jpg,.jpeg,.png"
        >
          <span class="text-12px text-gray-500">上传照片</span>
        </Upload>
        <!-- 查看态：只读文件清单 -->
        <div v-else class="flex flex-col gap-4px">
          <div
            v-for="file in districtHandleFileList"
            :key="file.uid"
            class="flex items-center gap-6px text-14px text-gray-800"
          >
            <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
            {{ file.name }}
          </div>
          <div v-if="!districtHandleFileList.length" class="text-14px text-gray-400">未上传照片</div>
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
<script lang="ts" setup name="ViewsIfcoImplProgressDistrictHandleForm">
  import { computed, ref } from 'vue';
  import { Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { SUPERVISES, type SuperviseItem } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<SuperviseItem>>({});

  const title = computed(() => `处理 · ${record.value.dispatchNo ?? ''}`);

  /** 巡查月份展示（YYYY-MM → N月） */
  const inspectMonthLabel = computed(() => {
    const month = Number((record.value.inspectMonth ?? '').split('-')[1]);
    return month ? `${month}月` : '/';
  });

  const schemas: FormSchema[] = [
    { label: '区级处理情况', field: 'districtHandleGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '处理完成时间(区级)',
      field: 'districtHandleDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择处理完成时间' },
      rules: [{ required: true, message: '请选择处理完成时间' }],
    },
    {
      label: '处理情况说明',
      field: 'districtHandleDesc',
      component: 'InputTextArea',
      componentProps: { rows: 4, maxlength: 500, placeholder: '请输入处理情况说明' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入处理情况说明' }],
    },
    {
      label: '上传照片附件',
      field: 'districtHandleFileList',
      component: 'Input',
      slot: 'districtHandleFileList',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { setFieldsValue, setProps, validate, resetFields, getFieldsValue }] = useForm({
    labelWidth: 160,
    schemas,
    showActionButtonGroup: false,
  });

  /** 照片附件清单（上传控件模型；保存时收拢文件名写回行） */
  const districtHandleFileList = ref<UploadFile[]>([]);

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<SuperviseItem>;
    districtHandleFileList.value = (record.value.districtHandleFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    await setFieldsValue({
      districtHandleDate: record.value.districtHandleDate || undefined,
      districtHandleDesc: record.value.districtHandleDesc ?? '',
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
    const target = SUPERVISES.find((item) => item.dispatchNo === record.value.dispatchNo);
    if (target) {
      target.districtHandleDate = String(values.districtHandleDate ?? '');
      target.districtHandleDesc = String(values.districtHandleDesc ?? '');
      target.districtHandleFileList = districtHandleFileList.value.map((file) => file.name);
      target.districtHandleStatus = '已处理';
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
