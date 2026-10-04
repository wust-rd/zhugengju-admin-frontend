<!--
  市住更局 —— 指标项结果 show 页(容器)

  路由(RESTful,后端隐藏菜单,已注册):
   - 链接地址:/urban-health-check/urban/indicator-result/{id}({id}=体系主键)
   - 组件位置:/urban-health-check/urban/indicator-result/_id/list
  页面结构:Card(体检年份+填报进度+预警数+提交指标结果) → Tabs(一级维度 dim-table / 指标项 indicator-table)。
  接口已接入：indicatorResultStatById（头部统计卡）+ indicatorListBySet（联表2 补维度/数据来源）+
  indicatorResultSubmit（逐行提交，头部「提交指标结果」批量驱动）。
  「提交指标结果」= 提交该体系全部未提交的结果行；未填写完整的行后端校验报错并逐条提示。
-->
<template>
  <PageWrapper>
    <Card class="mb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="mr-3 text-base font-medium">{{ system?.indicatorName || '指标项结果' }}</span>
          <span class="text-gray-500">体检年份：{{ system?.year ?? '-' }}年</span>
          <Progress
            class="ml-6 w-80"
            :percent="filledPercent"
            :format="
              () => `已填报指标项 ${system?.filledCount ?? 0} 项 / 系统指标项 ${system?.indicatorCount ?? 0} 项`
            "
          />
          <span class="ml-6">
            预警指标项：<span class="font-medium" style="color: #cf1322">{{ system?.warningCount ?? 0 }}项</span>
          </span>
        </div>
        <a-button type="primary" :loading="submitting" @click="handleSubmitAll">提交指标结果</a-button>
      </div>
    </Card>
    <Tabs v-model:activeKey="activeTab" type="card">
      <Tabs.TabPane key="dim" tab="一级维度">
        <DimTable :set-id="systemId" />
      </Tabs.TabPane>
      <Tabs.TabPane key="indicator" tab="指标项">
        <IndicatorTable ref="indicatorTableRef" :set-id="systemId" @refresh-stat="loadStat" />
      </Tabs.TabPane>
    </Tabs>
  </PageWrapper>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultIdList">
  import { computed, h, onActivated, onMounted, ref, unref } from 'vue';
  import { Card, Modal, Progress, Tabs } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { IndicatorResult, IndicatorResultRow } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import {
    indicatorResultStatById,
    indicatorResultListBySet,
    indicatorResultSubmit,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import DimTable from './dim-table.vue';
  import IndicatorTable from './indicator-table.vue';

  const { params, query } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const systemId = ((params.id ?? params.code) as string) || '';

  const { showMessage, createMessage } = useMessage();
  const { setTitle } = useTabs(router);

  /**
   * 激活的 tab（受控）：从指标项编辑页返回时按 query.tab=indicator 恢复，
   * 避免 keep-alive 重建/非受控 Tabs 回落到默认的一级维度
   */
  const activeTab = ref<'dim' | 'indicator'>(query.tab === 'indicator' ? 'indicator' : 'dim');

  /** 体系结果统计（按体系主键取单行：filledCount/indicatorCount 驱动进度卡） */
  const system = ref<IndicatorResult | undefined>();

  /** 指标项 tab 组件引用（批量提交后刷新列表） */
  const indicatorTableRef = ref<InstanceType<typeof IndicatorTable>>();

  onMounted(loadStat);

  /** 标签页激活时刷新头部统计（从指标项编辑页保存返回后数据最新）；首次激活跳过 */
  let skipFirstActivate = true;
  onActivated(() => {
    if (skipFirstActivate) {
      skipFirstActivate = false;
      return;
    }
    loadStat();
  });

  async function loadStat() {
    try {
      system.value = await indicatorResultStatById(systemId);
      if (system.value?.indicatorName) {
        setTitle(`编辑 · ${system.value.indicatorName}`);
      }
    } catch (e: any) {
      showMessage(e?.message || '加载统计信息失败', 'error');
    }
  }

  /** 填报进度:已填报结果指标数 / 指标数量 */
  const filledPercent = computed(() => {
    const total = system.value?.indicatorCount ?? 0;
    if (!total) return 0;
    return Math.min(100, Math.round(((system.value?.filledCount ?? 0) / total) * 10000) / 100);
  });

  /** 提交指标结果：遍历提交该体系全部未提交的结果行（后端逐行校验指标值/评估结果） */
  const submitting = ref(false);
  function handleSubmitAll() {
    Modal.confirm({
      title: '提交指标结果',
      content: '将提交该体系全部未提交的指标项结果，未填写完整的项会提交失败并提示原因。确定提交吗？',
      onOk: () => doSubmitAll(),
    });
  }

  async function doSubmitAll() {
    submitting.value = true;
    try {
      const rows = (await indicatorResultListBySet(systemId)) as (IndicatorResultRow & Recordable)[];
      const pending = rows.filter((r) => r.submitStatus !== 1);
      if (!pending.length) {
        createMessage.info('没有待提交的指标项结果');
        return;
      }
      const errors: string[] = [];
      let ok = 0;
      for (const row of pending) {
        try {
          await indicatorResultSubmit(row.id);
          ok++;
        } catch (e: any) {
          errors.push(`「${row.indicatorName}」${e?.message || '提交失败'}`);
        }
      }
      if (errors.length) {
        createMessage.warning(
          {
            content: h('div', [
              h('div', `提交成功 ${ok} 项，失败 ${errors.length} 项：`),
              h(
                'ul',
                { style: 'max-height:180px;overflow:auto;margin:4px 0 0;padding-left:18px' },
                errors.slice(0, 20).map((t) => h('li', t)),
              ),
            ]),
            duration: 6,
          },
        );
      } else {
        showMessage(`提交成功（共 ${ok} 项）`);
      }
      await Promise.all([loadStat(), indicatorTableRef.value?.reload()]);
    } finally {
      submitting.value = false;
    }
  }
</script>
