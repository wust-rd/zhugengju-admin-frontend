<!--
  市住更局 —— 名城保护 · 巡查记录详情抽屉（优保/拟优保巡查共用）

  scope=excellent 走优保巡查详情接口；scope=proposed 走拟优保巡查详情接口
  （WHFW_OLDJZ_XC 表无是否上报字段，拟优保不展示该行）。
  字段对齐老系统「查看巡查/查看详情」页：区划、建筑原名称、是否特别关注、
  巡查人、录入/巡查时间、录入类型、是否上报、巡查结果、巡查问题、房屋现状，
  以及巡查图片（MinIO URL 直连加载，九宫格缩略，点击新窗口看原图）。
  拟优保弹框（老系统拟优保建筑巡查页）传 simple=true 走精简字段集：
  建筑所属区/拟优保建筑/是否特别关注/巡查人+巡查日期同行/巡查内容/图片信息；
  buildingLabel 由打开方传入（拟优保建筑/优保建筑）。
  UI 与推荐建筑详情抽屉一致：BasicForm 只读双列表单（无分组小标题），
  图片信息为带框线容器的自定义插槽表单项。
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
            <a-empty v-else description="暂无巡查照片" />
          </div>
        </template>
      </BasicForm>
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedInspectionDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Empty as AEmpty, Spin as ASpin } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { fetchInspectionDetail } from '@jeesite/urban-protection/api/urban-protection/inspection';
  import {
    fetchProposedInspectionDetail,
    ProposedInspectionRow,
  } from '@jeesite/urban-protection/api/urban-protection/proposed';
  import { fmtDate, fmtDateTime } from './excellent-format';

  const props = defineProps<{
    /** excellent=优保巡查 proposed=拟优保巡查（WHFW_OLDJZ_XC 无是否上报，不展示该行） */
    scope?: 'excellent' | 'proposed';
  }>();

  const { meta } = unref(router.currentRoute);

  /** 行类型：拟优保行 + 可选 sfSb（优保详情返回 sfSb 布尔，结构兼容） */
  type DetailRecord = ProposedInspectionRow & { sfSb?: boolean };

  const loading = ref(false);
  const record = ref<DetailRecord | null>(null);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:file-search-outlined',
    value: '巡查记录详情',
  }));

  const inputFormSchemas: FormSchema[] = [
    { label: '区划', field: 'qu', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '建筑原名称', field: 'jzOldName', component: 'Input', colProps: { md: 24, lg: 12 } },
    {
      label: '是否特别关注',
      field: 'sfTbgz',
      component: 'Switch',
      componentProps: { checkedChildren: '是', unCheckedChildren: '否' },
      colProps: { md: 24, lg: 12 },
    },
    { label: '巡查人', field: 'xcUserName', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '录入时间', field: 'czTime', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '巡查时间', field: 'xcTime', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '录入类型', field: 'typeView', component: 'Input', colProps: { md: 24, lg: 12 } },
    {
      label: '是否上报',
      field: 'sfSb',
      component: 'Switch',
      componentProps: { checkedChildren: '已上报', unCheckedChildren: '未上报' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '巡查结果',
      field: 'xcContent',
      component: 'InputTextArea',
      componentProps: { rows: 3 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '巡查问题',
      field: 'xcWt',
      component: 'InputTextArea',
      componentProps: { rows: 3 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '房屋现状',
      field: 'houseXz',
      component: 'InputTextArea',
      componentProps: { rows: 2 },
      colProps: { md: 24, lg: 24 },
    },
    {
      // 巡查图片以自定义插槽挂进表单项，label 与其他字段同列对齐
      label: '图片信息',
      field: 'photos',
      component: 'Input',
      slot: 'photos',
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, updateSchema }] = useForm({
    // 130：与推荐建筑详情抽屉统一，保持标签同列对齐
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
      const row: DetailRecord =
        props.scope === 'proposed'
          ? await fetchProposedInspectionDetail(String(data.id))
          : await fetchInspectionDetail(String(data.id));
      record.value = row;
      // 拟优保精简模式（对齐老系统拟优保建筑巡查页）：隐藏 录入时间/录入类型/是否上报/巡查问题/房屋现状，
      // 前三个字段整行排布，巡查人+巡查日期 同行
      const simple = !!data.simple;
      await updateSchema([
        { field: 'qu', label: '建筑所属区', colProps: { md: 24, lg: 24 } },
        {
          field: 'jzOldName',
          label: String(data.buildingLabel ?? '建筑原名称'),
          colProps: { md: 24, lg: 24 },
        },
        { field: 'sfTbgz', colProps: { md: 24, lg: 24 } },
        { field: 'xcTime', label: simple ? '巡查日期' : '巡查时间' },
        { field: 'xcContent', label: simple ? '巡查内容' : '巡查结果' },
        { field: 'czTime', show: !simple },
        { field: 'typeView', show: !simple },
        { field: 'sfSb', show: !simple },
        { field: 'xcWt', show: !simple },
        { field: 'houseXz', show: !simple },
      ]);
      await setFieldsValue({
        qu: row.qu || '—',
        jzOldName: row.jzOldName || '—',
        sfTbgz: !!row.sfTbgz,
        xcUserName: row.xcUserName || '—',
        czTime: fmtDateTime(row.czTime) || '—',
        xcTime: fmtDate(row.xcTime) || '—',
        typeView: row.typeView || '—',
        sfSb: !!row.sfSb,
        xcContent: row.xcContent || '—',
        xcWt: row.xcWt || '无',
        houseXz: row.houseXz || '—',
      });
    } finally {
      loading.value = false;
      // 回填完成后才掀开抽屉
      setDrawerProps({ open: true });
    }
  });
</script>
