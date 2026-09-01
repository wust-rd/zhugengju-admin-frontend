<!--
  市住更局 —— 指标项结果 show 页(容器)

  规划路由(RESTful,后端隐藏菜单,待注册):
   - 链接地址:/urban-health-check/urban/indicator-result/{id}(show 页;与 /list 静态段不冲突)
   - 组件位置:/urban-health-check/urban/indicator-result/indicator/list(与链接地址不一致,菜单里需显式填写)
   - 是否可见:隐藏;上级菜单挂「指标项结果管理」以点亮侧边栏
  页面结构:Card(体系信息+进度+提交发布) → Tabs(一级维度 dim-table / 指标项 indicator-table)。
  两个表格已拆分为独立组件,本文件只负责体系信息与布局。
-->
<template>
  <PageWrapper>
    <Card class="mb-3" :title="system?.indicatorName || systemId">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-gray-500">{{ system?.year ?? '-' }} 年</span>
          <Progress
            class="ml-6 w-72"
            :percent="filledPercent"
            :format="() => `已填报结果指标项 ${system?.filledCount ?? 0} / 指标数量 ${system?.indicatorCount ?? 0} 项`"
          />
        </div>
        <a-button type="primary" @click="handleSubmitPublish">提交发布</a-button>
      </div>
    </Card>
    <Tabs type="card">
      <Tabs.TabPane key="dim" tab="一级维度">
        <DimTable />
      </Tabs.TabPane>
      <Tabs.TabPane key="indicator" tab="指标项">
        <IndicatorTable :system="system" />
      </Tabs.TabPane>
    </Tabs>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorResultIndicatorList">
  import { computed, onMounted, unref } from 'vue';
  import { Card, Progress, Tabs } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { IndicatorResult } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { MOCK_LIST } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import DimTable from './dim-table.vue';
  import IndicatorTable from './indicator-table.vue';

  const { params } = unref(router.currentRoute);
  const systemId = (params.id as string) || '';

  const { showMessage } = useMessage();

  // TODO: 后端接入后改为按 id 调接口获取指标项结果信息
  const system: IndicatorResult | undefined = MOCK_LIST.find((item) => item.code === systemId);

  /** 页签标题默认取菜单名,这里改为体系名称 */
  const { setTitle } = useTabs(router);
  onMounted(() => {
    if (system?.indicatorName) {
      setTitle(`指标项结果-${system.indicatorName}`);
    }
  });

  /** 填报进度:已填报结果指标数 / 指标数量 */
  const filledPercent = computed(() => {
    const total = system?.indicatorCount ?? 0;
    if (!total) return 0;
    return Math.round(((system?.filledCount ?? 0) / total) * 10000) / 100;
  });

  /** 提交发布:提交当前体系形成版本快照(后端接入后实现,并刷新体系的提交状态) */
  function handleSubmitPublish() {
    // TODO: 后端接入后调用提交接口
    showMessage('提交发布:后端接入后实现');
  }
</script>
