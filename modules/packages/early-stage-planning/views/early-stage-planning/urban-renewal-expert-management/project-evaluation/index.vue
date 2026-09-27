<!--
  市住更局 —— 城市更新专家管理 · 项目评估（已接后端 /a/ure/project/*）

  项目评估列表：顶部搜索表单（项目名称/片区名称/评审模式）+ 右侧「新增项目」（仅实施主体/超管可见），
  下方 BasicTable（项目名称/片区名称/实施主体/统筹主体/责任部门/评审模式/参与专家/开始时间/状态/操作）。
  数据范围由后端按登录角色过滤：专家=仅参与项目（行内带 isLeader/myEval）、实施主体=仅本人创建、运维/超管=全部。
  操作按状态与角色区分：评估中→专家可见「评估」；待评价→「评价专家」；待提交→实施主体「编辑·提交·删除」；已完成→「生成评估报告」。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>项目列表</span>
        <span v-if="roleHint" class="ml-12px text-13px font-400 text-gray-400">{{ roleHint }}</span>
      </template>
      <template #toolbar>
        <a-button v-if="canEdit" type="primary" @click="go(FORM_ROUTE)">
          <span class="inline-flex items-center gap-4px"> <span class="i-fluent:add-12-filled"></span> 新增项目 </span>
        </a-button>
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
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluation">
  import { computed, onMounted, ref } from 'vue';
  import { Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { ureDictOptions } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import {
    ureProjectDelete,
    ureProjectPage,
    ureProjectSubmit,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import { ureIdentity } from '../shared/ure-role';
  import type { UreRole } from '../shared/ure-role';

  const { showMessage } = useMessage();
  const go = useGo();

  const FORM_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/form';
  const DETAIL_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation';
  const EVAL_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate';

  /** 当前角色：数据范围由后端过滤，这里控制按钮与提示（authInfo + 专家档案绑定判定，异步加载） */
  const role = ref<UreRole>('none');
  const canEdit = ref(false);

  const roleHint = computed(() => {
    if (role.value === 'expert') return '（专家视角：仅显示您参与的项目）';
    if (role.value === 'implement') return '（实施主体视角：仅显示您创建的项目）';
    if (role.value === 'ops') return '（运维视角：全部项目）';
    return '';
  });

  /** 字典选项（行政区/评审模式） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  const modeOptions = ref<{ label: string; value: string }[]>([]);

  onMounted(async () => {
    const identity = await ureIdentity();
    role.value = identity.role;
    canEdit.value = identity.canEditProject;
    try {
      const dict = await ureDictOptions();
      districtOptions.value = (dict.districts ?? []).map((d) => ({ label: d, value: d }));
      modeOptions.value = (dict.reviewModes ?? []).map((m) => ({ label: m, value: m }));
    } catch (e) {
      // 字典加载失败时下拉为空，不阻塞列表
    }
  });

  /** 状态颜色（0待提交=橙，1评估中=蓝，2待评价=紫，3已完成=绿） */
  const STATUS_COLOR: Record<string, string> = {
    '0': 'warning',
    '1': 'processing',
    '2': 'purple',
    '3': 'success',
  };

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '项目名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '片区名称', dataIndex: 'district', width: 100 },
    { title: '实施主体', dataIndex: 'implementOrg', width: 170, ellipsis: true },
    { title: '统筹主体', dataIndex: 'coordinator', width: 180, ellipsis: true },
    { title: '责任部门', dataIndex: 'dept', width: 120 },
    { title: '评审模式', dataIndex: 'reviewMode', width: 100 },
    { title: '参与专家', dataIndex: 'expertNames', width: 170, ellipsis: true, slot: 'experts' },
    { title: '开始时间', dataIndex: 'startDate', width: 110 },
    { title: '状态', dataIndex: 'status', width: 90, slot: 'status' },
  ];

  /** 操作列：按状态与角色给出不同操作 */
  const actionColumn: BasicColumn = {
    width: 210,
    actions: (record: Recordable) => {
      const list: any[] = [{ label: '查看', onClick: () => go(`${DETAIL_ROUTE}/${record.code}`) }];
      if (record.statusCode === '1') {
        // 评估中：专家（后端已过滤为其参与的项目）可进入评估
        if (role.value === 'expert') {
          list.push({
            label: record.myEval ? '修改评估' : '评估',
            onClick: () => go(`${EVAL_ROUTE}?id=${record.id}`),
          });
        }
      } else if (record.statusCode === '2') {
        list.push({
          label: '评价专家',
          onClick: () => handleExpertEval(record),
        });
      } else if (record.statusCode === '0') {
        if (canEdit) {
          list.push({ label: '编辑', onClick: () => go(`${FORM_ROUTE}?id=${record.id}`) });
          list.push({
            label: '提交',
            popConfirm: { title: '是否确认提交该项目？', confirm: () => handleSubmit(record) },
          });
          list.push({
            label: '删除',
            color: 'error',
            popConfirm: { title: '是否确认删除该项目？', confirm: () => handleDelete(record) },
          });
        }
      } else if (record.statusCode === '3') {
        list.push({ label: '生成评估报告', onClick: () => handleReport(record) });
      }
      return list;
    },
  };

  const [registerTable, { reload }] = useTable({
    api: ureProjectPage,
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
          label: '片区名称',
          field: 'adminDistrict',
          component: 'Select',
          componentProps: () => ({ options: districtOptions.value, allowClear: true, placeholder: '请选择' }),
        },
        {
          label: '评审模式',
          field: 'reviewMode',
          component: 'Select',
          componentProps: () => ({ options: modeOptions.value, allowClear: true, placeholder: '请选择' }),
        },
      ],
    },
  });

  /** 评价专家：跳专家评价打分页（对项目参与专家打分；完成后项目 → 已完成）；主入口在「专家评价」列表页 */
  function handleExpertEval(record: Recordable) {
    go(
      `/early-stage-planning/urban-renewal-expert-management/expert-evaluation/rate?projectCode=${record.code}&projectName=${encodeURIComponent(record.name)}`,
    );
  }

  /** 提交（待提交 → 评估中）：服务端强校验（必填/材料/专家 3~7 名/组长） */
  async function handleSubmit(record: Recordable) {
    try {
      await ureProjectSubmit(record.id);
      showMessage('提交成功，项目进入评估中');
    } finally {
      reload();
    }
  }
  /** 删除（仅待提交可删，后端校验） */
  async function handleDelete(record: Recordable) {
    try {
      await ureProjectDelete(record.id);
      showMessage('删除成功');
    } finally {
      reload();
    }
  }
  /** 生成评估报告（TODO: 接入报告下载） */
  function handleReport(record: Recordable) {
    showMessage(`${record.name}：生成评估报告待接入`);
  }
</script>
