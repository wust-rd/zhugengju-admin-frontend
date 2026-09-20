<!--
  ifco —— 资金分类填报（查看 / 编辑 一体抽屉）

  抽屉标题 = 资金分类填报 · 项目名 + 填报状态 Tag；副标题行 = 当前填报周期与截止
  天数；黄色横幅 = 金融政策案例匹配提示 + 投融政策链接（占位）。
  两个区块：
  ①资金基本情况：本年完成投资总额（进度填报自动带入，只读）/ 投资概算金额
    （=本年完成投资总额×10000，计算只读）/ REITs 培育项目 / 项目资金缺口 /
    缺口资金是否已有资金安排 / 资金安排说明（安排=是时提交必填，红字提示）；
  ②资金到位情况：指标网格（行 = 指标名称(全角空格缩进)/计量单位/代码/本年数/备注；
    输入行 InputNumber，灰色自动行按公式实时求和只读——口径参考项目进展填报表格：
    104=105+115+120、105=106+111+112+113+114、106=107+108+109+110、
    112=市级+区级预算资金、115=116+117+118；其他来源为文字行）。
  底部按钮：查看=关闭；编辑=取消/保存（状态转待提交）/ 提交（校验资金安排说明，
  状态转已提交）。
  当前后端尚未介入：保存直接改内存行（api/ifco/finance 的 FUND_ITEMS，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="60%" @register="registerDrawer">
    <template #title>
      <span>资金分类填报 · {{ record.projectName }}</span>
      <Tag
        v-if="record.fillStatus"
        v-bind="fundFillStatusTagProps(record.fillStatus)"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ record.fillStatus }}
      </Tag>
    </template>

    <!-- 副标题：填报周期与截止天数 -->
    <div class="mb-8px text-13px text-gray-500">
      当前填报周期：{{ FUND_FILL_PERIOD.year }}-{{
        String(FUND_FILL_PERIOD.month).padStart(2, '0')
      }}　距离填报截止天数：{{ FUND_FILL_PERIOD.deadlineDays }}天
    </div>

    <!-- 金融政策案例匹配横幅 -->
    <div class="mb-16px b-l-4px b-l-solid b-l-#d46b08 bg-#fff7e6 rd-4px px-16px py-10px text-14px">
      <div class="text-gray-800"> 金融政策案例匹配：项目为老旧小区改造项目，可参照以下政策案例争取资金 </div>
      <div class="mt-4px flex items-center">
        <span class="text-gray-500">投融资政策链接：</span>
        <span class="cursor-pointer text-#1677ff" @click="handleTodo('政策链接')">
          市财政局市住房和城市更新局关于印发《武汉市城市更新行动中央补助资金管理暂行办法》的通知（武财建〔2024〕63号）
        </span>
      </div>
    </div>

    <!-- ① 资金基本情况 -->
    <div class="bg-white rd-8px px-20px py-16px shadow-sm">
      <div class="text-15px font-600 text-gray-900">资金基本情况</div>
      <div class="mt-12px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
        <div class="flex items-center gap-8px">
          <div class="w-180px shrink-0 text-right text-14px text-gray-700">本年完成投资总额(亿元)</div>
          <Input :value="record.yearInvestTotal" disabled class="flex-1" />
          <span class="shrink-0 text-12px text-#ff4d4f">进度填报时自动带入</span>
        </div>
        <div class="flex items-center gap-8px">
          <div class="w-180px shrink-0 text-right text-14px text-gray-700">投资概算金额(万元)</div>
          <Input :value="statInvestWan" disabled class="flex-1" />
        </div>
        <div class="flex items-center gap-8px">
          <div class="w-180px shrink-0 text-right text-14px text-gray-700">是否可以作为REITs培育项目</div>
          <Select
            v-model:value="formState.reitsProject"
            :options="yesNoOptions"
            :disabled="isView"
            allow-clear
            class="flex-1"
            placeholder="请选择"
          />
        </div>
        <div class="flex items-center gap-8px">
          <div class="w-180px shrink-0 text-right text-14px text-gray-700">项目资金缺口(万元)</div>
          <InputNumber
            v-model:value="formState.fundGap"
            :min="0"
            :disabled="isView"
            class="flex-1"
            placeholder="请输入项目资金缺口"
          />
        </div>
        <div class="flex items-center gap-8px">
          <div class="w-180px shrink-0 text-right text-14px text-gray-700">缺口资金是否已有资金安排</div>
          <Select
            v-model:value="formState.gapArranged"
            :options="yesNoOptions"
            :disabled="isView"
            allow-clear
            class="flex-1"
            placeholder="请选择"
          />
        </div>
        <div class="flex items-start gap-8px md:col-span-2">
          <div class="w-180px shrink-0 pt-4px text-right text-14px text-gray-700">
            <span v-if="formState.gapArranged === '是'" class="text-#ff4d4f">*</span> 资金安排说明
          </div>
          <div class="min-w-0 flex-1">
            <TextArea
              v-model:value="formState.gapArrangeDesc"
              :disabled="isView"
              :rows="3"
              :maxlength="300"
              show-count
              placeholder="请输入资金安排说明"
            />
            <div v-if="formState.gapArranged === '是' && !isView" class="mt-2px text-right text-12px text-#ff4d4f">
              缺口资金已有资金安排时必填
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ② 资金到位情况（指标网格：输入行可填，灰色自动行按公式实时求和） -->
    <div class="mt-16px bg-white rd-8px px-20px py-16px shadow-sm">
      <div class="text-15px font-600 text-gray-900">资金到位情况</div>
      <table class="mt-12px w-full text-14px">
        <thead>
          <tr class="b-b-1 b-b-solid b-gray-200 bg-gray-50 text-gray-500">
            <th class="py-8px text-left font-500" style="padding-left: 12px">指标名称</th>
            <th class="w-80px py-8px font-500">计量单位</th>
            <th class="w-60px py-8px font-500">代码</th>
            <th class="w-200px py-8px font-500">本年数</th>
            <th class="py-8px text-left font-500" style="padding-left: 24px">备注</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in FUND_INDICATORS"
            :key="row.key"
            class="b-b-1 b-b-solid b-gray-100"
            :class="row.autoOf ? 'bg-gray-50 font-600 text-gray-800' : ''"
          >
            <td class="py-6px text-left text-gray-800" style="padding-left: 12px">{{ row.name }}</td>
            <td class="py-6px text-center text-gray-600">{{ row.unit }}</td>
            <td class="py-6px text-center text-gray-600">{{ row.code || '—' }}</td>
            <td class="py-6px">
              <!-- 文字行（其他来源） -->
              <Input
                v-if="row.key === 'otherSource'"
                v-model:value="otherSource"
                :disabled="isView"
                :maxlength="100"
                size="small"
                placeholder="请输入来源说明"
                class="w-full"
              />
              <!-- 自动行：按公式实时求和（只读） -->
              <span v-else-if="row.autoOf" class="text-gray-800">{{ formatWan(autoValueOf(row.key, values)) }}</span>
              <!-- 输入行 -->
              <InputNumber
                v-else
                :value="values[row.key]"
                :min="0"
                :disabled="isView"
                size="small"
                :controls="false"
                class="w-full"
                placeholder="请输入"
                @change="(value) => handleValueChange(row.key, value)"
              />
            </td>
            <td class="py-6px text-left text-12px text-gray-400" style="padding-left: 24px">{{ row.note || '' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="mt-8px text-12px text-gray-400">
        灰色行为自动计算行，无需填写；已填报的周期带入已填报的数据，未填报的周期置灰不可填。
      </div>
    </div>

    <!-- 底部按钮：查看=关闭；编辑=取消/保存/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('待提交')"> 保存 </a-button>
        <a-button type="primary" @click="handleSave('已提交')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceCategoryManagementForm">
  import { computed, reactive, ref } from 'vue';
  import { Input, InputNumber, Select, Tag, TextArea } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    FUND_FILL_PERIOD,
    FUND_ITEMS,
    FUND_INDICATORS,
    YES_NO_OPTIONS,
    autoValueOf,
    fundFillStatusTagProps,
    type FundFillStatus,
    type FundItem,
    type YesNo,
  } from '@jeesite/ifco/api/ifco/finance';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<FundItem>>({});

  /** 投资概算金额（万元）= 本年完成投资总额（亿元）× 10000（计算只读展示） */
  const statInvestWan = computed(() =>
    (Math.round((record.value.yearInvestTotal ?? 0) * 1000000) / 100).toLocaleString('zh-CN'),
  );

  const yesNoOptions = YES_NO_OPTIONS.map((name) => ({ label: name, value: name }));

  // ── 表单状态（抽屉打开时按行数据整体重建） ──────────────────────────
  const formState = reactive({
    reitsProject: undefined as YesNo | undefined,
    fundGap: undefined as number | undefined,
    gapArranged: undefined as YesNo | undefined,
    gapArrangeDesc: '',
  });

  /** 资金到位输入行数值（自动行经 autoValueOf 实时求和，不落此表） */
  const values = ref<Record<string, number>>({});
  const otherSource = ref('');

  function handleValueChange(key: string, value: number | null) {
    if (value === null || value === undefined) {
      delete values.value[key];
    } else {
      values.value[key] = value;
    }
  }

  /** 数值展示：千分位 + 最多两位小数 */
  function formatWan(value: number) {
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<FundItem>;

    formState.reitsProject = record.value.reitsProject;
    formState.fundGap = record.value.fundGap;
    formState.gapArranged = record.value.gapArranged;
    formState.gapArrangeDesc = record.value.gapArrangeDesc ?? '';
    values.value = { ...(record.value.values ?? {}) };
    otherSource.value = record.value.otherSource ?? '';

    setDrawerProps({ loading: false });
  });

  /** 保存（转待提交，不校验）/ 提交（校验资金安排说明，转已提交） */
  function handleSave(nextStatus: Exclude<FundFillStatus, '待填报'>) {
    if (nextStatus === '已提交' && formState.gapArranged === '是' && !formState.gapArrangeDesc.trim()) {
      showMessage('缺口资金已有资金安排时，请填写资金安排说明');
      return;
    }
    const target = FUND_ITEMS.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.reitsProject = formState.reitsProject;
      target.fundGap = formState.fundGap;
      target.gapArranged = formState.gapArranged;
      target.gapArrangeDesc = formState.gapArrangeDesc;
      target.values = { ...values.value };
      target.otherSource = otherSource.value;
      target.fillStatus = nextStatus;
    }
    showMessage(nextStatus === '待提交' ? '保存成功（待提交）' : '提交成功');
    closeDrawer();
    emit('success', target);
  }

  /** 占位操作（TODO：政策链接随后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
