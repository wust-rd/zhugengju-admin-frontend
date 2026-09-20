<!--
  市住更局 —— 策划方案审查（片区策划申报审查 · 子模块二 · 主审单位 / 联合审查单位）

  角色与流转（角色已建档：填报单位 esp_pqchsbsc_fill_unit / 联合审查单位
  esp_pqchsbsc_joint_review / 主审单位 esp_pqchsbsc_main_review；页面按登录账号角色
  出操作，工具栏只读展示当前角色。数据范围暂未隔离，待后端接口按角色过滤）：
   - 填报单位（…/scheme-fill）：新增片区 → 暂存=未提交（可编辑）/ 提交=审核中（只读）；
   - 主审单位（本页）：查看已提交片区，点「审查」进审查页 → 通过（终态）/ 退回修改 /
     联合审查（弹窗多选联审单位，确定即推送系统通知，状态 → 联合审查中）；主审不等待联审
     单位全部提交，可随时再出结论；再次联合审查 → 轮次 +1，直到点「通过」结束；
   - 联合审查单位（本页）：轮到自己（状态=联合审查中且本轮被指派）时「审查」，
     填 通过 / 退回修改 / 不涉及（每轮一次，提交后不可修改，列表只剩「查看」）。

  数据来源（真实待审查片区 + 前端假数据兜底，详见 ../shared/review-mock.ts）：
   - 主列表取后端「待审查片区」isApprove=2 分页接口（= 填报单位新增填报的片区），
     按前端状态过滤掉「未提交」；接口不可用或查不到数据时回退种子假数据 REVIEW_SEED_ROWS；
   - 审核状态、审查记录、联合审查轮次/单位、通知均为前端假数据（localStorage 缓存，刷新不丢）；
   - 搜索：片区名称/行政区/申报年份走后端；状态筛选待后端状态列就绪后再加。

  ⚠️ 菜单注册（后台菜单管理）——组件位置必须与实际文件名精确一致：
   链接地址 / 组件位置：/early-stage-planning/scheme-declaration-review/scheme-review/list
   （同目录 index.vue 为兼容别名）。
  非 a-button/a-input 的 antd 组件必须显式 import（Select）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px overflow-visible!">
    <!-- 审查列表（v-show：进审查页时不卸载，保留搜索/分页状态） -->
    <div v-show="!formVisible" class="flex flex-col gap-16px">
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #tableTitle>
          <span>片区审查列表</span>
        </template>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-12px">
            <!-- 当前角色：由登录账号的授权角色判定（填报单位 / 联合审查单位 / 主审单位），只读展示 -->
            <span class="flex items-center gap-6px">
              <span class="text-12px text-gray-500">当前角色</span>
              <span class="rd-4px bg-[#eef4fb] px-8px py-2px text-12px font-500 text-[#1677ff]">
                {{ ROLE_LABEL[identity.role] }}{{ identity.name ? `（${identity.name}）` : '' }}
              </span>
            </span>
            <span class="text-12px text-gray-400">
              演示：审核状态/审查记录为前端假数据（后端暂无状态列）；仅显示已提交片区（暂存/未提交不进审查）
            </span>
          </div>
        </template>
        <!-- 片区功能定位：多维度胶囊并列展示 -->
        <template #funcType="{ record }">
          <span class="inline-flex flex-wrap items-center gap-4px">
            <span
              v-for="t in record.funcTypes"
              :key="t"
              class="inline-flex rd-4px px-6px py-2px text-12px font-500 text-gray-700"
              style="background: #eff6ff"
            >
              {{ t }}
            </span>
          </span>
        </template>
        <!-- 审核状态（前端假数据，口径见 ../shared/review-mock.ts）+ 联审单位的「待我审查/我已提交」标记 -->
        <template #reviewStatus="{ record }">
          <span class="inline-flex items-center gap-4px">
            <span class="text-13px font-500" :style="{ color: REVIEW_STATUS[statusOf(record)].color }">
              {{ REVIEW_STATUS[statusOf(record)].label }}
            </span>
            <span
              v-if="jointTagOf(record)"
              class="inline-flex rd-3px px-4px py-1px text-11px font-500"
              :style="{
                color: jointTagOf(record) === '待我审查' ? '#d46b08' : '#52c41a',
                background: jointTagOf(record) === '待我审查' ? '#fff7e6' : '#f0fbf4',
              }"
            >
              {{ jointTagOf(record) }}
            </span>
          </span>
        </template>
      </BasicTable>
    </div>

    <!-- 整页表单（组件切换，不走路由）：
         查看 = 只读（填报内容 + 审查记录）；审查 = 填报内容 + 审查记录 + 片区申报审核填写区 -->
    <component
      :is="ReviewForm"
      v-if="formVisible"
      :record="formRecord"
      :mode="formMode"
      @success="handleFormSuccess"
      @back="handleBack"
    />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationSchemeReviewList">
  import { computed, onMounted, ref } from 'vue';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { schemeFillPage } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import ReviewForm from './form.vue';
  import {
    ROLE_LABEL,
    REVIEW_SEED_ROWS,
    REVIEW_STATUS,
    currentIdentity,
    hasSubmittedCurrentRound,
    isAssignedToMe,
    isSubmittedToReview,
    mockReviewPage,
    pendingJointTasks,
    statusOf,
    type ReviewRow,
  } from '../shared/review-mock';

  const { notification } = useMessage();

  /** 当前登录者身份：由账号授权角色判定（填报单位 / 联合审查单位 / 主审单位） */
  const identity = computed(() => currentIdentity());

  /** 整页表单：查看（mode=view）/ 审查（mode=review） */
  const formVisible = ref(false);
  const formMode = ref<'review' | 'view'>('view');
  const formRecord = ref<Recordable>({});

  /** 审查列表列（与填报页 Tab② 对齐，末列为审核状态） */
  const reviewColumns: BasicColumn[] = [
    { title: '申报年份', dataIndex: 'batch', width: 90, align: 'center' },
    { title: '片区名称', dataIndex: 'name', width: 150 },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区规模（公顷）', dataIndex: 'areaHa', width: 120, align: 'center' },
    { title: '片区功能定位', dataIndex: 'funcTypes', width: 130, slot: 'funcType' },
    { title: '总体投资估算（亿元）', dataIndex: 'invest', width: 150, align: 'center' },
    { title: '填报时间', dataIndex: 'reportTime', width: 140 },
    { title: '填报单位', dataIndex: 'reportOrg', width: 160 },
    { title: '状态', dataIndex: 'status', width: 150, slot: 'reviewStatus' },
  ];

  /**
   * 联审单位视角的标记：状态为联合审查中且本轮指派给我 → 待我审查 / 我已提交；
   * 主审身份不显示。
   */
  function jointTagOf(record: Recordable): string {
    if (identity.value.role !== 'joint') return '';
    if (statusOf(record) !== 'jointReviewing' || !isAssignedToMe(record)) return '';
    return hasSubmittedCurrentRound(record) ? '我已提交' : '待我审查';
  }

  /** 是否能进审查页操作：主审在 审核中/联合审查中 可审；联审单位仅在指派且未提交时可审 */
  function canReview(record: Recordable): boolean {
    const status = statusOf(record);
    if (identity.value.role === 'main') {
      return status === 'reviewing' || status === 'jointReviewing';
    }
    return status === 'jointReviewing' && isAssignedToMe(record) && !hasSubmittedCurrentRound(record);
  }

  /** 操作列：查看（只读，含审查记录）/ 审查（按身份与状态出） */
  const reviewActionColumn: BasicColumn = {
    width: 120,
    actions: (record: Recordable) => {
      const actions: Recordable[] = [{ label: '查看', onClick: () => handleOpen(record, 'view') }];
      if (canReview(record)) {
        actions.push({ label: '审查', onClick: () => handleOpen(record, 'review') });
      }
      return actions;
    },
  };

  const DISTRICT_OPTIONS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));

  /**
   * 列表数据：后端「待审查片区」（isApprove=2）＝ 填报单位新增填报的片区 → 过滤未提交 →
   * 附前端审核状态。接口不可用 / 查不到数据时回退种子假数据（联调前空页兜底）。
   */
  async function fetchReviewRows(params: Recordable): Promise<{ list: ReviewRow[]; count: number }> {
    const { pageNo, pageSize, ...rest } = params ?? {};
    try {
      const page = await schemeFillPage({ ...rest, isApprove: '2', pageNo, pageSize });
      const list = page.list.map((row) => ({ ...row, status: statusOf(row) })).filter(isSubmittedToReview);
      if (list.length || page.count) {
        return { list, count: list.length };
      }
    } catch {
      // 接口异常（后端未启动/无权限）→ 落到下面的假数据兜底
    }
    return mockReviewPage(REVIEW_SEED_ROWS, params);
  }

  const [registerTable, { reload }] = useTable({
    api: fetchReviewRows,
    columns: reviewColumns,
    actionColumn: reviewActionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 6, lg: 5 },
      labelWidth: 90,
      showAdvancedButton: false,
      actionColOptions: { md: 6, lg: 4 },
      schemas: [
        { label: '片区名称', field: 'name', component: 'Input', componentProps: { placeholder: '请输入' } },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: DISTRICT_OPTIONS, placeholder: '请选择', allowClear: true },
        },
        { label: '申报年份', field: 'batch', component: 'Input', componentProps: { placeholder: '如 2026' } },
      ],
    },
  });

  /**
   * 进入页面时的联合审查待办提醒：当前账号是联合审查单位且有待审查片区时，
   * 弹框架通知提示（与推送时发的站内消息互为补充）。
   */
  onMounted(() => {
    const pending = pendingJointTasks();
    if (pending.length) {
      notification.info({
        title: '联合审查待办',
        description: `您有 ${pending.length} 个片区待联合审查（第 ${pending.map((task) => task.round).join('、')} 轮）`,
        duration: 4,
      });
    }
  });

  /** 打开整页表单：查看（只读）/ 审查（可填写） */
  function handleOpen(record: Recordable, mode: 'review' | 'view') {
    formMode.value = mode;
    formRecord.value = { ...record };
    formVisible.value = true;
  }

  /** 审查提交/联合审查推送回调：刷新列表（状态已写入）并回列表 */
  function handleFormSuccess() {
    void reload();
    formVisible.value = false;
  }

  /** 从表单返回列表 */
  function handleBack() {
    formVisible.value = false;
  }
</script>
