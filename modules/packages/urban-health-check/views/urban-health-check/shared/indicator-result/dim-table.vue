<!--
  市住更局 —— 指标项结果 show 页 / 一级维度表(Tabs 第一个页签)

  接口已接入：dimensionListBySet（/cityCheck/dimensionResult/page?setId=，
  首次查询自动按体系指标项的一级维度同步生成维度行）。
  列:一级维度名称 / 图层对象数量 / 图层覆盖面积(km²) / 操作(编辑)。
  一级维度由指标体系管理（模块一）的指标项生成，本模块只补充维护图层信息，不可增删。
-->
<template>
  <div>
    <BasicTable @register="registerDimTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #shpFile="{ record }">
        <template v-if="record.shpAtt?.url">
          <a @click="handleDownload(record.shpAtt)">{{ record.shpAtt.name }}</a>
        </template>
        <span v-else>-</span>
      </template>
    </BasicTable>

    <DimForm @register="registerDrawer" @success="load" />
  </div>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultDimTable">
  import { onMounted, ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import type { AttFile, DimensionRow } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import { dimensionListBySet, checkFileDownload } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import DimForm from './dim-form.vue';

  const props = defineProps({
    /** 所属体系主键 */
    setId: { type: String, required: true },
  });

  const { meta } = unref(router.currentRoute);
  const { showMessage } = useMessage();
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: '一级维度',
  };

  /** 维度行 */
  const rows = ref<(DimensionRow & Recordable)[]>([]);
  const loading = ref(false);

  onMounted(load);

  async function load() {
    loading.value = true;
    try {
      rows.value = (await dimensionListBySet(props.setId)) as (DimensionRow & Recordable)[];
    } catch (e: any) {
      showMessage(e?.message || '加载一级维度失败', 'error');
    } finally {
      loading.value = false;
    }
  }

  /** 一级维度表列 */
  const dimColumns: BasicColumn[] = [
    { title: '一级维度名称', dataIndex: 'dimName', width: 180 },
    { title: '图层对象数量', dataIndex: 'layerCount', width: 140, align: 'center' as const },
    { title: '图层覆盖面积（km²）', dataIndex: 'layerArea', width: 180, align: 'center' as const },
    { title: '上传的图层对象', dataIndex: 'shpFile', slot: 'shpFile', width: 220 },
  ];

  /** 操作列（仅编辑图层信息——维度行来自指标体系，不可增删） */
  const actionColumn: BasicColumn = {
    width: 100,
    actions: (record: Recordable) => [
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
    ],
  };

  const [registerDimTable] = useTable({
    dataSource: rows,
    loading,
    columns: dimColumns,
    actionColumn: actionColumn,
    showTableSetting: true,
    showIndexColumn: true,
    pagination: false,
    canResize: true,
  });

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  function handleForm(row: Recordable) {
    setDrawerProps({ showFooter: true });
    openDrawer(true, { ...row, setId: props.setId });
  }

  async function handleDownload(att: AttFile) {
    await checkFileDownload(att);
  }
</script>
