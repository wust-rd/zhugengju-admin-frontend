<!--
  ifco —— 项目进展填报（/ifco/progress-fill/list）

  页面结构:Card 工具栏(填报年份/填报季度/项目报送单位 | 新增项目/导出/保存)
  → 一级类目 RadioGroup(总览 + 8 大类,按钮样式,可换行)
  → 嵌套类目二级 RadioGroup(仅「老旧街区、老旧厂区、城中村等更新改造」)
  → 表格卡片(标题行右侧放「带入上一季度填写的项目列」按钮,仅非总览显示)
  → 转置填报表格:行 = 指标(第一列指标名称,缩进 = 层级 × 4 全角空格),列 = 项目。

  核心交互:
  - 默认整表为只读文本,点击项目列头「编辑」图标进入该列编辑态(同时仅一列;
    数值行 InputNumber,文字行 Input);自动行始终只读:
    4 个汇总行(到位资金/国家预算资金/中央预算资金/社会资本)按构成行求和,
    「城市更新项目总数」= 项目列数(各项目单元格留空,合计取 count);
    「新增就业岗位」= 合计级录入行,各项目单元格不填值,点指标名称右侧蓝色
    「编辑」按钮弹 Modal 直接录合计值;总览中为各类目录入值的总计,不可编辑;
  - 删除:二三四季度「带入」生成的列不可删,一季度带入上一年四季度的列可删;
  - 带入:连同上一季度已填数值一起带入,每个周期限一次;
  - 新增项目:居中 Modal 输入项目名称,确认后在表格最右追加项目列并自动滚动到最右、进入该列编辑;
  - 总览 tab 只读,按类目汇总:简单类目一列,嵌套类目「老旧街区、老旧厂区、城中村等更新改造」
    拆为三个二级子列(一级表头跨列);总计列在最左(固定第 4 列位置);
  - 数据按「年份 × 季度 × 报送单位 × 叶子类目」组织:总览只是当前报送单位的分表,
    统计页(/ifco/progress-statistics/list)按单位聚合,两页共享同一份内存假数据仓库。

  菜单注册(菜单名称「项目进展填报」):
   - 链接地址:/ifco/progress-fill/list
   - 组件位置:/ifco/progress-fill/list(与链接地址一致)
  当前后端尚未介入,数据为内存假数据(每周期 × 每单位 × 叶子类目 20 个示例项目列,默认江岸区);
  指标清单与汇总口径见 @jeesite/ifco/api/ifco/progress-fill,Excel 导出见同目录 export-excel.ts。
