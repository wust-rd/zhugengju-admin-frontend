<!--
  ifco —— 提示/督办确认表单抽屉（市级端 · 查看处理结果并确认）

  标题 = 确认 · 下发编号。浅蓝横幅只读展示下发信息（下发编号/督查月份/
  下发时间/处理截止日期/下发部门 + 下发文件 预览/下载）。主体两列：
  左列「涉及片区和项目的处理情况」（片区子块 → 项目卡：具体问题/是否发现问题/
  处理状态/处理完成时间/处理情况说明，处理数据取填报端处理行）；
  右列「区级处理情况」只读（处理完成时间/处理情况说明/处理附件）。
  底部按钮：查看=关闭；确认=取消/确认（处理状态转已确认，流程办结）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="65%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
    </template>

    <!-- 下发信息横幅（浅蓝底；文件名可点 预览/下载） -->
    <div class="mb-16px rd-4px bg-#e8f2ff px-16px py-12px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">下发编号：</span>{{ record.dispatchNo }}</span>
        <span><span class="text-gray-500">督查月份：</span>{{ inspectMonthLabel }}</span>
        <span><span class="text-gray-500">下发时间：</span>{{ record.dispatchDate || '/' }}</span>
        <span><span class="text-gray-500">处理截止日期：</span>{{ record.deadline }}</span>
        <span><span class="text-gray-500">下发部门：</span>{{ record.dispatchOrg }}</span>
        <span v-if="record.contactPerson">
          <span class="text-gray-500">联系人：</span>{{ record.contactPerson }}
          <span class="ml-8px text-gray-500">联系电话：</span>{{ record.contactPhone || '/' }}
        </span>
      </div>
      <div class="mt-6px text-gray-800"><span class="text-gray-500">具体问题：</span>{{ record.problem || '/' }}</div>
      <div class="mt-6px flex items-center">
        <span class="text-gray-500">下发文件：</span>
        <span class="ml-4px cursor-pointer text-#1677ff" @click="handleTodo('预览')">{{
          record.dispatchFile || '/'
        }}</span>
        <span class="ml-12px cursor-pointer text-#1677ff" @click="handleTodo('下载')">下载</span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
      <!-- 左列：涉及片区和项目的处理情况（片区子块 → 项目卡） -->
      <div class="bg-white rd-8px px-20px py-16px">
        <div class="text-15px font-600 text-gray-900">涉及片区和项目的处理情况</div>
        <div v-for="area in record.areaItems ?? []" :key="area.area" class="mt-12px">
          <div class="mb-6px text-14px font-600 text-#1677ff">{{ area.area }}</div>
          <div
            v-for="project in area.projects"
            :key="project.projectName"
            class="mb-8px b-1 b-solid b-gray-100 rd-4px px-12px py-10px text-13px"
          >
            <div class="flex items-center justify-between">
              <span class="font-600 text-gray-800">{{ project.projectName }}</span>
              <Tag
                v-if="projectHandleRow(project.projectName)"
                v-bind="handleStatusTagProps(projectHandleRow(project.projectName)!.handleStatus)"
                style="border-radius: 10px"
              >
                {{ projectHandleRow(project.projectName)!.handleStatus }}
              </Tag>
            </div>
            <div class="mt-4px text-gray-500">具体问题：{{ project.problem || '/' }}</div>
            <div class="mt-2px text-gray-500">是否发现问题：{{ project.foundProblem }}</div>
            <template v-if="projectHandleRow(project.projectName)">
              <div class="mt-2px text-gray-500">
                处理完成时间：{{ projectHandleRow(project.projectName)!.handleDate || '/' }}
              </div>
              <div class="mt-2px text-gray-500">
                处理情况说明：{{ projectHandleRow(project.projectName)!.handleDesc || '/' }}
              </div>
            </template>
          </div>
        </div>
        <div v-if="!(record.areaItems ?? []).length" class="mt-12px text-13px text-gray-400">未选择涉及项目</div>
      </div>

      <!-- 右列：区级处理情况（只读） -->
      <div class="bg-white rd-8px px-20px py-16px">
        <div class="text-15px font-600 text-gray-900">区级处理情况</div>
        <div class="mt-12px flex flex-col gap-8px text-14px">
          <div class="flex">
            <span class="w-120px shrink-0 text-gray-500">处理状态</span>
            <span class="text-gray-800">{{ record.districtHandleStatus }}</span>
          </div>
          <div class="flex">
            <span class="w-120px shrink-0 text-gray-500">处理完成时间</span>
            <span class="text-gray-800">{{ record.districtHandleDate || '/' }}</span>
          </div>
          <div class="flex">
            <span class="w-120px shrink-0 text-gray-500">处理情况说明</span>
            <span class="text-gray-800">{{ record.districtHandleDesc || '/' }}</span>
          </div>
          <div class="flex">
            <span class="w-120px shrink-0 text-gray-500">处理附件</span>
            <span v-if="(record.districtHandleFileList ?? []).length" class="flex flex-col gap-2px">
              <span
                v-for="file in record.districtHandleFileList"
                :key="file"
                class="cursor-pointer text-#1677ff"
                @click="handleTodo('预览')"
              >
                {{ file }}
              </span>
            </span>
            <span v-else class="text-gray-800">/</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮：查看=关闭；确认=取消/确认 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <a-button v-if="!isView" type="primary" @click="handleConfirm"> 确认 </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressUrbanConfirmForm">
  import { computed, ref } from 'vue';
  import { Tag } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    SUPERVISES,
    SUPERVISE_ROWS,
    handleStatusTagProps,
    type SuperviseHandleRow,
    type SuperviseItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<SuperviseItem>>({});

  const title = computed(() => `确认 · ${record.value.dispatchNo ?? ''}`);

  /** 督查月份展示（YYYY-MM → N月） */
  const inspectMonthLabel = computed(() => {
    const month = Number((record.value.inspectMonth ?? '').split('-')[1]);
    return month ? `${month}月` : '/';
  });

  /** 填报端处理行（按 下发编号 + 项目名 匹配；无 = 该项目尚未处理） */
  function projectHandleRow(projectName: string): SuperviseHandleRow | undefined {
    return SUPERVISE_ROWS.find((row) => row.dispatchNo === record.value.dispatchNo && row.projectName === projectName);
  }

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<SuperviseItem>;
    setDrawerProps({ loading: false });
  });

  /** 确认：处理状态转已确认（流程办结） */
  function handleConfirm() {
    const target = SUPERVISES.find((item) => item.dispatchNo === record.value.dispatchNo);
    if (target) {
      target.districtHandleStatus = '已确认';
      target.dispatchStatus = '已下发';
    }
    showMessage('已确认，处理流程办结');
    closeDrawer();
    emit('success', target);
  }

  /** 占位操作（TODO：随文件服务接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
