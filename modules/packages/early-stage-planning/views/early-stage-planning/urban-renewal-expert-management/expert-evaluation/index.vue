<!--
  市住更局 —— 城市更新专家管理 · 专家评价（项目列表，已接后端 /a/ure/project/page）

  实施主体的专家评价入口：展示本人填报的「待评价 + 已完成」项目（数据范围由后端按登录角色过滤）。
  待评价项目操作列【评价】→ 跳打分页（rate.vue，图2：三维度星级打分，全部评完后可完成评价）；
  已完成项目操作列【查看】→ 跳查看页（view.vue，图3：本项目全部评价记录卡片流）。
  搜索：项目名称 / 实施主体 / 评审模式。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <BasicTable v-if="identityReady" @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>评价项目列表</span>
        <span class="ml-12px text-13px font-400 text-gray-400">（待评价项目可对参与专家打分；已完成项目可查看全部评价）</span>
      </template>
      <template #experts="{ record }">
        <span class="text-13px text-gray-700">{{ (record.expertNames ?? []).join('、') }}</span>
      </template>
      <template #status="{ record }">
        <Tag :color="STATUS_COLOR[record.statusCode as string] || 'default'">{{ record.status }}</Tag>
      </template>
    </BasicTable>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertEvaluation">
  import { onMounted, ref } from 'vue';
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { ureDictOptions } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import { ureProjectPage } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import { ureIdentity } from '../shared/ure-role';
  import type { UreRole } from '../shared/ure-role';

  const go = useGo();

  const RATE_ROUTE = '/early-stage-planning/urban-renewal-expert-management/expert-evaluation/rate';
  const VIEW_ROUTE = '/early-stage-planning/urban-renewal-expert-management/expert-evaluation/view';

  /** 当前角色：评价专家由实施主体/运维操作，专家不显示「评价」按钮（后端接口同样拦截） */
  const role = ref<UreRole>('none');
  /** 角色未就绪不渲染表格：操作列按钮在行渲染时求值，避免按 'none' 求值后不随角色刷新 */
  const identityReady = ref(false);

  /** 状态颜色（2待评价=紫，3已完成=绿） */
  const STATUS_COLOR: Record<string, string> = {
    '2': 'purple',
    '3': 'success',
  };

  /** 字典选项（评审模式） */
  const modeOptions = ref<{ label: string; value: string }[]>([]);

  onMounted(async () => {
    try {
      role.value = (await ureIdentity()).role;
    } catch (e) {
      // 身份识别失败按无角色兜底
    } finally {
      identityReady.value = true;
    }
    try {
      const dict = await ureDictOptions();
      modeOptions.value = (dict.reviewModes ?? []).map((m) => ({ label: m, value: m }));
    } catch (e) {
      // 字典加载失败时下拉为空，不阻塞列表
    }
  });

  /** 表格列（对齐图1：项目名称/片区名称/实施主体/统筹主体/评审模式/参与专家/状态/操作） */
  const columns: BasicColumn[] = [
    { title: '项目名称', dataIndex: 'name', width: 220, ellipsis: true },
    { title: '片区名称', dataIndex: 'district', width: 110 },
    { title: '实施主体', dataIndex: 'implementOrg', width: 180, ellipsis: true },
    { title: '统筹主体', dataIndex: 'coordinator', width: 180, ellipsis: true },
    { title: '评审模式', dataIndex: 'reviewMode', width: 100 },
    { title: '参与专家', dataIndex: 'expertNames', width: 190, ellipsis: true, slot: 'experts' },
    { title: '状态', dataIndex: 'status', width: 90, slot: 'status' },
  ];

  /** 操作列：待评价 →【评价】（仅实施主体/运维，专家不参与评价）；已完成 →【查看】 */
  const actionColumn: BasicColumn = {
    width: 90,
    actions: (record: Recordable) => {
      const query = `projectCode=${record.code}&projectName=${encodeURIComponent(record.name)}`;
      if (record.statusCode === '2') {
        if (role.value === 'expert') {
          return [];
        }
        return [{ label: '评价', onClick: () => go(`${RATE_ROUTE}?${query}`) }];
      }
      return [{ label: '查看', onClick: () => go(`${VIEW_ROUTE}?${query}`) }];
    },
  };

  const [registerTable] = useTable({
    api: ureProjectPage,
    beforeFetch: (params) => ({ ...params, status: params.status || '2,3' }),
    columns,
    actionColumn,
    showTableSetting: true,
    useSearchForm: true,
    pagination: { pageSize: 10, showSizeChanger: false, showTotal: (t: number) => `共 ${t} 条` },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        {
          label: '项目名称',
          field: 'name',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '实施主体',
          field: 'implementOrg',
          component: 'Input',
          componentProps: { allowClear: true, placeholder: '请输入' },
        },
        {
          label: '评审模式',
          field: 'reviewMode',
          component: 'Select',
          componentProps: () => ({ options: modeOptions.value, allowClear: true, placeholder: '请选择' }),
        },
        {
          label: '状态',
          field: 'status',
          component: 'Select',
          componentProps: {
            options: [
              { label: '待评价', value: '2' },
              { label: '已完成', value: '3' },
            ],
            allowClear: true,
            placeholder: '请选择',
          },
        },
      ],
    },
  });
</script>
