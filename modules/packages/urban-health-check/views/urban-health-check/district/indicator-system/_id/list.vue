<!--
  市住更局 —— 区级体检指标体系 编辑页（原型图3）

  路由(RESTful,隐藏菜单):
   - 链接地址:/urban-health-check/district/indicator-system/{id}({id}=体系主键)
   - 组件位置:/urban-health-check/district/indicator-system/_id/list
   - ?view=1 查看态；体系已提交整页只读（黄条提供「撤回提交」）
  核心交互（区级与市级差异）：
   - 必选指标项（基础运行评估 17 项，isRequired=1）直接在列表展示、不可编辑/删除；
   - 「新增」打开标准库多选弹窗（59 项推荐指标，已应用的禁选），确认后增量生成多条指标项；
   - 各片区自选指标项 —— 每套体系独立维护。
  接口：districtSetInfo/Submit/CancelSubmit + districtItemList/Save/Delete/ApplyStd + stdIndicatorList。
  「下载模板/一键导入/批量导出」后端无区级指标项导入导出接口，按先例提示功能开发中。
-->
<template>
  <PageWrapper>
    <!-- 顶部黄条信息栏（只读展示；待提交提供「提交指标体系」，已提交提供「撤回提交」） -->
    <Card class="mb-3">
      <div
        class="flex items-center justify-between px-4 py-3 flex-wrap gap-y-2"
        style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px"
      >
        <div class="flex items-center flex-wrap" style="column-gap: 48px">
          <span>体检年份：<span class="font-medium">{{ set?.setYear ?? '-' }}年</span></span>
          <span>体检片区：<span class="font-medium">{{ set?.areaName ?? '-' }}</span></span>
          <span>指标项数量：<span class="font-medium">{{ set?.indicatorCount ?? 0 }} 项</span></span>
          <span v-if="set?.fillProgress != null" class="text-gray-500">填报进度：{{ set.fillProgress }}%</span>
        </div>
        <div class="flex items-center">
          <template v-if="!readOnly">
            <a-button type="primary" :loading="submitting" @click="handleSubmitSet">提交指标体系</a-button>
          </template>
          <template v-else-if="isSubmitted">
            <a-button class="mr-2" :loading="canceling" @click="handleCancelSubmit">撤回提交</a-button>
            <Tag color="blue" variant="solid" style="border-radius: 10px">已提交</Tag>
          </template>
        </div>
      </div>
    </Card>

    <!-- 筛选卡（本地过滤） -->
    <Card class="mb-3">
      <div class="flex items-center flex-wrap" style="column-gap: 12px">
        <span class="filter-label">指标项</span>
        <a-input
          v-model:value="filterInput.itemName"
          placeholder="请输入内容"
          allow-clear
          style="width: 200px"
          @pressEnter="applyFilter"
        />
        <span class="filter-label">体检维度</span>
        <Select
          v-model:value="filterInput.dimension"
          placeholder="请选择"
          allow-clear
          :options="dimensionOptions"
          style="width: 170px"
        />
        <span class="filter-label">体检项</span>
        <Select
          v-model:value="filterInput.checkItem"
          placeholder="请选择"
          allow-clear
          :options="checkItemOptions"
          style="width: 170px"
        />
        <a-button type="primary" @click="applyFilter">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>
    </Card>

    <!-- 指标项表格 -->
    <Card>
      <BasicTable @register="registerTable" :showIndexColumn="false">
        <template #toolbar>
          <div class="flex items-center w-full justify-between">
            <a-button v-if="canEdit" type="primary" @click="openApplyModal">
              <Icon icon="i-fluent:add-12-filled" /> 新增
            </a-button>
            <div v-else />
            <div class="flex items-center">
              <a-button class="mr-2" @click="devPending">下载模板</a-button>
              <a-button class="mr-2" @click="devPending">一键导入</a-button>
              <a-button @click="devPending">批量导出</a-button>
            </div>
          </div>
        </template>
        <template #isRequired="{ record }">
          <Tag v-if="record.isRequired === 1" color="red" style="border-radius: 10px">必选</Tag>
          <Tag v-else style="border-radius: 10px">可选</Tag>
        </template>
        <template #firstColumn="{ record }">
          <a
            @click="handleForm({ ...record, isNewRecord: false, isView: true })"
            :title="record.itemName"
          >
            {{ record.itemName }}
          </a>
        </template>
      </BasicTable>
    </Card>

    <!-- 可选指标项 编辑/查看抽屉 -->
    <InputForm
      :read-only="readOnly"
      :set-info="set"
      @register="registerDrawer"
      @success="handleItemSaved"
    />

    <!-- 标准库多选弹窗（新增指标项，维度→体检项两级折叠 + 复选框列表） -->
    <Modal
      v-model:open="applyVisible"
      title="新增指标项（从 2026 片区体检指标表多选）"
      width="720px"
      centered
      :confirm-loading="applying"
      ok-text="确认新增"
      cancel-text="取消"
      @ok="doApply"
    >
      <div class="pb-3 flex items-center justify-between">
        <span class="text-xs" style="color: #999">
          展开体检维度 → 体检项勾选；勾选体检项=全选其下指标项
        </span>
        <span class="text-xs">
          已勾选 <span class="font-medium" style="color: #1677ff">{{ checkedStdCount }}</span> 项
        </span>
      </div>
      <div class="rounded border" style="max-height: 460px; overflow: auto">
        <Collapse v-model:active-key="activeDimKeys">
          <CollapsePanel v-for="dim in stdGroups" :key="dim.name" :header="`${dim.name}（${dim.itemCount} 项）`">
            <Collapse v-model:active-key="activeCiKeys">
              <CollapsePanel v-for="ci in dim.children" :key="ci.key">
                <template #header>
                  <span
                    class="flex items-center"
                    @click.stop
                  >
                    <Checkbox
                      class="mr-2"
                      :checked="isGroupAllChecked(ci)"
                      :indeterminate="isGroupIndeterminate(ci)"
                      :disabled="isGroupDisabled(ci)"
                      @change="(e) => toggleGroup(ci, e.target.checked)"
                      @click.stop
                    />
                    <span>{{ ci.name }}</span>
                    <span class="ml-2 text-xs" style="color: #999">{{ ci.stds.length }} 项</span>
                  </span>
                </template>
                <div
                  v-for="std in ci.stds"
                  :key="std.id"
                  class="flex items-center px-3 py-2"
                  :style="{
                    borderBottom: '1px solid #f0f0f0',
                    background: isStdExists(std) ? '#fafafa' : '#fff',
                    color: isStdExists(std) ? '#bbb' : undefined,
                  }"
                >
                  <Checkbox
                    :checked="selectedStdIds.includes(std.id!)"
                    :disabled="isStdExists(std) || std.isRequired === 1"
                    @change="(e) => toggleStd(std.id!, e.target.checked)"
                  />
                  <span class="ml-2 w-6 text-center text-xs" style="color: #999">{{ std.itemNo }}</span>
                  <span class="flex-1 ellipsis" :title="std.itemName">{{ std.itemName }}</span>
                  <span class="text-xs mx-2" style="color: #999">{{ std.itemUnit }}</span>
                  <Tag v-if="std.isRequired === 1" color="red" style="border-radius: 10px">必选</Tag>
                  <Tag v-if="isStdExists(std)" class="ml-1" style="border-radius: 10px">已应用</Tag>
                </div>
              </CollapsePanel>
            </Collapse>
          </CollapsePanel>
        </Collapse>
      </div>
      <div class="pt-2 text-xs" style="color: #999">
        必选指标项（基础运行评估）默认勾选且不可取消；已应用的指标项不可重复添加。
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorSystemIdList">
  import { computed, onActivated, onMounted, ref, unref } from 'vue';
  import { Card, Checkbox, Collapse, CollapsePanel, Modal, Select, Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useTabs } from '@jeesite/core/hooks/web/useTabs';
  import type {
    DistrictItem,
    DistrictSet,
    StdIndicator,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import {
    districtItemApplyStd,
    districtItemDelete,
    districtItemList,
    districtSetCancelSubmit,
    districtSetInfo,
    districtSetSubmit,
    stdIndicatorList,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import { SUBMIT_STATUS } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-system';
  import InputForm from './form.vue';

  const { params, query } = unref(router.currentRoute);
  const setId = ((params.id ?? params.code) as string) || '';
  const isView = String(query.view ?? '') === '1';

  const { showMessage, createMessage } = useMessage();
  const { setTitle } = useTabs(router);

  /** 体系信息与指标项（全量本地筛选） */
  const set = ref<DistrictSet | undefined>();
  const items = ref<DistrictItem[]>([]);

  const isSubmitted = computed(() => String(set.value?.submitStatus) === SUBMIT_STATUS.SUBMITTED);
  /** 查看态或已提交 → 整页只读（已提交可撤回解锁） */
  const readOnly = computed(() => isView || isSubmitted.value);
  const canEdit = computed(() => !readOnly.value);

  onMounted(load);

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
      const info = await districtSetInfo(setId);
      set.value = info;
      setTitle(`${isView ? '查看' : '编辑'} · ${info.areaName ?? ''}片区体检指标体系`);
      items.value = await districtItemList(setId);
      reload();
      // 预取标准库（多选弹窗数据源），首次打开弹窗零等待；失败静默，打开时再拉并提示
      if (stdList.value.length === 0) {
        stdIndicatorList()
          .then((list) => (stdList.value = list))
          .catch(() => undefined);
      }
    } catch (e: any) {
      showMessage(e?.message || '加载体系信息失败', 'error');
    }
  }

  // ==================== 筛选（本地过滤） ====================

  const filterInput = ref<{ itemName?: string; dimension?: string; checkItem?: string }>({});
  const appliedFilter = ref<{ itemName?: string; dimension?: string; checkItem?: string }>({});

  const dimensionOptions = computed(() => {
    const names = new Set<string>();
    items.value.forEach((it) => it.firstDimension && names.add(it.firstDimension));
    stdList.value.forEach((s) => s.dimensionName && names.add(s.dimensionName));
    return [...names].sort().map((name) => ({ label: name, value: name }));
  });

  const checkItemOptions = computed(() => {
    const dim = filterInput.value.dimension;
    const names = new Set<string>();
    items.value.forEach((it) => {
      if (it.checkItemName && (!dim || it.firstDimension === dim)) names.add(it.checkItemName);
    });
    stdList.value.forEach((s) => {
      if (s.checkItemName && (!dim || s.dimensionName === dim)) names.add(s.checkItemName);
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

  const filteredItems = computed(() => {
    const { itemName, dimension, checkItem } = appliedFilter.value;
    const kw = itemName?.trim();
    if (!kw && !dimension && !checkItem) return items.value;
    return items.value.filter((it) => {
      if (kw && !(it.itemName ?? '').includes(kw)) return false;
      if (dimension && it.firstDimension !== dimension) return false;
      if (checkItem && it.checkItemName !== checkItem) return false;
      return true;
    });
  });

  // ==================== 指标项表格 ====================

  /**
   * 连续相同值合并单元格：每行返回 rowSpan（组首行=连续次数，其余 0）。
   * 注意 antd Table 的 customCell index 是当前页内序号，因此按行 id 反查全量下标，
   * 且分页 pageSize 设为 60 保证 59 项标准库全量单页（合并组不被分页拆断）。
   */
  function rowSpans(list: DistrictItem[], keyOf: (it: DistrictItem) => string): number[] {
    const spans = new Array(list.length).fill(1);
    for (let i = list.length - 2; i >= 0; i--) {
      if (keyOf(list[i]) === keyOf(list[i + 1]) && spans[i + 1] > 0) {
        spans[i] = spans[i + 1] + 1;
        spans[i + 1] = 0;
      }
    }
    return spans;
  }

  const dimSpans = computed(() => rowSpans(filteredItems.value, (it) => it.firstDimension ?? ''));
  const checkItemSpans = computed(() =>
    rowSpans(filteredItems.value, (it) => `${it.firstDimension ?? ''}|${it.checkItemName ?? ''}`),
  );

  const tableColumns: BasicColumn[] = [
    {
      title: '体检维度',
      dataIndex: 'firstDimension',
      width: 130,
      // antdv-next 表格列用 onCell（antd customCell 等价）返回单元格属性实现合并
      onCell: (record: Recordable) => {
        const idx = filteredItems.value.findIndex((it) => it.id === record.id);
        return { rowSpan: dimSpans.value[idx] ?? 1 };
      },
    },
    {
      title: '体检项',
      dataIndex: 'checkItemName',
      width: 100,
      align: 'center',
      onCell: (record: Recordable) => {
        const idx = filteredItems.value.findIndex((it) => it.id === record.id);
        return { rowSpan: checkItemSpans.value[idx] ?? 1 };
      },
    },
    { title: '序号', dataIndex: 'itemNo', width: 70, align: 'center' },
    { title: '指标项', dataIndex: 'itemName', slot: 'firstColumn', minWidth: 260, ellipsis: true },
    { title: '指标单位', dataIndex: 'itemUnit', width: 100, align: 'center' },
    { title: '指标来源', dataIndex: 'itemSource', width: 130, ellipsis: true },
    { title: '必选', dataIndex: 'isRequired', width: 80, align: 'center', slot: 'isRequired' },
  ];

  const actionColumn: BasicColumn = {
    width: 140,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        // 必选指标项不可编辑（后端同样强校验 400）
        ifShow: () => canEdit.value && record.isRequired !== 1,
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        ifShow: () => canEdit.value && record.isRequired !== 1,
        popConfirm: { title: '是否确认删除该指标项？', confirm: () => handleDelete(record) },
      },
    ],
  } as BasicColumn;

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    dataSource: filteredItems,
    columns: tableColumns,
    actionColumn,
    showTableSetting: true,
    showIndexColumn: false,
    // 合并单元格要求合并组不被分页拆断：59 项标准库全量单页展示
    pagination: { pageSize: 60, showSizeChanger: false },
    canResize: true,
  });

  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView && !readOnly.value });
    openDrawer(true, record);
  }

  async function handleItemSaved() {
    await load();
  }

  async function handleDelete(record: Recordable) {
    try {
      await districtItemDelete([record.id]);
      showMessage('删除成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '删除失败', 'error');
    }
  }

  // ==================== 提交 / 撤回 ====================

  const submitting = ref(false);
  async function handleSubmitSet() {
    submitting.value = true;
    try {
      await districtSetSubmit(setId);
      showMessage('提交成功');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '提交失败', 'error');
    } finally {
      submitting.value = false;
    }
  }

  const canceling = ref(false);
  async function handleCancelSubmit() {
    canceling.value = true;
    try {
      await districtSetCancelSubmit(setId);
      showMessage('已撤回，可继续编辑');
      await load();
    } catch (e: any) {
      showMessage(e?.message || '撤回失败', 'error');
    } finally {
      canceling.value = false;
    }
  }

  // ==================== 标准库多选弹窗（新增指标项，两级折叠 + 复选框） ====================

  const applyVisible = ref(false);
  const applying = ref(false);
  /** 标准库全集（弹窗数据源） */
  const stdList = ref<StdIndicator[]>([]);
  /** 已存在的业务序号集合（按 itemNo 判重） */
  const existsNos = ref<Set<number>>(new Set());
  /** 已勾选的指标项 stdId 列表（叶子级单一状态源） */
  const selectedStdIds = ref<string[]>([]);
  /** 折叠面板展开状态（维度/体检项两级） */
  const activeDimKeys = ref<(string | number)[]>([]);
  const activeCiKeys = ref<(string | number)[]>([]);

  type StdGroup = {
    key: string;
    name: string;
    itemCount: number;
    stds: StdIndicator[];
  };
  type StdDimGroup = {
    name: string;
    itemCount: number;
    children: StdGroup[];
  };

  /** 标准库 → 维度 → 体检项 两级分组（标准库 1~59 顺序天然分组） */
  const stdGroups = computed<StdDimGroup[]>(() => {
    const dims: StdDimGroup[] = [];
    let dim: StdDimGroup | undefined;
    let ci: StdGroup | undefined;
    stdList.value.forEach((std) => {
      if (!dim || dim.name !== std.dimensionName) {
        dim = { name: std.dimensionName ?? '未分组', itemCount: 0, children: [] };
        dims.push(dim);
        ci = undefined;
      }
      if (!ci || ci.name !== std.checkItemName) {
        ci = {
          key: `${std.dimensionName}|${std.checkItemName}`,
          name: std.checkItemName ?? '未分组',
          itemCount: 0,
          stds: [],
        };
        dim.children.push(ci);
      }
      ci.stds.push(std);
      ci.itemCount += 1;
      dim.itemCount += 1;
    });
    return dims;
  });

  /** 已勾选且未应用的指标项数量 */
  const checkedStdCount = computed(
    () => selectedStdIds.value.filter((id) => {
      const std = stdList.value.find((s) => s.id === id);
      return std && !isStdExists(std);
    }).length,
  );

  function isStdExists(std: StdIndicator | Recordable) {
    return existsNos.value.has(Number(std.itemNo));
  }

  /** 单个指标项勾选切换 */
  function toggleStd(id: string, checked: boolean) {
    selectedStdIds.value = checked
      ? [...new Set([...selectedStdIds.value, id])]
      : selectedStdIds.value.filter((k) => k !== id);
  }

  /** 体检项分组内可勾选（未应用且非必选固定）的指标项 */
  function groupSelectableStds(ci: StdGroup) {
    return ci.stds.filter((s) => !isStdExists(s) && s.isRequired !== 1);
  }

  function isGroupAllChecked(ci: StdGroup) {
    const selectable = groupSelectableStds(ci);
    return selectable.length > 0 && selectable.every((s) => selectedStdIds.value.includes(s.id!));
  }

  function isGroupIndeterminate(ci: StdGroup) {
    const selectable = groupSelectableStds(ci);
    const checked = selectable.filter((s) => selectedStdIds.value.includes(s.id!)).length;
    return checked > 0 && checked < selectable.length;
  }

  /** 分组无任何可勾选项时整体禁用（如必选已全部应用） */
  function isGroupDisabled(ci: StdGroup) {
    return groupSelectableStds(ci).length === 0;
  }

  /** 体检项全选/清空（仅影响可勾选项；固定勾选的必选项保持） */
  function toggleGroup(ci: StdGroup, checked: boolean) {
    const ids = groupSelectableStds(ci).map((s) => s.id!);
    selectedStdIds.value = checked
      ? [...new Set([...selectedStdIds.value, ...ids])]
      : selectedStdIds.value.filter((k) => !ids.includes(k));
  }

  async function openApplyModal() {
    try {
      if (stdList.value.length === 0) {
        stdList.value = await stdIndicatorList();
      }
      existsNos.value = new Set(items.value.map((it) => Number(it.itemNo)));
      // 必选且未应用的默认勾选且不可取消；其余默认不勾
      selectedStdIds.value = stdList.value
        .filter((s) => s.isRequired === 1 && !existsNos.value.has(Number(s.itemNo)))
        .map((s) => s.id!);
      // 默认展开第一个维度（体检项收起，用户逐项点开）；每次打开重置
      activeDimKeys.value = stdGroups.value.length > 0 ? [stdGroups.value[0].name] : [];
      activeCiKeys.value = [];
      applyVisible.value = true;
    } catch (e: any) {
      showMessage(e?.message || '标准库加载失败', 'error');
    }
  }

  async function doApply() {
    const selected = stdList.value.filter(
      (s) => selectedStdIds.value.includes(s.id!) && !isStdExists(s),
    );
    if (selected.length === 0) {
      showMessage('请勾选要新增的指标项');
      return;
    }
    applying.value = true;
    try {
      const { insertCount, itemCount } = await districtItemApplyStd(
        setId,
        selected.map((s) => ({ stdId: s.id! })),
      );
      showMessage(`新增成功：本次应用 ${insertCount} 项，当前共 ${itemCount} 项`);
      applyVisible.value = false;
      await load();
    } catch (e: any) {
      showMessage(e?.message || '应用失败', 'error');
    } finally {
      applying.value = false;
    }
  }

  /** 后端暂无区级指标项导入/导出接口，按先例提示开发中 */
  function devPending() {
    createMessage.info('功能开发中');
  }
</script>
<style lang="less" scoped>
  .filter-label {
    color: rgba(0, 0, 0, 0.88);
  }
</style>
