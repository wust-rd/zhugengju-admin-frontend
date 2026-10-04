<!--
  市住更局 —— 名城保护 · 在册优保建筑（列表页）

  数据：WHFW_AQJD_EXCELLENT 中 STATUS 非 0 且未删除（scope=registered）。
  列/操作对齐老系统：所在行政区/建筑原名称/建筑现使用名称/建筑坐落/建成年代/
  建筑面积/产权人/保护等级/公布批次/公布时间/巡查记录总数 + 基本信息、外网展示信息、
  查看责任书、巡查记录(NN)；新增按钮弹抽屉表单（对齐老系统「新增优保建筑」，见 form.vue）。
  「外网展示信息」三表无对应数据，点击暂提示待接入；「查看责任书」老系统可打开责任书原件，
  现三表只存上传标记（SFSCZRZ），未上传时提示、已上传时提示原件查看待文件存储接入。
  搜索条件对齐老系统「详细查询」：所在行政区(全市) / 建筑名称 / 纳入巡查(全部)；
  「纳入巡查」三表无对应字段，选择值不下发，待后端实现。
-->
<template>
  <PageWrapper>
    <BasicTable @register="registerTable" :showIndexColumn="true" :indexColumnProps="{ width: 60 }">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>

      <template #toolbar>
        <a-button type="primary" @click="handleForm({ isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>

      <template #protectLeve="{ record }">
        <Tag v-if="record.protectLeve" color="gold" style="border-radius: 10px">
          {{ protectLevelLabel(record.protectLeve) }}
        </Tag>
        <span v-else>—</span>
      </template>

      <template #publishPc="{ record }">{{ batchLabel(record.publishPc) || '—' }}</template>

      <template #sfScZrz="{ record }">
        <Tag :color="record.sfScZrz ? 'green' : 'default'">{{ record.sfScZrz ? '已上传' : '未上传' }}</Tag>
      </template>

      <template #action="{ record }">
        <div class="flex flex-col items-center gap-1">
          <div class="flex items-center gap-3">
            <a @click="openDetail(record)">基本信息</a>
            <a @click="handleOuterInfo()">外网展示信息</a>
            <a @click="gotoInspections(record)">巡查记录({{ record.xcCount }})</a>
          </div>
          <div>
            <a style="color: red" @click="handleCommitment(record)">查看责任书</a>
          </div>
        </div>
      </template>
    </BasicTable>

    <ExcellentDetailDrawer @register="registerDrawer" @success="reload" />
    <InputForm @register="registerFormDrawer" @success="reload" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionExcellentBuildingRegisteredList">
  import { computed, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    fetchExcellentPage,
    fetchExcellentDict,
    ExcellentRow,
  } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import ExcellentDetailDrawer from '../../shared/excellent-detail-drawer.vue';
  import InputForm from './form.vue';
  import { protectLevelLabel, batchLabel } from '../../shared/excellent-format';

  const { meta } = unref(router.currentRoute);
  const { createMessage } = useMessage();
  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:bank-outlined',
    value: meta.title || '在册优保建筑',
  }));

  const districtOptions = ref<{ label: string; value: string }[]>([]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
  });

  const tableColumns: BasicColumn[] = [
    { title: '所在行政区', dataIndex: 'xzqName', width: 100 },
    { title: '建筑原名称', dataIndex: 'jzOldName', width: 180, ellipsis: true, format: (text) => text || '—' },
    { title: '建筑现使用名称', dataIndex: 'jzNowName', width: 150, ellipsis: true, format: (text) => text || '—' },
    { title: '建筑坐落', dataIndex: 'jzLoccation', width: 220, ellipsis: true },
    { title: '建成年代', dataIndex: 'buildYear', width: 110, align: 'center', format: (text) => text || '—' },
    { title: '建筑面积(平方米)', dataIndex: 'jzArar', width: 120, align: 'right', format: (text) => text || '—' },
    { title: '产权人', dataIndex: 'cqr', width: 130, ellipsis: true, format: (text) => text || '—' },
    { title: '保护等级', dataIndex: 'protectLeve', width: 90, align: 'center', slot: 'protectLeve' },
    { title: '公布批次', dataIndex: 'publishPc', width: 100, align: 'center', slot: 'publishPc' },
    { title: '公布时间', dataIndex: 'publishTime', width: 90, align: 'center', format: (text) => text || '—' },
    { title: '责任书', dataIndex: 'sfScZrz', width: 90, align: 'center', slot: 'sfScZrz' },
    { title: '巡查记录总数', dataIndex: 'xcCount', width: 110, align: 'center' },
    // 操作：两排显示——基本信息/外网展示信息/巡查记录 一行，修改/查看责任书 一行
    { title: '操作', dataIndex: 'action', width: 285, align: 'center', fixed: 'right', slot: 'action' },
  ];

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerFormDrawer, { openDrawer: openFormDrawer }] = useDrawer();

  const [registerTable, { reload }] = useTable({
    api: fetchExcellentPage,
    beforeFetch: (params: Recordable) => {
      // 纳入巡查：三表无对应字段，选择值不下发（已从 params 剔除），待后端实现
      const { pageNo, pageSize, nrxc, ...rest } = params;
      return { ...rest, scope: 'registered', pageNum: pageNo, pageSize };
    },
    columns: tableColumns,
    showTableSetting: true,
    useSearchForm: true,
    pagination: true,
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 100,
      schemas: [
        {
          label: '所在行政区',
          field: 'xzqName',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '保护等级',
          field: 'protectLeve',
          component: 'Select',
          componentProps: {
            options: [
              { label: '一级', value: '1' },
              { label: '二级', value: '2' },
            ],
            allowClear: true,
          },
        },
        { label: '建筑名称(原)', field: 'jzOldName', component: 'Input' },
        { label: '建筑名称(现)', field: 'jzNowName', component: 'Input' },
        {
          // 纳入巡查：三表无对应字段，选择值不下发（见 beforeFetch 注释）
          label: '纳入巡查',
          field: 'nrxc',
          component: 'Select',
          componentProps: {
            options: [
              { label: '全部', value: '' },
              { label: '是', value: '1' },
              { label: '否', value: '0' },
            ],
          },
        },
      ],
    },
  });

  /** 外网展示信息：三表无对应数据，待后端提供后接入 */
  function handleOuterInfo() {
    createMessage.info('外网展示信息暂未接入');
  }

  /** 查看责任书：原件查看待文件存储接入；未上传时提示 */
  function handleCommitment(record: ExcellentRow) {
    if (record.sfScZrz) {
      createMessage.info('责任书原件查看待文件存储接入');
    } else {
      createMessage.warning('该建筑未上传责任书');
    }
  }

  /** 打开新增抽屉（先重置后掀开，防闪烁） */
  function handleForm(record: Recordable) {
    openFormDrawer(false, { ...record, _isNew: !!record.isNewRecord });
  }

  /** 跳转优保建筑巡查列表，定向该建筑 */
  function gotoInspections(record: ExcellentRow) {
    router.push({
      path: '/urban-protection/excellent-building/inspection/list',
      query: { parentId: record.id, jzOldName: record.jzOldName },
    });
  }

  function openDetail(record: ExcellentRow) {
    // 只传数据不掀开，抽屉回填完成后自行 setDrawerProps({ open: true })
    openDrawer(false, { id: record.id });
  }

</script>
<style scoped>
  /* 列名不加粗 */
  :deep(.ant-table-thead > tr > th) {
    font-weight: normal;
  }
</style>