-->
<template>
  <PageWrapper>
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <span class="text-gray-500">填报年份</span>
          <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" @change="resetEditState" />
          <span class="ml-6 text-gray-500">填报季度</span>
          <Select v-model:value="quarter" :options="QUARTER_OPTIONS" class="ml-2 w-28" @change="resetEditState" />
          <span class="ml-6 text-gray-500">项目报送单位</span>
          <Select
            v-model:value="reportUnit"
            :options="reportUnitOptions"
            placeholder="请选择"
            class="ml-2 w-32"
            @change="resetEditState"
          />
        </div>
        <div class="flex items-center">
          <a-button v-if="!isOverview" @click="handleAddProject"> 新增项目 </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button type="primary" class="ml-2" @click="handleSave"> 保存 </a-button>
        </div>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <template #extra>
        <Tooltip v-if="!isOverview" :title="bringInTooltip">
          <a-button size="small" :disabled="broughtIn" @click="handleBringIn"> 代入上一季度填写的项目列 </a-button>
        </Tooltip>
      </template>
      <RadioGroup
        v-model:value="activeCategory"
        :options="categoryOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
      <RadioGroup
        v-if="subOptions.length"
        v-model:value="activeSub"
        :options="subOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
      <div ref="tableWrapRef">
        <Table
          :columns="tableColumns"
          :data-source="FILL_ROWS"
          :scroll="{ x: scrollX }"
          :pagination="false"
          sticky
          bordered
          size="small"
          row-key="key"
        />
      </div>
    </Card>

    <Modal v-model:open="addModalOpen" title="新增项目" centered @ok="handleAddConfirm">
      <div class="pt-2">
        <span class="text-gray-500">项目名称</span>
        <Input
          v-model:value="newProjectName"
          placeholder="请输入项目名称"
          allow-clear
          class="mt-2"
          @press-enter="handleAddConfirm"
        />
      </div>
    </Modal>

    <Modal v-model:open="totalModalOpen" :title="totalModalTitle" centered @ok="handleTotalConfirm">
      <div class="pt-2">
        <span class="text-gray-500">合计值（个）</span>
        <InputNumber
          v-model:value="totalInput"
          :min="0"
          :precision="0"
          controls
          placeholder="请输入合计值"
          class="mt-2 w-full"
          @press-enter="handleTotalConfirm"
        />
        <div class="mt-2 text-xs text-gray-400">各项目单元格不填值，此处数值即本类目合计。</div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProgressFillList">
  import { computed, h, nextTick, reactive, ref, watch, watchEffect } from 'vue';
  import { Card, Input, InputNumber, Modal, Popconfirm, RadioGroup, Select, Table, Tooltip } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { CategoryDef, IndicatorDef, PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
  import {
    CATEGORY_MAP,
    CATEGORIES,
    DATA_CATEGORIES,
    INDICATORS,
    INDICATOR_MAP,
    LEAF_CATEGORIES,
    QUARTER_OPTIONS,
    REPORT_UNITS,
    cellValue,
    ensureUnitPeriodData,
    getUnitPeriodData,
    grandTotal,
    prevPeriod,
    quarterLabel,
    tabTotal,
    toPeriodKey,
  } from '@jeesite/ifco/api/ifco/progress-fill';
  import { exportProgressFillExcel } from './export-excel';

  /** 表格行(指标) */
  type FillRow = {
    key: string;
    kind: IndicatorDef['kind'];
    name: string;
    unit: string;
    code: string;
  };

  const { showMessage } = useMessage();

  // ── 填报周期:年份 + 季度(默认当前) ──────────────────────────────────
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));
  const year = ref(dateUtil().year());
  // dayjs 的 quarter() 需 quarterOfYear 插件，这里用 month() 推导当前季度
  const quarter = ref(String(Math.floor(dateUtil().month() / 3) + 1));
  /** 项目报送单位(武汉各行政区,数据维度:切换即切换数据集;默认第一个区) */
  const reportUnit = ref<string>(REPORT_UNITS[0]);
  const reportUnitOptions = REPORT_UNITS.map((name) => ({ label: name, value: name }));

  // ── 类目选择:一级 + 嵌套二级 ────────────────────────────────────────
  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat.label, value: cat.key }));
  const activeCategory = ref(CATEGORIES[0].key);
  const activeSub = ref('old-street');
  const subOptions = computed(() =>
    (CATEGORY_MAP[activeCategory.value]?.children ?? []).map((item) => ({
      label: item.label,
      value: item.key,
    })),
  );

  /** 当前生效的叶子类目(总览返回 null) */
  const activeLeaf = computed(() => {
    if (activeCategory.value === 'overview') return null;
    const category = CATEGORY_MAP[activeCategory.value];
    return category.children ? CATEGORY_MAP[activeSub.value] : category;
  });
  const isOverview = computed(() => activeLeaf.value === null);

  // ── 数据:周期 × 报送单位(共享内存假数据仓库,懒初始化;统计页读同一份) ──
  /** 已带入标记:`${周期key}|${单位}` → 是否已带入(各单位独立) */
  const broughtMap = reactive<Record<string, boolean>>({});

  watchEffect(() => {
    if (reportUnit.value) {
      ensureUnitPeriodData(toPeriodKey(year.value, quarter.value), reportUnit.value);
    }
  });

  const periodData = computed<PeriodFillData | undefined>(() => {
    const unit = reportUnit.value;
    return unit ? getUnitPeriodData(toPeriodKey(year.value, quarter.value), unit) : undefined;
  });

  // ── 编辑态:同时仅一列 ───────────────────────────────────────────────
  const editingColKey = ref<string>();
  let addSeq = 0;
  let importSeq = 0;

  function resetEditState() {
    editingColKey.value = undefined;
  }

  // 切换类目后,上一类目的编辑状态一并退出
  watch([activeCategory, activeSub], resetEditState);

  // ── 新增项目:居中 Modal 命名,确认后追加最右列并滚动到位 ──────────────
  const addModalOpen = ref(false);
  const newProjectName = ref('');
  const tableWrapRef = ref<HTMLDivElement>();

  function handleAddProject() {
    newProjectName.value = '';
    addModalOpen.value = true;
  }

  function handleAddConfirm() {
    const name = newProjectName.value.trim();
    if (!name) {
      showMessage('请输入项目名称');
      return;
    }
    const leaf = activeLeaf.value;
    if (!leaf) return;
    const tab = currentTab(leaf.key);
    if (!tab) return;
    addSeq += 1;
    const col: ProjectColumn = { key: `add-${addSeq}`, name, imported: false, values: {} };
    tab.projects.push(col);
    addModalOpen.value = false;
    // 新增即填报:直接进入该列编辑,并把表格滚到最右露出新列
    editingColKey.value = col.key;
    nextTick(() => {
      const scroller = tableWrapRef.value?.querySelector('.ant-table-content, .ant-table-body');
      if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
      }
    });
  }

  // ── 合计级录入行(total,如新增就业岗位):指标名旁「编辑」弹 Modal 直接录合计值 ──
  const totalModalOpen = ref(false);
  const totalEditKey = ref<string>();
  const totalInput = ref<number>();

  function openTotalModal(indicatorKey: string) {
    const leaf = activeLeaf.value;
    if (!leaf) return;
    const tab = currentTab(leaf.key);
    if (!tab) return;
    totalEditKey.value = indicatorKey;
    totalInput.value = tab.totals[indicatorKey];
    totalModalOpen.value = true;
  }

  function handleTotalConfirm() {
    const leaf = activeLeaf.value;
    const key = totalEditKey.value;
    if (!leaf || !key) return;
    const tab = currentTab(leaf.key);
    if (!tab) return;
    if (totalInput.value === undefined || totalInput.value === null) {
      delete tab.totals[key];
    } else {
      tab.totals[key] = totalInput.value;
    }
    totalModalOpen.value = false;
  }

  /** 合计录入 Modal 的标题与字段名(去缩进) */
  const totalModalTitle = computed(() => {
    const item = totalEditKey.value ? INDICATOR_MAP[totalEditKey.value] : undefined;
    const name = (item?.name ?? '').trim();
    return name ? `${name}（合计）` : '填写合计值';
  });

  // ── 表格行(静态指标清单) ─────────────────────────────────────────────
  const FILL_ROWS: FillRow[] = INDICATORS.map((item) => ({
    key: item.key,
    kind: item.kind,
    name: item.name,
    unit: item.unit,
    code: item.code,
  }));

  /** 自动行(汇总/项目数)整行浅灰加粗只读 */
  const sumRowOnCell = (record: FillRow) => ({
    className: record.kind === 'sum' || record.kind === 'count' ? 'progress-fill-row-sum' : undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0) */
  function renderDisplay(value: number | string | undefined) {
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? value.toLocaleString('zh-CN') : value;
  }

  function setCellValue(col: ProjectColumn, indicatorKey: string, value: number | string | undefined) {
    if (value === undefined || value === '') {
      delete col.values[indicatorKey];
    } else {
      col.values[indicatorKey] = value;
    }
  }

  /** 单元格:编辑列内渲染输入控件(自动行除外),其余为只读文本 */
  function renderFillCell(item: IndicatorDef, col: ProjectColumn) {
    if (editingColKey.value === col.key && (item.kind === 'fill' || item.kind === 'text')) {
      if (item.kind === 'text') {
        return h(Input, {
          size: 'small',
          value: String(col.values[item.key] ?? ''),
          placeholder: '请输入来源说明',
          'onUpdate:value': (value: string) => setCellValue(col, item.key, value),
        });
      }
      const value = col.values[item.key];
      return h(InputNumber, {
        size: 'small',
        class: 'w-full',
        value: typeof value === 'number' ? value : undefined,
        min: 0,
        controls: false,
        placeholder: '请输入',
        'onUpdate:value': (value2: number | string | null) => setCellValue(col, item.key, value2 ?? undefined),
      });
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」 */
  function renderProjectHeader(col: ProjectColumn) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      h('span', { class: 'flex shrink-0 items-center gap-1' }, [
        h(Tooltip, { title: editing ? '完成编辑' : '编辑本列' }, () =>
          h(Icon, {
            icon: 'ant-design:edit-outlined',
            class: 'progress-fill-icon-edit',
            onClick: () => toggleEdit(col),
          }),
        ),
        deletable
          ? h(Popconfirm, { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) }, () =>
              h(Icon, {
                icon: 'ant-design:delete-outlined',
                class: 'progress-fill-icon',
              }),
            )
          : null,
      ]),
    ]);
  }

  function toggleEdit(col: ProjectColumn) {
    editingColKey.value = editingColKey.value === col.key ? undefined : col.key;
  }

  function handleDeleteColumn(col: ProjectColumn) {
    const leaf = activeLeaf.value;
    if (!leaf) return;
    const tab = currentTab(leaf.key);
    if (!tab) return;
    tab.projects = tab.projects.filter((item) => item.key !== col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  /** 当前单位在某叶子类目上的填报数据(懒初始化) */
  function currentTab(leafKey: string) {
    const unit = reportUnit.value;
    if (!unit) return undefined;
    return ensureUnitPeriodData(toPeriodKey(year.value, quarter.value), unit)[leafKey];
  }

  // ── 带入上一季度(当前单位;连同数值;二三四带入列不可删,一季度可删) ─────
  const broughtKey = computed(
    () => `${toPeriodKey(year.value, quarter.value)}|${reportUnit.value ?? ''}`,
  );
  const broughtIn = computed(() => broughtMap[broughtKey.value] === true);
  const bringInTooltip = computed(() =>
    quarter.value === '1'
      ? '带入上一年第四季度填报的项目列（含数值，带入列可删除）'
      : '带入本年度上一季度填报的项目列（含数值，带入列不可删除）',
  );

  function handleBringIn() {
    const unit = reportUnit.value;
    if (!unit || broughtMap[broughtKey.value]) return;
    const key = toPeriodKey(year.value, quarter.value);
    const prev = prevPeriod(year.value, quarter.value);
    const prevData = ensureUnitPeriodData(toPeriodKey(prev.year, prev.quarter), unit);
    const current = ensureUnitPeriodData(key, unit);
    importSeq += 1;
    for (const leaf of LEAF_CATEGORIES) {
      const source = prevData[leaf.key]?.projects ?? [];
      current[leaf.key]?.projects.push(
        ...source.map((item) => ({
          key: `${item.key}-imp${importSeq}`,
          name: item.name,
          imported: true,
          values: { ...item.values },
        })),
      );
    }
    broughtMap[broughtKey.value] = true;
    resetEditState();
    showMessage(`已带入 ${prev.year} 年${quarterLabel(prev.quarter)}填报的项目列`);
  }

  function handleSave() {
    // 假数据阶段数值已实时写入内存,保存动作仅退出编辑态并给出反馈
    resetEditState();
    showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报`);
  }

  // ── 导出 ────────────────────────────────────────────────────────────
  const exporting = ref(false);

  async function handleExport() {
    if (exporting.value || !periodData.value) return;
    exporting.value = true;
    try {
      await exportProgressFillExcel({
        year: year.value,
        quarter: quarter.value,
        periodData: periodData.value,
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报`);
    } finally {
      exporting.value = false;
    }
  }

  // ── 表格列 ──────────────────────────────────────────────────────────
  const tableCardTitle = computed(() => {
    const period = `${year.value}年 ${quarterLabel(quarter.value)}`;
    return isOverview.value
      ? `${period} ${reportUnit.value ? `${reportUnit.value} · ` : ''}总览`
      : `${period} · ${activeLeaf.value?.label}`;
  });

  /** 指标名称单元格:合计级录入行(total)在非总览下带蓝色「编辑」按钮,弹 Modal 直接录合计值 */
  function renderNameCell(value: string, record: FillRow) {
    if (isOverview.value || record.kind !== 'total') return value;
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate' }, value),
      h(Tooltip, { title: '填写合计值（各项目单元格不填值）' }, () =>
        h(Icon, {
          icon: 'ant-design:edit-outlined',
          class: 'progress-fill-icon-edit',
          onClick: () => openTotalModal(record.key),
        }),
      ),
    ]);
  }

  function leadingColumns(): TableColumnsType<FillRow> {
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: 400,
        fixed: 'left',
        className: 'progress-fill-col-name',
        render: (value: string, record: FillRow) => renderNameCell(value, record),
      },
      {
        key: 'unit',
        title: '计量单位',
        dataIndex: 'unit',
        width: 90,
        align: 'center',
      },
      {
        key: 'code',
        title: '代码',
        dataIndex: 'code',
        width: 80,
        align: 'center',
      },
    ];
  }

  function buildFillColumns(): TableColumnsType<FillRow> {
    const leaf = activeLeaf.value;
    if (!leaf) return [];
    const tab = periodData.value?.[leaf.key];
    const projects = tab?.projects ?? [];
    const projectColumns: TableColumnsType<FillRow> = projects.map((col, index) => ({
      key: col.key,
      title: renderProjectHeader(col),
      width: 140,
      align: 'right',
      // 奇偶列底色提升横向辨识度;编辑列高亮仍优先生效
      className:
        [
          index % 2 === 1 ? 'progress-fill-col-alt' : undefined,
          editingColKey.value === col.key ? 'progress-fill-col-editing' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderFillCell(INDICATOR_MAP[record.key], col),
    }));
    // 表头不做类目分组跨列,直接平铺项目列(类目已由 RadioGroup 表达)
    return [
      ...leadingColumns(),
      {
        key: 'total',
        title: '合计',
        width: 120,
        align: 'right',
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) => renderDisplay(tabTotal(INDICATOR_MAP[record.key], tab)),
      },
      ...projectColumns,
    ];
  }

  function buildOverviewColumns(): TableColumnsType<FillRow> {
    const data = periodData.value;
    /** 二级(叶子)类目列:值 = 该叶子类目的合计(total 行即录入值,count 行即列数) */
    const leafColumn = (leaf: CategoryDef): TableColumnsType<FillRow>[number] => ({
      key: leaf.key,
      title: leaf.label,
      width: 150,
      align: 'right',
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderDisplay(tabTotal(INDICATOR_MAP[record.key], data?.[leaf.key])),
    });
    /** 嵌套类目拆为三个二级子列(一级表头跨列),简单类目单列 */
    const categoryColumns: TableColumnsType<FillRow> = DATA_CATEGORIES.map((cat) =>
      cat.children?.length
        ? {
            key: cat.key,
            title: cat.label,
            children: cat.children.map((leaf) => leafColumn(leaf)),
          }
        : leafColumn(cat),
    );
    return [
      ...leadingColumns(),
      {
        key: 'grand',
        title: '总计',
        width: 130,
        align: 'right',
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) => renderDisplay(grandTotal(INDICATOR_MAP[record.key], data)),
      },
      ...categoryColumns,
    ];
  }

  const tableColumns = computed<TableColumnsType<FillRow>>(() =>
    isOverview.value ? buildOverviewColumns() : buildFillColumns(),
  );

  const scrollX = computed(() => {
    const fixedWidth = 400 + 90 + 80;
    if (isOverview.value) {
      // 叶子类目列数(嵌套类目拆三列) + 总计
      return fixedWidth + 130 + 150 * LEAF_CATEGORIES.length;
    }
    const count = activeLeaf.value ? (periodData.value?.[activeLeaf.value.key]?.projects.length ?? 0) : 0;
    return fixedWidth + 120 + 140 * count;
  });
</script>

<style scoped>
  .progress-fill-radios {
    row-gap: 8px;
  }
</style>

<style>
  /* 奇数项目列淡青底色(提升横向辨识度);优先级低于其后的汇总行/编辑列样式 */
  .progress-fill-col-alt {
    background: #f0fafa;
  }

  /* 汇总/项目数等自动行仅加粗,不加背景色;编辑中的项目列浅蓝底 */
  .progress-fill-row-sum {
    font-weight: 600;
  }

  .progress-fill-col-editing {
    background: #d5e3f2;
  }

  .progress-fill-col-name {
    white-space: nowrap;
  }

  /* 编辑本列 icon 常驻蓝色;删除 icon 灰色、悬停变蓝 */
  .progress-fill-icon-edit {
    color: #1677ff;
    cursor: pointer;
  }

  .progress-fill-icon-edit:hover {
    color: #4096ff;
  }

  .progress-fill-icon {
    color: #8c8c8c;
    cursor: pointer;
  }

  .progress-fill-icon:hover {
    color: #1677ff;
  }
</style>
