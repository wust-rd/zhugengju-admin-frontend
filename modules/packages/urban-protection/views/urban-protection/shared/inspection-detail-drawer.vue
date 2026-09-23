<!--
  市住更局 —— 名城保护 · 巡查记录详情抽屉（优保/拟优保巡查共用）

  对齐老系统「查看巡查/查看详情」页字段：建筑区划、建筑原名称、是否特别关注、
  巡查人、录入/巡查时间、录入类型、是否上报、巡查结果、巡查问题、房屋现状，
  以及巡查照片（MinIO URL 直连加载，九宫格缩略，点击新窗口看原图）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="50%" @register="registerDrawer" :showFooter="false">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <Descriptions v-if="record" :column="2" bordered size="small" class="mb-4">
        <DescriptionsItem label="区划">{{ record.qu || '—' }}</DescriptionsItem>
        <DescriptionsItem label="建筑原名称">{{ record.jzOldName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="是否特别关注">
          <Tag :color="record.sfTbgz ? 'red' : 'default'">{{ record.sfTbgz ? '是' : '否' }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="巡查人">{{ record.xcUserName || '—' }}</DescriptionsItem>
        <DescriptionsItem label="录入时间">{{ fmtDateTime(record.czTime) || '—' }}</DescriptionsItem>
        <DescriptionsItem label="巡查时间">{{ fmtDate(record.xcTime) || '—' }}</DescriptionsItem>
        <DescriptionsItem label="录入类型">{{ record.typeView }}</DescriptionsItem>
        <DescriptionsItem label="是否上报">
          <Tag :color="record.sfSb ? 'green' : 'default'">{{ record.sfSb ? '已上报' : '未上报' }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="巡查结果" :span="2">
          <div class="whitespace-pre-wrap">{{ record.xcContent || '—' }}</div>
        </DescriptionsItem>
        <DescriptionsItem label="巡查问题" :span="2">
          <div class="whitespace-pre-wrap">{{ record.xcWt || '无' }}</div>
        </DescriptionsItem>
        <DescriptionsItem v-if="record.houseXz" label="房屋现状" :span="2">
          {{ record.houseXz }}
        </DescriptionsItem>
      </Descriptions>

      <div v-if="record" class="mb-2 font-medium">图片信息（{{ record.photos?.length ?? 0 }} 张）</div>
      <div v-if="record?.photos?.length" class="grid grid-cols-3 gap-2">
        <a
          v-for="(photo, index) in record.photos"
          :key="index"
          :href="photo.url"
          target="_blank"
          :title="photo.fileName || '巡查照片'"
        >
          <img
            :src="photo.url"
            :alt="photo.fileName"
            loading="lazy"
            class="h-28 w-full rounded border border-gray-200 object-cover"
          />
        </a>
      </div>
      <a-empty v-else-if="record" description="暂无巡查照片" />
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedInspectionDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Tag, Descriptions, DescriptionsItem } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { fetchInspectionDetail, InspectionRow } from '@jeesite/urban-protection/api/urban-protection/inspection';
  import { fmtDate, fmtDateTime } from './excellent-format';

  const { meta } = unref(router.currentRoute);

  const loading = ref(false);
  const record = ref<InspectionRow | null>(null);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:file-search-outlined',
    value: '巡查记录详情',
  }));

  const [registerDrawer] = useDrawerInner(async (data: Recordable) => {
    loading.value = true;
    record.value = null;
    try {
      record.value = await fetchInspectionDetail(String(data.id));
    } finally {
      loading.value = false;
    }
  });
</script>
