<!--
  ifco —— 实施成效评估表单（查看 / 去评估 一体抽屉）

  抽屉标题 = 实施成效评估 · 项目名；顶部只读信息横幅两行（项目编号/行政区 片区
  五改分类 项目归属/责任主体 + 投资估算/实际完成投资/实际完工时间 + 更新对比按钮）。
  四个可折叠分区：
   ①实施后评估信息填报：评估日期* / 运营主体 / 实施成效说明 / 上传改造前后对比照片*
     （4 组：改造前/改造后 图片上传卡片，第 1 组必填）；
   ②绩效评估结果：绩效评估结果 + 添加绩效评估材料（占位）；
   ③四好目标评价：选择完成的四好目标*（多选，勾选哪组展开哪块）——好房子=达标套数/
     房屋用途/品质升级类型（安全耐久·功能完善·绿色智能 三组复选）+ 佐证材料/空间位置
     信息（占位）；好小区/好社区/好城区=达标数量 + 明细表（空间位置图层/佐证附件/
     编辑为占位，删除仅本地；添加/导出为占位）；
   ④基本情况：项目流程进度条（①基本信息查看→②进度信息查看→③资金填报→④确认提交，
     静态展示当前=资金填报）+ 本年完成投资额（进度填报自动带入，只读）/ 投资统纳金额
     （=实际完成投资×10000，计算只读）/ 是否可以作为 REITs 培育项目。
  底部按钮：查看=关闭；去评估=取消/暂存（状态留待评估）/ 提交（校验必填，状态转已完成）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-effect 的 EFFECT_ITEMS，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="70%" @register="registerDrawer">
    <template #title>
      <span>实施成效评估 · {{ record.projectName }}</span>
    </template>

    <!-- 只读信息横幅（两行 + 更新对比） -->
    <div class="mb-16px rd-4px bg-#e8ecf5 px-16px py-12px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">项目编号：</span>{{ record.projectCode }}</span>
        <span>
          {{ record.district }} {{ record.renewalAreaName }} {{ fiveReformLabel(record.fiveReformType ?? '') }}
          {{ projectAffiliationLabel(record.projectAffiliation ?? '') }}
        </span>
        <span><span class="text-gray-500">责任主体：</span>{{ record.responsibleOrg }}</span>
        <a-button size="small" type="primary" class="ml-auto" @click="handleTodo('更新对比')"> 更新对比 </a-button>
      </div>
      <div class="mt-6px flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">投资估算（亿元）：</span>{{ record.investEstimate }}</span>
        <span><span class="text-gray-500">实际完成投资（亿元）：</span>{{ record.actualInvest }}</span>
        <span><span class="text-gray-500">实际完工时间：</span>{{ record.completionDate || '/' }}</span>
      </div>
    </div>

    <Collapse v-model:active-key="activeKeys" class="effect-form-collapse">
      <!-- ① 实施后评估信息填报 -->
      <CollapsePanel key="after" header="实施后评估信息填报">
        <div class="grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
          <div class="flex items-center gap-8px">
            <div class="w-140px shrink-0 text-right text-14px text-gray-700">
              <span class="text-#ff4d4f">*</span> 评估日期
            </div>
            <DatePicker
              v-model:value="formState.evaluateDate"
              value-format="YYYY-MM-DD"
              :disabled="isView"
              class="flex-1"
              placeholder="请选择评估日期"
            />
          </div>
          <div class="flex items-center gap-8px">
            <div class="w-140px shrink-0 text-right text-14px text-gray-700">运营主体</div>
            <Input
              v-model:value="formState.operatingOrg"
              :disabled="isView"
              :maxlength="100"
              class="flex-1"
              placeholder="请输入运营主体"
            />
          </div>
          <div class="flex items-start gap-8px md:col-span-2">
            <div class="w-140px shrink-0 pt-4px text-right text-14px text-gray-700">实施成效说明</div>
            <TextArea
              v-model:value="formState.effectDescription"
              :disabled="isView"
              :rows="3"
              :maxlength="500"
              show-count
              class="flex-1"
              placeholder="请输入实施成效说明"
            />
          </div>
        </div>

        <!-- 上传改造前后对比照片（4 组，第 1 组必填） -->
        <div class="mt-16px flex items-start gap-8px">
          <div class="w-140px shrink-0 pt-4px text-right text-14px text-gray-700">
            <span class="text-#ff4d4f">*</span> 上传改造前后对比照片
          </div>
          <div class="grid flex-1 grid-cols-1 gap-12px md:grid-cols-2">
            <div
              v-for="(group, index) in photoGroups"
              :key="index"
              class="b-1 b-solid b-gray-100 rd-4px px-12px py-8px"
            >
              <div class="text-13px font-600 text-gray-700">
                第{{ index + 1 }}组<span v-if="index === 0" class="ml-4px text-12px text-#ff4d4f">必填</span>
              </div>
              <div class="mt-8px flex gap-16px">
                <div>
                  <div class="mb-4px text-12px text-gray-500">改造前</div>
                  <Upload
                    v-model:file-list="group.before"
                    list-type="picture-card"
                    multiple
                    accept="image/*"
                    :before-upload="() => false"
                    :disabled="isView"
                  >
                    <div v-if="!isView" class="flex flex-col items-center text-#1677ff">
                      <span class="i-ant-design:plus-outlined text-18px"></span>
                      <span class="mt-2px text-12px">上传</span>
                    </div>
                  </Upload>
                </div>
                <div>
                  <div class="mb-4px text-12px text-gray-500">改造后</div>
                  <Upload
                    v-model:file-list="group.after"
                    list-type="picture-card"
                    multiple
                    accept="image/*"
                    :before-upload="() => false"
                    :disabled="isView"
                  >
                    <div v-if="!isView" class="flex flex-col items-center text-#1677ff">
                      <span class="i-ant-design:plus-outlined text-18px"></span>
                      <span class="mt-2px text-12px">上传</span>
                    </div>
                  </Upload>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsePanel>

      <!-- ② 绩效评估结果 -->
      <CollapsePanel key="performance" header="绩效评估结果">
        <div class="flex items-center gap-8px">
          <div class="w-140px shrink-0 text-right text-14px text-gray-700">绩效评估结果</div>
          <Input
            v-model:value="formState.performanceResult"
            :disabled="isView"
            :maxlength="200"
            class="max-w-480px flex-1"
            placeholder="请输入评估结果"
          />
          <a-button v-if="!isView" @click="handleTodo('添加绩效评估材料')"> 添加绩效评估材料 </a-button>
        </div>
      </CollapsePanel>

      <!-- ③ 四好目标评价（勾选哪组展开哪块） -->
      <CollapsePanel key="fourGood" header="四好目标评价">
        <div class="flex items-center gap-8px">
          <div class="w-140px shrink-0 text-right text-14px text-gray-700">
            <span class="text-#ff4d4f">*</span> 选择完成的四好目标
          </div>
          <CheckboxGroup v-model:value="formState.selectedGoals" :options="fourGoodGoalOptions" :disabled="isView" />
        </div>

        <!-- 1.好房子基本信息 -->
        <div
          v-if="formState.selectedGoals.includes('好房子')"
          class="mt-12px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">1. 好房子基本信息</div>
          <div class="mt-8px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
            <div class="flex items-center gap-8px">
              <div class="w-120px shrink-0 text-right text-14px text-gray-700">达标数量（套）</div>
              <InputNumber
                v-model:value="formState.goodHouseCount"
                :min="0"
                :disabled="isView"
                class="flex-1"
                placeholder="请输入达标数量"
              />
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-120px shrink-0 text-right text-14px text-gray-700">房屋用途</div>
              <Select
                v-model:value="formState.houseUse"
                :options="houseUseOptions"
                :disabled="isView"
                allow-clear
                class="flex-1"
                placeholder="请选择房屋用途"
              />
            </div>
            <div class="flex items-start gap-8px md:col-span-2">
              <div class="w-120px shrink-0 pt-4px text-right text-14px text-gray-700">品质升级类型</div>
              <div class="flex flex-1 flex-col gap-8px">
                <div
                  v-for="(options, group) in QUALITY_UPGRADE_OPTIONS"
                  :key="group"
                  class="flex items-center gap-12px"
                >
                  <span class="w-70px shrink-0 text-13px text-gray-500">{{ group }}</span>
                  <CheckboxGroup
                    v-model:value="formState.qualityUpgrades"
                    :options="options.map((name) => ({ label: name, value: name }))"
                    :disabled="isView"
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-if="!isView" class="mt-12px flex gap-8px pl-128px">
            <a-button @click="handleTodo('佐证材料')"> 佐证材料 </a-button>
            <a-button @click="handleTodo('空间位置信息')"> 空间位置信息 </a-button>
          </div>
        </div>

        <!-- 2.好小区 / 3.好社区 / 4.好城区（达标数量 + 明细表，三块同构） -->
        <div
          v-if="formState.selectedGoals.includes('好小区')"
          class="mt-12px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="flex items-center justify-between">
            <div class="text-14px font-600 text-gray-800">2. 好小区基本信息</div>
            <div v-if="!isView" class="flex gap-8px">
              <a-button @click="handleTodo('添加小区')"> 添加小区 </a-button>
              <a-button @click="handleTodo('导出信息')"> 导出信息 </a-button>
            </div>
          </div>
          <div class="mt-8px flex items-center gap-8px">
            <div class="w-120px shrink-0 text-right text-14px text-gray-700">达标数量（个）</div>
            <InputNumber
              v-model:value="formState.goodCommunityCount"
              :min="0"
              :disabled="isView"
              class="w-200px"
              placeholder="请输入达标数量"
            />
          </div>
          <Table
            class="mt-12px"
            size="small"
            bordered
            row-key="name"
            :columns="unitColumns('小区名称')"
            :data-source="communityRows"
            :scroll="{ x: 1500 }"
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.dataIndex === 'geoLayer'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('空间位置图层')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'attachment'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('佐证附件')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('编辑')">编辑</span>
                <span class="mx-8px text-gray-300">|</span>
                <span class="cursor-pointer text-#1677ff" @click="handleDeleteUnitRow(communityRows, row)"> 删除 </span>
              </template>
            </template>
          </Table>
        </div>

        <div
          v-if="formState.selectedGoals.includes('好社区')"
          class="mt-12px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="flex items-center justify-between">
            <div class="text-14px font-600 text-gray-800">3. 好社区基本信息</div>
            <div v-if="!isView" class="flex gap-8px">
              <a-button @click="handleTodo('添加社区')"> 添加社区 </a-button>
              <a-button @click="handleTodo('导出信息')"> 导出信息 </a-button>
            </div>
          </div>
          <div class="mt-8px flex items-center gap-x-32px">
            <div class="flex items-center gap-8px">
              <div class="w-160px shrink-0 text-right text-14px text-gray-700">是否为好社区组成部分</div>
              <Switch v-model:checked="formState.isPartOfCommunity" :disabled="isView" />
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-120px shrink-0 text-right text-14px text-gray-700">达标数量（个）</div>
              <InputNumber
                v-model:value="formState.goodBlockCount"
                :min="0"
                :disabled="isView"
                class="w-200px"
                placeholder="请输入达标数量"
              />
            </div>
          </div>
          <Table
            class="mt-12px"
            size="small"
            bordered
            row-key="name"
            :columns="unitColumns('社区名称')"
            :data-source="blockRows"
            :scroll="{ x: 1500 }"
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.dataIndex === 'geoLayer'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('空间位置图层')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'attachment'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('佐证附件')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('编辑')">编辑</span>
                <span class="mx-8px text-gray-300">|</span>
                <span class="cursor-pointer text-#1677ff" @click="handleDeleteUnitRow(blockRows, row)"> 删除 </span>
              </template>
            </template>
          </Table>
        </div>

        <div
          v-if="formState.selectedGoals.includes('好城区')"
          class="mt-12px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">4. 好城区基本信息</div>
          <Table
            class="mt-12px"
            size="small"
            bordered
            row-key="name"
            :columns="unitColumns('城区名称')"
            :data-source="cityDistrictRows"
            :scroll="{ x: 1500 }"
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.dataIndex === 'geoLayer'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('空间位置图层')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'attachment'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('佐证附件')">查看</span>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <span class="cursor-pointer text-#1677ff" @click="handleTodo('编辑')">编辑</span>
                <span class="mx-8px text-gray-300">|</span>
                <span class="cursor-pointer text-#1677ff" @click="handleDeleteUnitRow(cityDistrictRows, row)">
                  删除
                </span>
              </template>
            </template>
          </Table>
        </div>
      </CollapsePanel>

      <!-- ④ 基本情况（项目流程进度条 + 资金三字段） -->
      <CollapsePanel key="basic" header="基本情况">
        <!-- 静态流程进度条：当前=③资金填报（只展示，不可切换） -->
        <div class="flex flex-wrap items-center gap-x-8px gap-y-8px">
          <template v-for="(step, index) in BASIC_STEPS" :key="step">
            <div class="flex items-center gap-8px">
              <span
                class="flex h-24px w-24px items-center justify-center rd-12px text-13px"
                :class="index <= CURRENT_BASIC_STEP ? 'bg-#1677ff text-white' : 'b-1 b-solid b-gray-300 text-gray-400'"
              >
                {{ index + 1 }}
              </span>
              <span class="text-14px" :class="index <= CURRENT_BASIC_STEP ? 'text-gray-800' : 'text-gray-400'">
                {{ step }}
              </span>
            </div>
            <span v-if="index < BASIC_STEPS.length - 1" class="text-gray-300">—</span>
          </template>
        </div>

        <div class="mt-16px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-3">
          <div>
            <div class="mb-4px text-right text-14px text-gray-700">本年完成投资额(亿元)</div>
            <Input :value="record.yearInvest" disabled />
            <div class="mt-2px text-right text-12px text-#ff4d4f">进度填报时自动带入</div>
          </div>
          <div>
            <div class="mb-4px text-right text-14px text-gray-700">投资统纳金额(万元)</div>
            <Input :value="statInvest" disabled />
          </div>
          <div>
            <div class="mb-4px text-right text-14px text-gray-700">是否可以作为REITs培育项目</div>
            <Select
              v-model:value="formState.reitsProject"
              :options="yesNoOptions"
              :disabled="isView"
              allow-clear
              placeholder="请选择"
            />
          </div>
        </div>
      </CollapsePanel>
    </Collapse>

    <!-- 底部按钮：查看=关闭；去评估=取消/暂存/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('暂存')"> 暂存 </a-button>
        <a-button type="primary" @click="handleSave('提交')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplEffectProjectManagementForm">
  import { computed, reactive, ref } from 'vue';
  import {
    CheckboxGroup,
    Collapse,
    CollapsePanel,
    DatePicker,
    Input,
    InputNumber,
    Select,
    Switch,
    Table,
    TextArea,
    Upload,
  } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    EFFECT_ITEMS,
    FOUR_GOOD_GOAL_OPTIONS,
    FOUR_GOOD_UNIT_ROWS,
    HOUSE_USE_OPTIONS,
    QUALITY_UPGRADE_OPTIONS,
    YES_NO_OPTIONS,
    fiveReformLabel,
    projectAffiliationLabel,
    type EffectItem,
    type FourGoodGoal,
    type FourGoodUnitRow,
    type HouseUse,
    type YesNo,
  } from '@jeesite/ifco/api/ifco/impl-effect';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<EffectItem>>({});

  /** 投资统纳金额（万元）= 实际完成投资（亿元）× 10000（计算只读展示） */
  const statInvest = computed(() =>
    (Math.round((record.value.actualInvest ?? 0) * 1000000) / 100).toLocaleString('zh-CN'),
  );

  // ── 折叠面板（默认全开） ─────────────────────────────────────────────
  const activeKeys = ref(['after', 'performance', 'fourGood', 'basic']);

  // ── 表单状态（抽屉打开时按行数据整体重建） ──────────────────────────
  const formState = reactive({
    evaluateDate: '',
    operatingOrg: '',
    effectDescription: '',
    performanceResult: '',
    selectedGoals: [] as FourGoodGoal[],
    goodHouseCount: undefined as number | undefined,
    houseUse: undefined as HouseUse | undefined,
    qualityUpgrades: [] as string[],
    goodCommunityCount: undefined as number | undefined,
    isPartOfCommunity: false,
    goodBlockCount: undefined as number | undefined,
    reitsProject: undefined as YesNo | undefined,
  });

  /** 对比照片 4 组（改造前/改造后；假数据文件名给灰底占位缩略图） */
  const PHOTO_THUMB =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="#eef1f5"/><text x="48" y="54" font-size="13" text-anchor="middle" fill="#9aa3af">照片</text></svg>',
    );

  const photoGroups = ref<{ before: UploadFile[]; after: UploadFile[] }[]>([]);

  function toFileList(names: string[], side: string, groupIndex: number): UploadFile[] {
    return names.map((name, index) => ({
      uid: `g${groupIndex}-${side}-${index}`,
      name,
      status: 'done',
      thumbUrl: PHOTO_THUMB,
    }));
  }

  // ── 好小区/好社区/好城区明细行（演示数据本地副本；删除仅本地） ──────
  const communityRows = ref<FourGoodUnitRow[]>([]);
  const blockRows = ref<FourGoodUnitRow[]>([]);
  const cityDistrictRows = ref<FourGoodUnitRow[]>([]);

  /** 明细表列（三表同构：首列名随表注入；操作列查看态隐藏） */
  function unitColumns(nameTitle: string) {
    const columns: Recordable[] = [
      { title: nameTitle, dataIndex: 'name', width: 140 },
      { title: '地址', dataIndex: 'address', width: 170 },
      { title: '总栋数(栋)', dataIndex: 'buildingCount', width: 90, align: 'right' },
      { title: '总套数(套)', dataIndex: 'householdCount', width: 90, align: 'right' },
      { title: '建筑面积(万㎡)', dataIndex: 'buildingArea', width: 110, align: 'right' },
      { title: '物业公司', dataIndex: 'propertyCompany', width: 150 },
      { title: '业委会信息', dataIndex: 'ownersCommittee', width: 90 },
      { title: '物业费标准(元/㎡·月)', dataIndex: 'propertyFee', width: 130, align: 'right' },
      { title: '配套设施覆盖率(%)', dataIndex: 'facilityCoverage', width: 130, align: 'right' },
      { title: '安全达标指数', dataIndex: 'safetyIndex', width: 100, align: 'right' },
      { title: '空间位置图层', dataIndex: 'geoLayer', width: 100 },
      { title: '佐证附件', dataIndex: 'attachment', width: 90 },
    ];
    if (!isView.value) {
      columns.push({ title: '操作', dataIndex: 'action', width: 100 });
    }
    return columns;
  }

  /** 明细行删除（仅本地演示，不写回行数据） */
  function handleDeleteUnitRow(rows: FourGoodUnitRow[], row: FourGoodUnitRow) {
    const index = rows.indexOf(row);
    if (index >= 0) rows.splice(index, 1);
  }

  const fourGoodGoalOptions = FOUR_GOOD_GOAL_OPTIONS.map((name) => ({ label: name, value: name }));
  const houseUseOptions = HOUSE_USE_OPTIONS.map((name) => ({ label: name, value: name }));
  const yesNoOptions = YES_NO_OPTIONS.map((name) => ({ label: name, value: name }));

  // ── 基本情况：静态流程进度条（当前=③资金填报） ──────────────────────
  const BASIC_STEPS = ['基本信息查看', '进度信息查看', '资金填报', '确认提交'];
  const CURRENT_BASIC_STEP = 2;

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<EffectItem>;

    formState.evaluateDate = record.value.evaluateDate ?? '';
    formState.operatingOrg = record.value.operatingOrg ?? '';
    formState.effectDescription = record.value.effectDescription ?? '';
    formState.performanceResult = record.value.performanceResult ?? '';
    formState.selectedGoals = [...(record.value.selectedGoals ?? [])];
    formState.goodHouseCount = record.value.goodHouseCount;
    formState.houseUse = record.value.houseUse;
    formState.qualityUpgrades = [...(record.value.qualityUpgrades ?? [])];
    formState.goodCommunityCount = record.value.goodCommunityCount;
    formState.isPartOfCommunity = record.value.isPartOfCommunity ?? false;
    formState.goodBlockCount = record.value.goodBlockCount;
    formState.reitsProject = record.value.reitsProject;

    photoGroups.value = Array.from({ length: 4 }, (_, index) => {
      const group = record.value.comparePhotos?.[index] ?? { before: [], after: [] };
      return { before: toFileList(group.before, 'before', index), after: toFileList(group.after, 'after', index) };
    });

    communityRows.value = FOUR_GOOD_UNIT_ROWS.好小区.map((row) => ({ ...row }));
    blockRows.value = FOUR_GOOD_UNIT_ROWS.好社区.map((row) => ({ ...row }));
    cityDistrictRows.value = FOUR_GOOD_UNIT_ROWS.好城区.map((row) => ({ ...row }));

    setDrawerProps({ loading: false });
  });

  /** 暂存 / 提交：提交校验必填（评估日期/第 1 组对比照片/四好目标），暂存不校验 */
  function handleSave(mode: '暂存' | '提交') {
    if (mode === '提交') {
      if (!formState.evaluateDate) {
        showMessage('请选择评估日期');
        return;
      }
      if (!photoGroups.value[0]?.before.length || !photoGroups.value[0]?.after.length) {
        showMessage('请上传第 1 组改造前、改造后对比照片');
        return;
      }
      if (!formState.selectedGoals.length) {
        showMessage('请选择完成的四好目标');
        return;
      }
    }
    const target = EFFECT_ITEMS.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.evaluateDate = formState.evaluateDate;
      target.operatingOrg = formState.operatingOrg;
      target.effectDescription = formState.effectDescription;
      target.performanceResult = formState.performanceResult;
      target.selectedGoals = [...formState.selectedGoals];
      target.goodHouseCount = formState.goodHouseCount;
      target.houseUse = formState.houseUse;
      target.qualityUpgrades = [...formState.qualityUpgrades];
      target.goodCommunityCount = formState.goodCommunityCount;
      target.isPartOfCommunity = formState.isPartOfCommunity;
      target.goodBlockCount = formState.goodBlockCount;
      target.reitsProject = formState.reitsProject;
      target.comparePhotos = photoGroups.value.map((group) => ({
        before: group.before.map((file) => file.name),
        after: group.after.map((file) => file.name),
      }));
      target.evaluateStatus = mode === '提交' ? '已完成' : '待评估';
    }
    showMessage(mode === '暂存' ? '暂存成功（状态保持待评估）' : '提交成功，成效评估已完成');
    closeDrawer();
    emit('success', target);
  }

  /** 占位操作（TODO：随材料上传/图层/导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
