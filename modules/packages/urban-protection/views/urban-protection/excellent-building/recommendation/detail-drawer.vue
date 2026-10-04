<!--
  市住更局 —— 名城保护 · 优保推荐建筑详情抽屉

  UI 对齐 sys/post/form.vue 表单风格（BasicForm 只读双列表单，无分组小标题），
  整表 disabled 只读、无底部按钮；照片区保留原缩略图网格（点击新窗口看原图）。
  打开时序：list.vue 用 openDrawer(false, { id }) 只传数据不掀开；
  本组件异步取数回填后末尾 setDrawerProps({ open: true }) 才掀开（防闪烁）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="70%" force-render :showFooter="false" @register="registerDrawer">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <BasicForm @register="registerForm">
        <template #photos>
          <!-- 框线容器对齐禁用 Input 的视觉：边框 + 圆角 + 灰底，宽度撑满内容列 -->
          <div class="w-full rounded border border-gray-300 bg-gray-50 p-2">
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
            <a-empty v-else description="暂无照片" />
          </div>
        </template>
      </BasicForm>
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRecommendationDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Empty as AEmpty, Spin as ASpin } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
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

  const inputFormSchemas: FormSchema[] = [
    { label: '建筑名称', field: 'jzmc', component: 'Input', colProps: { md: 24, lg: 24 } },
    { label: '建筑位置', field: 'jzwz', component: 'Input', colProps: { md: 24, lg: 24 } },
    { label: '推荐人姓名', field: 'tjrxm', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '手机号码', field: 'sjhm', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '推荐时间', field: 'tjsj', component: 'Input', colProps: { md: 24, lg: 12 } },
    {
      label: '推荐理由',
      field: 'tjly',
      component: 'InputTextArea',
      componentProps: { rows: 4 },
      colProps: { md: 24, lg: 24 },
    },
    {
      // 照片以自定义插槽挂进表单项，label 与其他字段同列对齐
      label: '推荐建筑图片信息',
      field: 'photos',
      component: 'Input',
      slot: 'photos',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue }] = useForm({
    // 130：容纳 8 字标签「推荐建筑图片信息」，全表统一保持同列对齐
    labelWidth: 130,
    schemas: inputFormSchemas,
    baseColProps: { md: 24, lg: 12 },
    // 纯查看：整表禁用 + 隐藏表单自带操作按钮
    disabled: true,
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps }] = useDrawerInner(async (data: Recordable) => {
    // 先回填后掀开：动画期间零翻转
    setDrawerProps({ open: false });
    loading.value = true;
    record.value = null;
    await resetFields();
    try {
      const row: RecommendRow = await fetchRecommendDetail(String(data.id));
      record.value = row;
      await setFieldsValue({
        jzmc: row.jzmc || '—',
        jzwz: row.jzwz || '—',
        tjrxm: row.tjrxm || '—',
        sjhm: row.sjhm || '—',
        tjsj: fmtDate(row.tjsj) || '—',
        tjly: row.tjly || '—',
      });
    } finally {
      loading.value = false;
      // 回填完成后才掀开抽屉
      setDrawerProps({ open: true });
    }
  });
</script>
