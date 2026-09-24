<!--
  片区更新后评估 —— 评估页（两个 tab：成效指标对比 / 满意度分析）

  成效指标对比：上块两张雷达图（左固定「项目进度」，右下拉切换直接/间接经济效益、社会效益；
               项目进度与直接经济效益的「更新前」本期不填，故这两张图只画「更新后」一个系列），
               下块图 1 的 28 行指标表（只填更新前/更新后，提升现算）+ 图 2 的评估结论与更新后效果图；
  满意度分析：  上块左「一级维度提升成效」柱状图 + 右「二级维度提升成效」雷达图（下拉按一级维度筛选），
               下块图 4 的 13 行满意度表；
  两个 tab 的表格右上角都有「暂存 / 保存」：都提交后端（内容一致），保存后返回列表、暂存留在本页。

  数据：GET /a/esp/postEval/detail（编辑/查看）；新增时用 GET /a/esp/postEval/catalog 构造空白表格；
       POST /a/esp/postEval/save（暂存与保存同一接口）；效果图走 POST /a/esp/file/upload。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- 头部：返回 + 片区 + 年份 -->
    <div class="flex items-center gap-16px bg-white rd-8px px-24px py-14px shadow-sm">
      <a-button @click="emit('back')">返回</a-button>
      <span class="text-16px font-500 text-gray-800">片区更新后评估</span>
      <span class="text-14px text-gray-600">{{ record.areaName }}</span>
      <span class="text-14px text-gray-500">评估年份：{{ record.evalYear }}</span>
      <span v-if="readonly" class="ml-auto text-14px text-gray-400">查看模式</span>
    </div>

    <Spin :spinning="loading">
      <Tabs v-model:activeKey="activeTab">
        <!-- ① 成效指标对比 -->
        <Tabs.TabPane key="indicator" tab="成效指标对比">
          <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
            <div class="bg-white rd-8px p-16px shadow-sm">
              <div class="mb-8px text-15px font-500 text-gray-800">项目进度</div>
              <!-- 项目进度的「更新前」本期不填，故只画「更新后」一个系列 -->
              <PostEvalRadar
                :labels="progressSeries.labels"
                :before="progressSeries.before"
                :after="progressSeries.after"
                :hide-before="isBeforeLocked(INDICATOR_PROGRESS_LV1)"
              />
            </div>
            <div class="bg-white rd-8px p-16px shadow-sm">
              <div class="mb-8px flex items-center">
                <span class="text-15px font-500 text-gray-800">提升成效</span>
                <Select v-model:value="indicatorDim" :options="indicatorDimOptions" class="ml-auto w-160px" />
              </div>
              <PostEvalRadar
                :labels="dimSeries.labels"
                :before="dimSeries.before"
                :after="dimSeries.after"
                :hide-before="isBeforeLocked(indicatorDim)"
              />
            </div>
          </div>

          <div class="mt-16px bg-white rd-8px p-16px shadow-sm">
            <div class="mb-12px flex items-center">
              <span class="text-15px font-500 text-gray-800">成效指标对比</span>
              <div v-if="!readonly" class="ml-auto flex gap-8px">
                <a-button :loading="saving" @click="handleSubmit(false)">暂存</a-button>
                <a-button type="primary" :loading="saving" @click="handleSubmit(true)">保存</a-button>
              </div>
            </div>
            <IndicatorTable :rows="indicators" :readonly="readonly" />

            <div class="mt-20px">
              <div class="mb-8px text-14px font-500 text-gray-800">片区更新后评估结论</div>
              <TextArea
                v-model:value="conclusion"
                :rows="4"
                :maxlength="500"
                show-count
                :disabled="readonly"
                placeholder="请输入，不超过500字"
              />
            </div>

            <div class="mt-20px">
              <div class="mb-8px text-14px font-500 text-gray-800">片区更新后效果图：</div>
              <div class="flex flex-wrap items-start gap-12px">
                <div
                  v-for="(file, index) in effectFiles"
                  :key="file.url || file.name || String(index)"
                  class="relative h-96px w-96px overflow-hidden rd-4px b-1 b-solid b-gray-200"
                >
                  <img v-if="file.url" :src="file.url" :alt="file.name" class="h-full w-full object-cover" />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center px-4px text-center text-12px text-gray-400"
                  >
                    {{ file.name }}
                  </div>
                  <span
                    v-if="!readonly"
                    class="absolute right-0 top-0 flex h-18px w-18px cursor-pointer items-center justify-center bg-black/50 text-white"
                    @click="removeEffectFile(index)"
                  >
                    <span class="i-ant-design:close-outlined text-12px"></span>
                  </span>
                </div>
                <Upload
                  v-if="!readonly"
                  :show-upload-list="false"
                  accept="image/*"
                  multiple
                  :before-upload="handleEffectUpload"
                >
                  <div
                    class="flex h-96px w-96px cursor-pointer flex-col items-center justify-center gap-4px rd-4px b-1 b-dashed b-gray-300 text-gray-400 hover:b-[#1677ff] hover:text-[#1677ff]"
                  >
                    <span class="i-ant-design:plus-outlined text-16px"></span>
                    <span class="text-12px">上传附件</span>
                  </div>
                </Upload>
              </div>
              <div v-if="readonly && !effectFiles.length" class="text-14px text-gray-400">无</div>
            </div>
          </div>
        </Tabs.TabPane>

        <!-- ② 满意度分析 -->
        <Tabs.TabPane key="satisfaction" tab="满意度分析">
          <div class="grid grid-cols-1 gap-16px lg:grid-cols-2">
            <div class="bg-white rd-8px p-16px shadow-sm">
              <div class="mb-8px text-15px font-500 text-gray-800">一级维度提升成效</div>
              <PostEvalBar :groups="barGroups" :before="barBefore" :after="barAfter" />
            </div>
            <div class="bg-white rd-8px p-16px shadow-sm">
              <div class="mb-8px flex items-center">
                <span class="text-15px font-500 text-gray-800">二级维度提升成效</span>
                <Select v-model:value="satisfactionLv1" :options="satisfactionDimOptions" class="ml-auto w-140px" />
              </div>
              <PostEvalRadar
                :labels="satisfactionChart.labels"
                :before="satisfactionChart.before"
                :after="satisfactionChart.after"
              />
            </div>
          </div>

          <div class="mt-16px bg-white rd-8px p-16px shadow-sm">
            <div class="mb-12px flex items-center">
              <span class="text-15px font-500 text-gray-800">片区更新后评估满意度分析表</span>
              <div v-if="!readonly" class="ml-auto flex gap-8px">
                <a-button :loading="saving" @click="handleSubmit(false)">暂存</a-button>
                <a-button type="primary" :loading="saving" @click="handleSubmit(true)">保存</a-button>
              </div>
            </div>
            <SatisfactionTable :rows="satisfactions" :readonly="readonly" />
          </div>
        </Tabs.TabPane>
      </Tabs>
    </Spin>
  </div>
