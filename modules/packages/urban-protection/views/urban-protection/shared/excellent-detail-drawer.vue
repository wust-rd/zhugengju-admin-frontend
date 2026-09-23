<!--
  市住更局 —— 名城保护 · 优保建筑详情抽屉（在册列表/优保建筑管理共用）

  对齐老系统建筑详情页字段：基本信息（行政区/原名/现名/坐落/年代/面积/产权人/
  保护等级/公布批次/公布时间/街道/社区/责任单位及电话/监管负责人/社区巡查负责人/
  业主/文物级别/地标码/坐标/责任书状态）+ 简介/基本信息/建筑详情/英文介绍文本块。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="60%" @register="registerDrawer" :showFooter="false">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <Descriptions v-if="record" :column="2" bordered size="small">
        <DescriptionsItem label="所在行政区">{{ record.xzqName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="保护等级">{{ protectLevelLabel(record.protectLeve) || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑原名称" :span="2">{{ record.jzOldName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑现使用名称" :span="2">{{ record.jzNowName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑坐落" :span="2">{{ record.jzLoccation || '—' }}</DescriptionsItem>
        <DescriptionsItem label="公布批次">{{ batchLabel(record.publishPc) || '—' }}</DescriptionsItem>
        <DescriptionsItem label="公布时间">{{ record.publishTime || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建成年份">{{ record.buildYear || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑面积(平方米)">{{ record.jzArar || '—' }}</DescriptionsItem>
        <DescriptionsItem label="产权人">{{ record.cqr || '—' }}</DescriptionsItem>
        <DescriptionsItem label="文物级别">{{ record.relicLevel || '—' }}</DescriptionsItem>
        <DescriptionsItem label="所在街道">{{ record.jiedaoName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="所在社区">{{ record.szSq || '—' }}</DescriptionsItem>
        <DescriptionsItem label="责任工作部门">{{ record.zrGzBm || '—' }}</DescriptionsItem>
        <DescriptionsItem label="责任部门负责人">{{ record.zrGzBmFzr || '—' }}</DescriptionsItem>
        <DescriptionsItem label="责任部门电话">{{ record.zrGzBmTel || '—' }}</DescriptionsItem>
        <DescriptionsItem label="监管负责人">{{ record.jgFzr || '—' }}</DescriptionsItem>
        <DescriptionsItem label="社区巡查负责人">{{ record.sqXcFzr || '—' }}</DescriptionsItem>
        <DescriptionsItem label="社区巡查负责人电话">{{ record.sqXcFzrTel || '—' }}</DescriptionsItem>
        <DescriptionsItem label="业主">{{ record.zyz || '—' }}</DescriptionsItem>
        <DescriptionsItem label="业主电话">{{ record.zyzTel || '—' }}</DescriptionsItem>
        <DescriptionsItem label="坐标(经度,纬度)">
          {{ [record.locationY, record.locationX].filter(Boolean).join(', ') || '—' }}
        </DescriptionsItem>
        <DescriptionsItem label="责任书">
          <Tag :color="record.sfScZrz ? 'green' : 'default'">{{ record.sfScZrz ? '已上传' : '未上传' }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="巡查记录数">{{ record.xcCount }}</DescriptionsItem>
        <DescriptionsItem label="地标码">{{ record.dbm || '—' }}</DescriptionsItem>
        <DescriptionsItem label="新地标码" :span="2">{{ record.newDbm || '—' }}</DescriptionsItem>
        <DescriptionsItem v-if="record.js" label="简介" :span="2">
          <div class="whitespace-pre-wrap">{{ record.js }}</div>
        </DescriptionsItem>
        <DescriptionsItem v-if="record.jbxx" label="基本信息" :span="2">
          <div class="whitespace-pre-wrap">{{ record.jbxx }}</div>
        </DescriptionsItem>
        <DescriptionsItem v-if="record.buildingDet" label="建筑详情" :span="2">
          <div class="whitespace-pre-wrap">{{ record.buildingDet }}</div>
        </DescriptionsItem>
        <DescriptionsItem v-if="record.englishIntr" label="英文介绍" :span="2">
          <div class="whitespace-pre-wrap">{{ record.englishIntr }}</div>
        </DescriptionsItem>
      </Descriptions>
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedExcellentDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Tag, Descriptions, DescriptionsItem } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { fetchExcellentDetail, ExcellentRow } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import { protectLevelLabel, batchLabel } from './excellent-format';

  const { meta } = unref(router.currentRoute);

  const loading = ref(false);
  const record = ref<ExcellentRow | null>(null);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:home-outlined',
    value: '优保建筑详情',
  }));

  const [registerDrawer] = useDrawerInner(async (data: Recordable) => {
    loading.value = true;
    record.value = null;
    try {
      record.value = await fetchExcellentDetail(String(data.id));
    } finally {
      loading.value = false;
    }
  });
</script>
