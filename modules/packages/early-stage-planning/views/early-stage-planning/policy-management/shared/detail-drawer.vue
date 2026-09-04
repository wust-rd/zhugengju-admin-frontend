<!--
  市住更局 —— 政策检索 详情抽屉(检索两页共用,只读)

  打开时按 code 拉取详情(/api/v1/policies/{id},含版本变更记录)与同领域政策,
  元数据用框架 Description 组件展示;命中片段按查询词高亮;
  文件预览 = 新标签页打开,文件下载 = file-saver(fetch → blob → saveAs)。
  关联政策点击跳转政策分类导航页查看抽屉(?code=)。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    force-render
    width="60%"
    :show-footer="false"
    title="政策详情"
    @register="registerDrawer"
  >
    <Description @register="registerDesc" />

    <!-- 命中片段 -->
    <div v-if="policy?.snippet" class="mt-3">
      <div class="mb-1 text-14px font-semibold">命中片段</div>
      <div class="text-13px leading-6 text-gray-600">
        <template v-for="(seg, i) in segments(policy.snippet || '', terms)" :key="i">
          <mark v-if="seg.hit" class="bg-yellow-200 px-0">{{ seg.text }}</mark>
          <template v-else>{{ seg.text }}</template>
        </template>
      </div>
    </div>

    <div class="mt-3 flex gap-2">
      <a-button size="small" @click="handlePreview"> 文件预览 </a-button>
      <a-button size="small" :loading="downloading" @click="handleDownload"> 文件下载 </a-button>
    </div>

    <!-- 版本变更记录 -->
    <h3 class="mt-4 mb-2 text-15px font-semibold">版本变更记录</h3>
    <Table
      size="small"
      :columns="versionColumns"
      :data-source="versions"
      :pagination="false"
      :scroll="{ x: 600 }"
    >
      <template #emptyText>
        <span class="text-gray-400">{{ loaded ? '暂无' : '加载中…' }}</span>
      </template>
    </Table>

    <!-- 关联政策 -->
    <h3 class="mt-4 mb-2 text-15px font-semibold">关联政策</h3>
    <div>
      <a v-for="rel in related" :key="rel.code" class="mb-1 block text-13px" @click="openPolicy(rel)">
        {{ rel.title }}
      </a>
      <div v-if="!related.length && loaded" class="text-xs text-gray-400">暂无同领域其他政策</div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup>
  import { ref } from 'vue';
  import { Table } from 'antdv-next';
  import { saveAs } from 'file-saver';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Description, useDescription } from '@jeesite/core/components/Description';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Policy, PolicyVersion } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import {
    policyFileUrl,
    policyInfo,
    policyList,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import { segments } from './highlight';

  const go = useGo();
  const { showMessage } = useMessage();

  const policy = ref<Policy>();
  const versions = ref<PolicyVersion[]>([]);
  const related = ref<Policy[]>([]);
  const loaded = ref(false);
  const terms = ref<string[]>([]);
  const downloading = ref(false);

  /** 版本变更记录表列(只读) */
  const versionColumns = [
    { title: '文件版本', dataIndex: 'fileVersion', width: 120 },
    { title: '变更日期', dataIndex: 'changeDate', width: 140 },
    { title: '变更部门', dataIndex: 'changeDept' },
    { title: '操作人', dataIndex: 'operator', width: 120 },
  ];

  /** 元数据(空值填 /) */
  const descSchema = [
    { label: '标题', field: 'title' },
    { label: '文号', field: 'docNo' },
    { label: '政策层级', field: 'policyLevelLabel' },
    { label: '政策类型', field: 'policyTypeLabel' },
    { label: '业务领域', field: 'businessAreaLabel' },
    { label: '发布日期', field: 'publishDate' },
    { label: '发布单位', field: 'sourceOrg' },
    { label: '废止时间', field: 'abolishDate' },
    { label: '时效状态', field: 'timeStatusLabel' },
    { label: '关键词标签', field: 'keywords' },
    { label: '适用片区/项目类型标签', field: 'areaTags' },
    { label: '适用阶段标签', field: 'phaseTags' },
  ];

  const [registerDesc, { setDescProps }] = useDescription({
    schema: descSchema,
    data: {},
  });

  const [registerDrawer] = useDrawerInner(async (data: any) => {
    policy.value = data?.policy || {};
    terms.value = data?.terms || [];
    versions.value = [];
    related.value = [];
    loaded.value = false;
    setDescProps({
      data: {
        ...policy.value,
        ...Object.fromEntries(descSchema.map((item) => [item.field, policy.value?.[item.field] || '/'])),
      },
    });

    // 详情(含版本记录)与同领域政策并发拉取;仅携带 code 时(如收藏列表)也可正常打开
    const current = policy.value as Policy;
    const [info, rel] = await Promise.all([
      current.code ? policyInfo(current.code) : Promise.resolve(current),
      policyList({ submitStatus: 'submitted', businessArea: current.businessArea, pageSize: 8 }),
    ]);
    versions.value = (info as Policy).versions || [];
    related.value = rel.list
      .filter((row) => row.code !== current.code && row.timeStatus !== 'abolished')
      .slice(0, 5);
    loaded.value = true;
  });

  /** 文件预览(新标签页打开) */
  function handlePreview() {
    if (!policy.value?.fileId) {
      showMessage('没有文件');
      return;
    }
    window.open(policyFileUrl(policy.value.fileId, true), '_blank');
  }

  /** 文件下载(file-saver:fetch → blob → saveAs) */
  async function handleDownload() {
    if (!policy.value?.fileId) {
      showMessage('没有文件');
      return;
    }
    downloading.value = true;
    try {
      const res = await fetch(policyFileUrl(policy.value.fileId));
      saveAs(await res.blob(), policy.value.fileName || '政策文件');
    } finally {
      downloading.value = false;
    }
  }

  /** 跳转政策分类导航页并打开查看抽屉(?code= 传业务编码) */
  function openPolicy(item: Policy) {
    go(`/early-stage-planning/policy-management/classified-navigation/list?code=${item.code}`);
  }
</script>
