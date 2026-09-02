<!--
  市住更局 —— 文物清单管理（列表页）

  组件格式 / 页面布局对齐 urban-health-check 的 indicator-system/list.vue
  （BasicTable + useTable + 搜索 FormProps + actionColumn + BasicDrawer 表单）。
  当前后端尚未介入，页面为纯 UI：数据来自本地 data/wenwu.json（loadRelics），
  增删改查仅操作内存副本，刷新页面后恢复初始数据。
  字段与常量定义见 @jeesite/urban-protection/api/urban-protection/relic。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>

      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>

      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.name">
          {{ record.name }}
        </a>
      </template>

      <template #level="{ record }">
        <Tag :color="relicLevelOf(record.level).tagColor" style="border-radius: 10px">
          {{ relicLevelOf(record.level).label }}
        </Tag>
      </template>

      <template #situation="{ record }">
        <Tag v-if="record.situation" :color="situationTagColor(record.situation)" style="border-radius: 10px">
          {{ record.situation }}
        </Tag>
        <span v-else>—</span>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionUrbanRelicList">
  import { onMounted, ref, unref, watch } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import type { Relic } from '@jeesite/urban-protection/api/urban-protection/relic';
  import {
    RELIC_DISTRICTS,
    RELIC_LEVELS,
    loadRelics,
    relicCategoryLabel,
    relicLevelOf,
  } from '@jeesite/urban-protection/api/urban-protection/relic';
  import InputForm from './form.vue';

  const { showMessage } = useMessage();

  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:museum-outlined',
    value: meta.title || '文物清单管理',
  };

  /** 列表数据（内存副本：新增/编辑/删除直接改它，watch 同步进表格） */
  const relics = ref<Relic[]>([]);

  /** 最近一次搜索条件（查询/重置时更新；保存/删除后按它维持过滤视图，空条件即全量） */
  let lastSearch: Recordable = {};

  /** 按搜索条件过滤后的列表（name 模糊，district/level 精确） */
  function filtered(): Relic[] {
    const name = String(lastSearch.name ?? '').trim();
    const { district = '', level = '' } = lastSearch;
    return relics.value.filter(
      (r) =>
        (!name || r.name.includes(name)) && (!district || r.district === district) && (!level || r.level === level),
    );
  }

  /** 保存状况 → Tag 颜色 */
  function situationTagColor(situation: string): string {
    if (situation === '好') return 'green';
    if (situation === '较好') return 'cyan';
    if (situation === '一般') return 'gold';
    return 'red'; // 较差 / 差
  }

  /** 搜索表单 */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 100,
    schemas: [
      {
        label: '文物名称',
        field: 'name',
        component: 'Input',
      },
      {
        label: '所属区域',
        field: 'district',
        component: 'Select',
        componentProps: {
          options: RELIC_DISTRICTS.map((d) => ({ label: d, value: d })),
          allowClear: true,
        },
      },
      {
        label: '级别',
        field: 'level',
        component: 'Select',
        componentProps: {
          options: RELIC_LEVELS.map((l) => ({ label: l.label, value: l.value })),
          allowClear: true,
        },
      },
    ],
  };

  /** 表格列 */
  const tableColumns: BasicColumn[] = [
    { title: '文物名称', dataIndex: 'name', width: 190, slot: 'firstColumn' },
    { title: '级别', dataIndex: 'level', width: 90, align: 'center', slot: 'level' },
    { title: '类别', dataIndex: 'category', width: 170, format: (text) => relicCategoryLabel(text) },
    { title: '所属区域', dataIndex: 'district', width: 110 },
    { title: '年代', dataIndex: 'era', width: 110 },
    { title: '公布年份', dataIndex: 'publicTime', width: 90, align: 'center', format: (text) => text || '—' },
    { title: '保存状况', dataIndex: 'situation', width: 90, align: 'center', slot: 'situation' },
    { title: '文物编号', dataIndex: 'code', width: 110 },
    { title: '地址', dataIndex: 'address', width: 220, ellipsis: true },
  ];

  /** 操作列：查看 / 编辑 / 删除 */
  const actionColumn: BasicColumn = {
    width: 160,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该文物？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { setTableData, setLoading }] = useTable({
    dataSource: [],
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
    // 无后端 api：查询/重置（submitOnReset 会以空值重发 submit）在此本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      lastSearch = { ...params };
      setTableData(filtered());
      return params;
    },
  });

  // 异步加载完成后同步进表格（加载期间给表格一个 loading 视感）。
  // 注意：表格方法必须在 onMounted 之后调用 —— BasicTable 在自身 setup 里 emit('register')，
  // 早于父组件 onMounted；在父级 setup 顶层同步调用 setLoading 会因实例未注册直接抛错。
  onMounted(() => {
    setLoading(true);
    loadRelics().then((list) => {
      relics.value = list;
      setLoading(false);
    });
  });

  // 内存数据变化（含首载）→ 同步表格（保持当前过滤视图）
  watch(relics, () => setTableData(filtered()), { flush: 'post' });

  function handleForm(record: Recordable) {
    // 打开前先按查看/编辑设好 showFooter（抽屉级状态，查看隐藏底部按钮）。
    // 若在打开动画期间才改 showFooter，会因 footer 的 v-if 增删 DOM 打断面板渲染。
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  /** 新增 / 编辑保存回调（data 带 _isNew 标识与表单值，落到内存副本） */
  function handleSuccess(data: Recordable) {
    if (data._isNew) {
      relics.value = [
        {
          id: nextId(),
          name: data.name ?? '',
          level: data.level ?? '',
          category: data.category ?? '',
          district: data.district ?? '',
          address: data.address ?? '',
          era: data.era ?? '',
          code: data.code ?? '',
          publicTime: data.publicTime ?? 0,
          situation: data.situation ?? '',
          lng: 114.305,
          lat: 30.593,
          avatars: [],
          introduce: data.introduce ?? '',
          importance: 0,
        },
        ...relics.value,
      ];
      showMessage('新增成功（本地演示，未持久化）');
    } else {
      const target = relics.value.find((r) => r.id === data.id);
      if (target) {
        Object.assign(target, {
          name: data.name ?? target.name,
          level: data.level ?? target.level,
          category: data.category ?? target.category,
          district: data.district ?? target.district,
          address: data.address ?? target.address,
          era: data.era ?? target.era,
          code: data.code ?? target.code,
          publicTime: data.publicTime ?? target.publicTime,
          situation: data.situation ?? target.situation,
          introduce: data.introduce ?? target.introduce,
        });
        relics.value = [...relics.value];
      }
      showMessage('保存成功（本地演示，未持久化）');
    }
  }

  /** 删除（仅内存副本） */
  function handleDelete(record: Recordable) {
    relics.value = relics.value.filter((r) => r.id !== record.id);
    showMessage('删除成功（本地演示，未持久化）');
  }

  /** 新增记录的主键（当前最大 id + 1） */
  function nextId(): number {
    return relics.value.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }
</script>