</template>
<script lang="ts" setup name="AreaPostEvalEvaluate">
  import { computed, onMounted, ref } from 'vue';
  import { Select, Spin, Tabs, TextArea, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type {
    EspPostEvalIndicatorValue,
    EspPostEvalSatisfactionValue,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import {
    postEvalCatalog,
    postEvalDetail,
    postEvalSave,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
  import {
    espFileUpload,
    type EspSchemeFile,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import IndicatorTable from './indicator-table.vue';
  import SatisfactionTable from './satisfaction-table.vue';
  import { PostEvalBar } from './components/post-eval-bar';
  import { PostEvalRadar } from './components/post-eval-radar';
  import {
    INDICATOR_CHART_DIMENSIONS,
    INDICATOR_PROGRESS_LV1,
    SATISFACTION_ALL,
    SATISFACTION_LV1_ORDER,
    groupAverage,
    indicatorSeries,
    indicatorsOfLv1,
    isBeforeLocked,
    satisfactionSeries,
    satisfactionsOfLv1,
    type PostEvalTarget,
  } from './shared';

  const props = defineProps<{
    /** 评估对象：编辑/查看带 id，新增只有片区 + 年份 */
    record: PostEvalTarget;
    /** 查看模式：全部只读、隐藏暂存/保存与上传 */
    readonly?: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'back'): void;
    /** stay=true 暂存（留在本页）；stay=false 保存（父级回列表并刷新）；id 为落库主键（新增后回填，避免二次暂存重复新增） */
    (e: 'saved', payload: { stay: boolean; id: string }): void;
  }>();

  const { showMessage } = useMessage();

  const loading = ref(false);
  const saving = ref(false);
  const activeTab = ref('indicator');

  /** 成效指标行 / 满意度行（父级持有传给表格，表格直接改这两个数组的元素） */
  const indicators = ref<EspPostEvalIndicatorValue[]>([]);
  const satisfactions = ref<EspPostEvalSatisfactionValue[]>([]);
  const conclusion = ref('');
  const effectFiles = ref<EspSchemeFile[]>([]);

  /** 右上雷达图下拉：成效指标的三/四个一级维度 */
  const indicatorDim = ref<string>(INDICATOR_CHART_DIMENSIONS[0]);
  /** 右上雷达图下拉：满意度的一级维度（含「全部」） */
  const satisfactionLv1 = ref<string>(SATISFACTION_ALL);

  // ── 图表数据（全部由表格行现算，表格一改图表即刷新）──────────────

  const progressSeries = computed(() => indicatorSeries(indicatorsOfLv1(indicators.value, INDICATOR_PROGRESS_LV1)));
  const dimSeries = computed(() => indicatorSeries(indicatorsOfLv1(indicators.value, indicatorDim.value)));
  const indicatorDimOptions = computed(() =>
    INDICATOR_CHART_DIMENSIONS.filter((dim) => indicators.value.some((row) => row.lv1 === dim)).map((dim) => ({
      label: dim,
      value: dim,
    })),
  );

  /** 满意度一级维度（按清单里实际存在的分组，保持四好顺序） */
  const barGroups = computed(() =>
    SATISFACTION_LV1_ORDER.filter((lv1) => satisfactions.value.some((row) => row.lv1 === lv1)),
  );
  /** 一级维度柱状图：各分组更新前/更新后满意度的均值（忽略未填写） */
  const barBefore = computed(() =>
    barGroups.value.map((lv1) => groupAverage(satisfactionsOfLv1(satisfactions.value, lv1).map((row) => row.beforeScore))),
  );
  const barAfter = computed(() =>
    barGroups.value.map((lv1) => groupAverage(satisfactionsOfLv1(satisfactions.value, lv1).map((row) => row.afterScore))),
  );
  const satisfactionChart = computed(() =>
    satisfactionSeries(satisfactionsOfLv1(satisfactions.value, satisfactionLv1.value)),
  );
  const satisfactionDimOptions = computed(() => [
    { label: '全部', value: SATISFACTION_ALL },
    ...SATISFACTION_LV1_ORDER.filter((lv1) => satisfactions.value.some((row) => row.lv1 === lv1)).map((lv1) => ({
      label: lv1,
      value: lv1,
    })),
  ]);

  // ── 数据加载 ───────────────────────────────────────────────────────

  onMounted(load);

  /** 编辑/查看取明细；新增按清单构造空白行（后端存的是清单全量） */
  async function load() {
    loading.value = true;
    try {
      if (props.record.id) {
        const detail = await postEvalDetail(props.record.id);
        indicators.value = detail.indicators ?? [];
        satisfactions.value = detail.satisfactions ?? [];
        conclusion.value = detail.conclusion ?? '';
        effectFiles.value = detail.effectFiles ?? [];
      } else {
        const catalog = await postEvalCatalog();
        indicators.value = (catalog.indicators ?? []).map((def) => ({ ...def, beforeValue: null, afterValue: null }));
        satisfactions.value = (catalog.satisfactions ?? []).map((def) => ({
          ...def,
          beforeScore: null,
          afterScore: null,
        }));
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '评估数据加载失败');
    } finally {
      loading.value = false;
    }
  }

  // ── 效果图上传 ─────────────────────────────────────────────────────

  function handleEffectUpload(file: File) {
    void uploadEffectFile(file);
    return false;
  }

  async function uploadEffectFile(file: File) {
    try {
      const uploaded = await espFileUpload(file);
      effectFiles.value.push(uploaded);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '上传失败');
    }
  }

  function removeEffectFile(index: number) {
    effectFiles.value.splice(index, 1);
  }

  // ── 暂存 / 保存（提交内容一致，只有「保存」后回列表）────────────────

  async function handleSubmit(backToList: boolean) {
    if (saving.value) return;
    if (conclusion.value && conclusion.value.length > 500) {
      showMessage('评估结论不能超过 500 字');
      return;
    }
    saving.value = true;
    try {
      const saved = await postEvalSave({
        id: props.record.id,
        aUid: props.record.aUid,
        evalYear: props.record.evalYear,
        conclusion: conclusion.value,
        effectFiles: effectFiles.value,
        indicators: indicators.value.map((row) => ({
          code: row.code,
          beforeValue: row.beforeValue,
          afterValue: row.afterValue,
        })),
        satisfactions: satisfactions.value.map((row) => ({
          code: row.code,
          beforeScore: row.beforeScore,
          afterScore: row.afterScore,
        })),
      });
      showMessage(backToList ? '保存成功' : '已暂存');
      emit('saved', { stay: !backToList, id: saved?.id ?? '' });
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      saving.value = false;
    }
  }
</script>
