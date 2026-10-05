<!--
  市住更局 —— 名城保护 · 优保建筑管理（列表页，含拟优保与已删除）

  数据：WHFW_AQJD_EXCELLENT 全量（scope=all，含逻辑删除行）。
  状态口径：STATUS='0' 拟优保、ISDELETE='1' 已删除、其余在册。
  列对齐老系统：序号 / 所在行政区 / 建筑原名称 / 建筑现使用名称 / 建筑坐落 / 建成年份 /
  建筑面积(平方米) / 产权人 / 状态 / 保护等级 / 公布时间 + 操作。
  操作对齐老系统：查看（外网展示弹框，对齐老系统 youbaoPic 页，见 shared/excellent-display-modal.vue）/
  修改 / 还原优保建筑（拟优保行=转为在册、已删行=撤销删除，
  共用后端 /restore 接口，拟优保转正语义待后端确认）；老系统管理页无新增入口，本页亦不提供新增。
  搜索条件对齐老系统「详细查询」：建筑现使用名称 / 建筑原使用名称 / 所在行政区(全市) /
  公布批次(全部) / 保护等级(全部) / 状态(全部|在册文物建筑|历史优保建筑)；
  状态后端暂不支持过滤，选择值不下发待后端实现。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>

      <template #statusView="{ record }">
        <Tag v-if="record.deleted" color="red">已删除</Tag>
        <Tag v-else-if="record.proposed" color="blue">拟优保</Tag>
        <Tag v-else color="green">在册</Tag>
      </template>

      <template #protectLeve="{ record }">
        <Tag v-if="record.protectLeve" color="gold" style="border-radius: 10px">
          {{ protectLevelLabel(record.protectLeve) }}
        </Tag>
        <span v-else>—</span>
      </template>
    </BasicTable>

    <InputForm @register="registerFormDrawer" @success="reload" />
    <ExcellentDisplayModal @register="registerDisplayModal" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingManagementList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useModal } from '@jeesite/core/components/Modal';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchExcellentPage,
    fetchExcellentDict,
    restoreExcellent,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import InputForm from './form.vue';
  import ExcellentDisplayModal from '../../shared/excellent-display-modal.vue';
  import { batchLabel, protectLevelLabel } from '../../shared/excellent-format';

  const { meta } = unref(router.currentRoute);
  const { createConfirm, showMessage } = useMessage();

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:bank-outlined',
    value: meta.title || '优保建筑管理',
  }));

  /** 区下拉（库内实际区名，首位「全市」= 不筛选） */
  const districtOptions = ref<{ label: string; value: string }[]>([{ label: '全市', value: '' }]);
  /** 公布批次下拉（首位「全部」= 不筛选） */
  const batchOptions = ref<{ label: string; value: string }[]>([{ label: '全部', value: '' }]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = [
      { label: '全市', value: '' },
      ...dict.districts.map((d) => ({ label: d, value: d })),
    ];
    batchOptions.value = [
      { label: '全部', value: '' },
      ...dict.batches.map((b) => ({ label: batchLabel(String(b)), value: String(b) })),
    ];
  });

  const tableColumns: BasicColumn[] = [
    { title: '所在行政区', dataIndex: 'xzqName', width: 100 },
    { title: '建筑原名称', dataIndex: 'jzOldName', width: 180, ellipsis: true, format: (text) => text || '—' },
    { title: '建筑现使用名称', dataIndex: 'jzNowName', width: 150, ellipsis: true, format: (text) => text || '—' },
    { title: '建筑坐落', dataIndex: 'jzLoccation', width: 220, ellipsis: true },
    { title: '建成年份', dataIndex: 'buildYear', width: 110, align: 'center', format: (text) => text || '—' },
    { title: '建筑面积(平方米)', dataIndex: 'jzArar', width: 120, align: 'right', format: (text) => text || '—' },
    { title: '产权人', dataIndex: 'cqr', width: 120, ellipsis: true, format: (text) => text || '—' },
    { title: '状态', dataIndex: 'statusView', width: 90, align: 'center', slot: 'statusView' },
    { title: '保护等级', dataIndex: 'protectLeve', width: 90, align: 'center', slot: 'protectLeve' },
    { title: '公布时间', dataIndex: 'publishTime', width: 90, align: 'center', format: (text) => text || '—' },
  ];

  const actionColumn: BasicColumn = {
    width: 240,
    actions: (record: Recordable) => {
      const row = record as ExcellentRow;
      const actions: Recordable[] = [];
      if (row.deleted) {
        actions.push({ label: '还原优保建筑', onClick: () => handleRestore(row) });
      } else {
        actions.push({ label: '查看', onClick: () => openDisplay(row) });
        actions.push({ label: '修改', onClick: () => handleForm(row) });
        // 拟优保行：还原优保建筑（转为在册优保），与已删行共用 /restore 接口，语义待后端确认
        if (row.proposed) {
          actions.push({ label: '还原优保建筑', onClick: () => handleRestore(row) });
        }
      }
      return actions;
    },
  };

  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();
  const [registerDisplayModal, { openModal: openDisplayModal }] = useModal();

  const [registerTable, { reload }] = useTable({
    api: fetchExcellentPage,
    beforeFetch: (params: Recordable) => {
      const { pageNo, pageSize, xzqName, publishPc, protectLeve, status, ...rest } = params;
      return {
        ...rest,
        scope: 'all',
        pageNum: pageNo,
        pageSize,
        // 「全市 / 全部」值为空串：置 undefined 不下发，避免后端按空值过滤
        xzqName: xzqName || undefined,
        publishPc: publishPc || undefined,
        protectLeve: protectLeve || undefined,
        // 状态：后端暂不支持过滤，选择值不下发（已从 params 剔除），待后端实现
      };
    },
    columns: tableColumns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 100,
      schemas: [
        { label: '建筑现使用名称', field: 'jzNowName', component: 'Input' },
        { label: '建筑原使用名称', field: 'jzOldName', component: 'Input' },
        {
          label: '所在行政区',
          field: 'xzqName',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '公布批次',
          field: 'publishPc',
          component: 'Select',
          componentProps: { options: batchOptions, allowClear: true },
        },
        {
          label: '保护等级',
          field: 'protectLeve',
          component: 'Select',
          componentProps: {
            options: [
              { label: '全部', value: '' },
              { label: '一级', value: '1' },
              { label: '二级', value: '2' },
            ],
            allowClear: true,
          },
        },
        {
          // 状态：后端暂不支持过滤，选择值不下发（见 beforeFetch 注释）
          label: '状态',
          field: 'status',
          component: 'Select',
          componentProps: {
            options: [
              { label: '全部', value: '' },
              { label: '在册文物建筑', value: '在册文物建筑' },
              { label: '历史优保建筑', value: '历史优保建筑' },
            ],
            allowClear: true,
          },
        },
      ],
    },
  });

  /** 打开表单抽屉（先回填后掀开，避免动画期间翻转表单内容） */
  function handleForm(record: Recordable) {
    const isNew = !!record.isNewRecord;
    const data = { ...record, _isNew: isNew };
    // 只传数据不掀开，抽屉回填完成后自行 setDrawerProps({ open: true })
    openFormDrawer(false, data);
  }

  /** 查看：弹出外网展示弹框（先传数据后掀开，见 excellent-display-modal.vue） */
  function openDisplay(record: ExcellentRow) {
    openDisplayModal(false, { id: record.id, jzOldName: record.jzOldName, jzNowName: record.jzNowName });
  }

  function handleRestore(record: ExcellentRow) {
    createConfirm({
      iconType: 'warning',
      title: '确认还原该优保建筑？',
      content: `「${record.jzOldName}」将还原为在册优保建筑`,
      onOk: async () => {
        await restoreExcellent(record.id);
        showMessage('还原成功');
        reload();
      },
    });
  }
</script>
