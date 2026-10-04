<!--
  市住更局 —— 满意度调查 编辑页（某年调查，原型图2）

  路由(RESTful,隐藏菜单):
   - 链接地址:/urban-health-check/urban/satisfaction-survey/{id}({id}=调查主键)
   - 组件位置:/urban-health-check/urban/satisfaction-survey/_id/list
   - ?view=1 查看态；调查已提交(submitStatus=1)整页只读
  页面结构:黄条信息栏(年份/有效问卷数/问题数+提交调查结果) → 筛选卡(问题文本/一级/二级维度,本地过滤)
   → 表格卡(问题明细,toolbar:新增/清单生成[开发中]/批量导出/导入)。
  接口:surveyInfo / surveySaveList / surveySubmit / question export+import+template；
   指标项全集=按调查年份查全部体系(listLight 合并)，供问题抽屉选择与维度联动（后端口径:
   按年份反查 item_name，同名取 item_no 最小，跨体系不区分）。
  问题维护为"整单提交"：编辑/删除单个问题 = 维护本地列表后整单 saveList。
-->
<template>
  <PageWrapper>
    <!-- 顶部黄条信息栏（全部只读展示；编辑态待提交时提供「提交调查结果」） -->
    <Card class="mb-3">
      <div
        class="flex items-center justify-between px-4 py-3 flex-wrap gap-y-2"
        style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px"
      >
        <div class="flex items-center flex-wrap" style="column-gap: 48px">
          <span>体检调查年份：<span class="font-medium">{{ survey?.surveyYear ?? '-' }}年</span></span>
          <span>
            有效调查问卷数（份）：<span class="font-medium">{{ survey?.validQuestionnaireCount ?? '-' }}</span>
          </span>
          <span>调查问题数量（项）：<span class="font-medium">{{ survey?.questionCount ?? 0 }}</span></span>
        </div>
        <a-button
          v-if="!readOnly"
          type="primary"
          :loading="submitting"
          @click="handleSubmitSurvey"
        >
          提交调查结果
        </a-button>
        <Tag v-else-if="isSubmitted" color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
      </div>
    </Card>

    <!-- 筛选卡（本地过滤，查询按钮触发） -->
    <Card class="mb-3">
      <div class="flex items-center flex-wrap" style="column-gap: 12px">
        <span class="filter-label">调查问卷问题</span>
        <a-input
          v-model:value="filterInput.questionText"
          placeholder="请输入内容"
          allow-clear
          style="width: 220px"
          @pressEnter="applyFilter"
        />
        <span class="filter-label">一级维度</span>
        <Select
          v-model:value="filterInput.dim1"
          placeholder="请选择"
          allow-clear
          :options="dim1Options"
          style="width: 180px"
        />
        <span class="filter-label">二级维度</span>
        <Select
          v-model:value="filterInput.dim2"
          placeholder="请选择"
          allow-clear
          :options="dim2Options"
          style="width: 180px"
        />
        <a-button type="primary" @click="applyFilter">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>
    </Card>

    <!-- 问题明细表格 -->
    <Card>
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #toolbar>
          <div class="flex items-center w-full justify-between">
            <a-button v-if="!readOnly" type="primary" @click="handleForm({ isNewRecord: true })">
              <Icon icon="i-fluent:add-12-filled" /> 新增
            </a-button>
            <div v-else />
            <div class="flex items-center">
              <a-button class="mr-2" @click="handleGenList">清单生成</a-button>
              <a-button class="mr-2" @click="handleExport">批量导出</a-button>
              <a-button v-if="!readOnly" @click="openImport">导入</a-button>
            </div>
          </div>
        </template>
        <template #firstColumn="{ record }">
          <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.questionText">
            {{ record.questionText }}
          </a>
        </template>
      </BasicTable>
    </Card>

    <!-- 问题行新增/编辑/查看抽屉 -->
    <InputForm :read-only="readOnly" :indicator-items="indicatorItems" @register="registerDrawer" @success="handleSuccess" />

    <!-- Excel 导入弹窗（整单替换） -->
    <Modal
      v-model:open="importVisible"
      title="导入问卷问题"
      :confirm-loading="importing"
      ok-text="开始导入"
      :ok-button-props="{ disabled: !importFile }"
      cancel-text="取消"
      @ok="doImport"
      @cancel="importVisible = false"
    >
      <div class="pb-2">
        请先<a @click="handleTemplate">下载导入模板</a>
        ，按模板列填写后上传（序号/调查问卷问题/对应一级维度/对应二级维度/对应指标项/满意度%）。
        <div class="pt-1" style="color: #faad14">导入将整单替换该调查的全部问卷问题，请谨慎操作。</div>
      </div>
      <Upload :before-upload="beforeImportUpload" :max-count="1" accept=".xlsx,.xls" @remove="onImportRemove">
        <a-button>
          <Icon icon="ant-design:upload-outlined" /> 选择 Excel 文件
        </a-button>
      </Upload>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanSatisfactionSurveyIdList">
  import { computed, onActivated, onMounted, ref, unref } from 'vue';
  import { Card, Modal, Select, Tag, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorListLightBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { indicatorSystemPage } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import type {
    SatisfactionSurvey,
    SurveyQuestion,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import {
    surveyInfo,
    surveyQuestionExport,
    surveyQuestionImport,
    surveyQuestionSaveList,
    surveyQuestionTemplate,
    surveySubmit,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/satisfaction-survey';
  import { SUBMIT_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { params, query } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}:路由参数名与占位符一致
  const surveyId = ((params.id ?? params.code) as string) || '';
  /** 查看态（列表「查看」进入 ?view=1） */
  const isView = String(query.view ?? '') === '1';

  const { showMessage, createMessage } = useMessage();
  const { setTitle } = useTabs(router);

  /** 调查信息与问题明细 */
  const survey = ref<SatisfactionSurvey | undefined>();
  const surveyRowId = ref('');
  const questions = ref<SurveyQuestion[]>([]);

  /** 后端 submitStatus 为数字，SUBMIT_STATUS 常量为字符串 → 统一 String 比较 */
  const isSubmitted = computed(
    () => String(survey.value?.submitStatus) === SUBMIT_STATUS.SUBMITTED,
  );
  /** 查看态或已提交 → 整页只读 */
  const readOnly = computed(() => isView || isSubmitted.value);

  /** 指标项全集（该调查年份全部体系的指标项，供问题抽屉选择/维度联动） */
  const indicatorItems = ref<Indicator[]>([]);

  onMounted(load);

  /** 标签页激活时刷新（keep-alive 下从列表再次进入）；首次激活跳过 */
  let skipFirstActivate = true;
  onActivated(() => {
    if (skipFirstActivate) {
      skipFirstActivate = false;
      return;
    }
    load();
  });

  async function load() {
    try {
      const info = await surveyInfo(surveyId);
      survey.value = info;
      surveyRowId.value = info.id ?? '';
      questions.value = info.questionList ?? [];
      setTitle(`${isView ? '查看' : '编辑'} · 城市体检满意度调查`);
      loadIndicatorItems(info.surveyYear);
    } catch (e: any) {
      showMessage(e?.message || '加载调查信息失败', 'error');
    }
  }

  /** 按调查年份取全部体系的指标项轻量列表（与后端按 set_year 反查口径一致） */
  async function loadIndicatorItems(year?: string) {
    if (!year) return;
    try {
      const page = await indicatorSystemPage({ year, pageNo: 1, pageSize: 20 });
      const lists = await Promise.all(page.list.map((set: any) => indicatorListLightBySet(set.id)));
      const merged = new Map<string, Indicator>();
      lists.flat().forEach((item) => item?.id && merged.set(item.id, item));
      indicatorItems.value = [...merged.values()].sort(
        (a, b) => Number(a.code ?? 0) - Number(b.code ?? 0),
      );
    } catch (e: any) {
      showMessage(e?.message || '指标项清单加载失败', 'error');
    }
  }

  // ==================== 筛选（本地过滤，查询按钮触发） ====================

  const filterInput = ref<{ questionText?: string; dim1?: string; dim2?: string }>({});
  /** 已应用的筛选条件（查询/重置 才更新） */
  const appliedFilter = ref<{ questionText?: string; dim1?: string; dim2?: string }>({});

  /** 一级维度下拉（取指标项全集，覆盖尚未录入问题的维度） */
  const dim1Options = computed(() => {
    const names = new Set<string>();
    indicatorItems.value.forEach((item) => item.dim1 && names.add(item.dim1));
    questions.value.forEach((q) => q.firstDimensionName && names.add(q.firstDimensionName));
    return [...names].sort().map((name) => ({ label: name, value: name }));
  });

  /** 二级维度下拉（选了一级维度时仅列其下维度） */
  const dim2Options = computed(() => {
    const dim1 = filterInput.value.dim1 || appliedFilter.value.dim1;
    const names = new Set<string>();
    indicatorItems.value.forEach((item) => {
      if (item.dim2 && (!dim1 || item.dim1 === dim1)) names.add(item.dim2);
    });
    questions.value.forEach((q) => {
      if (q.secondDimensionName && (!dim1 || q.firstDimensionName === dim1)) names.add(q.secondDimensionName);
    });
    return [...names].sort().map((name) => ({ label: name, value: name }));
  });

  function applyFilter() {
    appliedFilter.value = { ...filterInput.value };
  }

  function resetFilter() {
    filterInput.value = {};
    appliedFilter.value = {};
  }

  const filteredQuestions = computed(() => {
    const { questionText, dim1, dim2 } = appliedFilter.value;
    const kw = questionText?.trim();
    if (!kw && !dim1 && !dim2) return questions.value;
    return questions.value.filter((q) => {
      if (kw && !(q.questionText ?? '').includes(kw)) return false;
      if (dim1 && q.firstDimensionName !== dim1) return false;
      if (dim2 && q.secondDimensionName !== dim2) return false;
      return true;
    });
  });

  // ==================== 问题明细表格 ====================

  const tableColumns: BasicColumn[] = [
    { title: '序号', dataIndex: 'sortNo', width: 70, align: 'center' },
    { title: '调查问卷问题', dataIndex: 'questionText', slot: 'firstColumn', minWidth: 280, ellipsis: true },
    { title: '对应指标项', dataIndex: 'indicatorItemName', minWidth: 220, ellipsis: true },
    { title: '对应一级维度', dataIndex: 'firstDimensionName', width: 130, align: 'center' },
    { title: '对应二级维度', dataIndex: 'secondDimensionName', width: 130, align: 'center' },
    { title: '满意度（%）', dataIndex: 'satisfactionRate', width: 110, align: 'center' },
  ];

  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        ifShow: () => !readOnly.value,
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        ifShow: () => !readOnly.value,
        popConfirm: { title: '是否确认删除该问题？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    dataSource: filteredQuestions,
    columns: tableColumns,
    actionColumn: actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    // 打开前按查看态设 showFooter(抽屉级)
    setDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openDrawer(true, record);
  }

  /** 表单保存回调：新增/编辑一行后整单提交（index 由子组件回传定位） */
  async function handleSuccess(row: any, formValues: any) {
    const items = questions.value.map((item) => ({ ...item }));
    if (row.isNewRecord) {
      items.push({ ...formValues });
    } else {
      const idx = items.findIndex((item) => item.id === row.id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...formValues };
      }
    }
    await saveQuestions(items);
  }

  /** 删除一行后整单提交 */
  async function handleDelete(record: Recordable) {
    const items = questions.value.filter((item) => item.id !== record.id);
    await saveQuestions(items);
  }

  /** 整单保存问题并回读 */
  async function saveQuestions(items: Partial<SurveyQuestion>[]) {
    try {
      await surveyQuestionSaveList(surveyRowId.value, items);
      showMessage('保存成功');
      await load();
      reload();
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    }
  }

  // ==================== 提交 / 导出 / 导入 ====================

  /** 提交调查结果：校验满意度齐全后按一级维度加权计算综合满意度，提交后只读 */
  const submitting = ref(false);
  async function handleSubmitSurvey() {
    submitting.value = true;
    try {
      const { overallSatisfaction } = await surveySubmit(surveyRowId.value);
      showMessage(`提交成功（综合满意度 ${overallSatisfaction}%）`);
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  /** 清单生成：后端暂无接口，按用户要求保留按钮提示开发中 */
  function handleGenList() {
    createMessage.info('清单生成功能开发中');
  }

  /** 批量导出：下载当前调查全部问卷问题 Excel */
  async function handleExport() {
    await surveyQuestionExport(surveyRowId.value);
  }

  /** 下载导入模板 */
  async function handleTemplate() {
    await surveyQuestionTemplate();
  }

  const importVisible = ref(false);
  const importing = ref(false);
  const importFile = ref<File>();

  function openImport() {
    importFile.value = undefined;
    importVisible.value = true;
  }

  /** 拦截自动上传，仅持有文件引用 */
  function beforeImportUpload(file: File) {
    importFile.value = file;
    return false;
  }

  /** 移除已选文件 */
  function onImportRemove() {
    importFile.value = undefined;
  }

  async function doImport() {
    if (!importFile.value) return;
    importing.value = true;
    try {
      await surveyQuestionImport(surveyRowId.value, importFile.value);
      showMessage('导入成功');
      importVisible.value = false;
      await load();
      reload();
    } catch (e: any) {
      showMessage(e?.message || '导入失败', 'error');
    } finally {
      importing.value = false;
    }
  }
</script>
<style lang="less" scoped>
  .filter-label {
    color: rgba(0, 0, 0, 0.88);
  }
</style>
