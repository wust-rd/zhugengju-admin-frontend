<!--
  市住更局 —— 名城保护 · 优保推荐建筑详情抽屉

  对齐老系统「优保推荐建筑详情」：建筑位置/建筑名称/推荐人姓名/手机号码/
  推荐时间/推荐理由 六字段 + 照片缩略图（点击新窗口看原图）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="40%" @register="registerDrawer" :showFooter="false">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <Descriptions v-if="record" :column="1" bordered size="small" class="mb-4">
        <DescriptionsItem label="建筑位置">{{ record.jzwz || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑名称">{{ record.jzmc || '—' }}</DescriptionsItem>
        <DescriptionsItem label="推荐人姓名">{{ record.tjrxm || '—' }}</DescriptionsItem>
        <DescriptionsItem label="手机号码">{{ record.sjhm || '—' }}</DescriptionsItem>
        <DescriptionsItem label="推荐时间">{{ fmtDate(record.tjsj) || '—' }}</DescriptionsItem>
        <DescriptionsItem label="推荐理由">
          <div class="whitespace-pre-wrap">{{ record.tjly || '—' }}</div>
        </DescriptionsItem>
      </Descriptions>

      <div v-if="record" class="mb-2 font-medium">照片（{{ photos.length }} 张）</div>
      <div v-if="photos.length" class="grid grid-cols-3 gap-2">
        <a v-for="(photo, index) in photos" :key="index" :href="photo.url" target="_blank" :title="photo.name">
          <img
            :src="photo.url"
            :alt="photo.name"
            loading="lazy"
            class="h-28 w-full rounded border border-gray-200 object-cover"
          />
        </a>
      </div>
      <a-empty v-else-if="record" description="暂无照片" />
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRecommendationDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Descriptions, DescriptionsItem } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import {
    fetchRecommendDetail,
    parseRecommendPhotos,
    RecommendRow,
  } from '@jeesite/urban-protection/api/urban-protection/recommend';
  import { fmtDate } from '../../shared/excellent-format';

  const { meta } = unref(router.currentRoute);

  const loading = ref(false);
  const record = ref<RecommendRow | null>(null);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:like-outlined',
    value: '优保推荐建筑详情',
  }));

  const photos = computed(() => parseRecommendPhotos(record.value?.photos));

  const [registerDrawer] = useDrawerInner(async (data: Recordable) => {
    loading.value = true;
    record.value = null;
    try {
      record.value = await fetchRecommendDetail(String(data.id));
    } finally {
      loading.value = false;
    }
  });
</script>
