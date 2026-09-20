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

  数据来源（后端审查流转已对接，2026-09-20）：列表走 GET /a/esp/schemeReview/page，
  数据范围由后端按登录角色决定（主审/无角色=全部已提交；联审=被指派片区，行带 jointStatus
  两态 + myTaskStatus 待办；填报=本部门片区）；状态列读行 reviewStatus（approve_status 五态）。
  进入页面时调 GET /a/esp/schemeReview/todo 弹联审待办提醒（与后端站内消息互为补充）。

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
              {{ scopeHint }}
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
        <!-- 状态：主审/无角色/填报 = 五态（reviewStatus）；**联合审查单位 = 单独两态
             （jointStatus：审核中 / 已审核）** -->
        <template #reviewStatus="{ record }">
          <span
            v-if="identity.role === 'joint'"
            class="text-13px font-500"
            :style="{ color: JOINT_SIDE_STATUS[record.jointStatus === 'reviewed' ? 'reviewed' : 'reviewing'].color }"
          >
            {{ JOINT_SIDE_STATUS[record.jointStatus === 'reviewed' ? 'reviewed' : 'reviewing'].label }}
          </span>
          <span v-else class="text-13px font-500" :style="{ color: REVIEW_STATUS[statusKeyOf(record)].color }">
            {{ REVIEW_STATUS[statusKeyOf(record)].label }}
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
  import {
    schemeReviewPage,
    schemeReviewTodo,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';
  import ReviewForm from './form.vue';
  import {
    JOINT_SIDE_STATUS,
    ROLE_LABEL,
    REVIEW_STATUS,
    currentIdentity,
    statusKeyOf,
  } from '../shared/review-constants';
  import { useSchemeDict } from '../shared/use-scheme-dict';

  const { notification } = useMessage();

  /** 当前登录者身份：由账号授权角色判定（填报单位 / 联合审查单位 / 主审单位） */
  const identity = computed(() => currentIdentity());

  /** 列表范围提示（按角色口径不同；数据范围由后端 schemeReview/page 按登录角色决定） */
  const scopeHint = computed(() => {
    if (identity.value.role === 'joint') {
      return '只显示被发起联合审查并指派给贵单位的片区；状态：审核中 / 已审核（提交后即为已审核）';
    }
    if (identity.value.role === 'main') {
      return '显示所有填报单位已提交的片区（暂存/未提交不进审查）；状态：审核中/退回修改/联合审查中/通过';
    }
    if (identity.value.role === 'fill') {
      return '显示本部门的申报片区（含未提交草稿），仅供查看申报与主审意见';
    }
    return '当前账号无审查角色：按只读口径显示全部已提交片区';
  });

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
    { title: '状态', dataIndex: 'reviewStatus', width: 150, slot: 'reviewStatus' },
  ];

  /**
   * 是否能进审查页操作：主审在 审核中/联合审查中 可审（**退回修改后流程在填报单位，
   * 待其修改重提后方可再审**）；联审单位仅「最新轮指派本部门且未提交」（行 myTaskStatus=pending）
   * 时可审。（进入审查页后按钮可用性以后端 form 接口的 actions 为准，这里只控列表入口）
   */
  function canReview(record: Recordable): boolean {
    if (identity.value.role === 'main') {
      return ['reviewing', 'jointReviewing'].includes(record.reviewStatus);
    }
    if (identity.value.role === 'joint') {
      return record.myTaskStatus === 'pending';
    }
    return false;
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

  /** 行政区下拉选项（后端字典 dictOptions，失败回退内置清单） */
  const { districtOptions: DISTRICT_OPTIONS } = useSchemeDict();

  /**
   * 列表数据：直接走后端审查列表（数据范围/已提交过滤/联审两态与待办标记均由后端
   * 按登录角色计算）；接口异常时回空列表（错误已由框架 toast，不叠加假数据）。
   */
  async function fetchReviewRows(params: Recordable): Promise<{ list: Recordable[]; count: number }> {
    try {
      return await schemeReviewPage(params);
    } catch {
      return { list: [], count: 0 };
    }
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
          // 函数式 componentProps：字典后到也能刷新选项（FormItem computed 依赖）
          componentProps: () => ({ options: DISTRICT_OPTIONS.value, placeholder: '请选择', allowClear: true }),
        },
        { label: '申报年份', field: 'batch', component: 'Input', componentProps: { placeholder: '如 2026' } },
      ],
    },
  });

  /**
   * 进入页面时的联合审查待办提醒：调后端待办接口（最新轮指派本部门且未提交），
   * 有待办时弹框架通知（与后端 jointPush 发的站内消息互为补充）。
   */
  onMounted(async () => {
    try {
      const todo = await schemeReviewTodo();
      if (todo.jointPending > 0) {
        notification.info({
          title: '联合审查待办',
          description: `您有 ${todo.jointPending} 个片区待联合审查（第 ${todo.items.map((item) => item.round).join('、')} 轮）`,
          duration: 4,
        });
      }
    } catch {
      // 待办接口失败不影响列表
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
