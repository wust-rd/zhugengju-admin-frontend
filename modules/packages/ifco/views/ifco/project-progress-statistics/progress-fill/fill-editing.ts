/**
 * ifco 进展填报 —— 编辑状态机（从 list.vue 拆出）
 *
 * 同时仅一列可编辑；脏列登记跨类目收集（colKey → {leafKey, col}），
 * 顶部「保存」统一落库；"填一列保存一列"由切换时机自动落库（共用工厂）。
 * 含小计级录入（total 行）Modal 逻辑。
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { Modal } from 'antdv-next';
import type { CategoryDef, PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import {
  INDICATORS,
  deleteProgressProject,
  quarterLabel,
  saveProgressProject,
} from '@jeesite/ifco/api/ifco/progress-fill';
import { createAutoPersist } from '../../shared/dirty-persist';
import { autoFillSumRows, validateProgressColumn } from './fill-validation';

export type FillEditingDeps = {
  year: Ref<number>;
  quarter: Ref<string>;
  reportUnit: Ref<string | undefined>;
  unitEditable: ComputedRef<boolean>;
  /** 当前生效叶子类目（总览为 null） */
  activeLeaf: ComputedRef<CategoryDef | null>;
  periodData: Ref<PeriodFillData | undefined>;
  /** 筛选切换后的整包重载（丢弃确认通过时调用） */
  reload: () => Promise<void>;
  /** 列宽登记（新列落库后临时 key 宽度迁移到服务端 id 用），来自表格列模块 */
  colWidths: Record<string, number>;
  showMessage: (msg: string) => void;
};

export function createFillEditing(deps: FillEditingDeps) {
  const { year, quarter, reportUnit, unitEditable, activeLeaf, periodData, reload, colWidths, showMessage } = deps;

  const editingColKey = ref<string>();
  const saving = ref(false);
  /** 数据校验/保存失败提示（红字显示在表格上方，不走 message；空 = 无错误） */
  const validationError = ref<string>();
  let addSeq = 0;
  /** 脏列登记:colKey → 所在叶子类目(保存时按 leafKey 提交) */
  const dirtyCols = new Map<string, { leafKey: string; col: ProjectColumn }>();

  function resetEditState() {
    editingColKey.value = undefined;
  }

  /** 筛选条件变化:未保存修改先确认再丢弃,确认后整包重载;切换时清空校验错误提示 */
  function handleFilterChange() {
    if (dirtyCols.size) {
      Modal.confirm({
        title: '有未保存的修改',
        content: `当前有 ${dirtyCols.size} 个项目列的修改尚未保存，切换年份/季度/单位后将丢弃。确定切换吗？`,
        okText: '丢弃并切换',
        cancelText: '继续编辑',
        onOk: () => {
          resetEditState();
          dirtyCols.clear();
          validationError.value = undefined;
          reload();
        },
      });
      return;
    }
    resetEditState();
    dirtyCols.clear();
    validationError.value = undefined;
    reload();
  }

  /** 单列落库:值全量同步语义;新列(无 id)保存后用返回的 projectId 回填。
   *  保存前校验(仅前端拦截):项目总投资 ≥ 103 本年完成投资额 ≥ 104 本年实际到位资金 */
  async function persistColumn(leafKey: string, col: ProjectColumn) {
    // 纯保存:不代填、不校验(求和与校验由「全表自动求和」「全表数据校验」按钮显式触发,
    // 顶部「保存」有独立的全表校验前置)
    const values: Record<string, number | string> = {};
    for (const item of INDICATORS) {
      if (item.kind !== 'fill' && item.kind !== 'text') continue;
      const value = col.values[item.key];
      if (value !== undefined && value !== '' && !Array.isArray(value)) values[item.key] = value;
    }
    const isNew = !col.id;
    const res = await saveProgressProject({
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value!,
      leafKey,
      project: { id: isNew ? undefined : col.id, name: col.name, values },
    });
    if (isNew) {
      const tempKey = col.key;
      col.id = res.projectId;
      col.key = res.projectId;
      if (editingColKey.value === tempKey) editingColKey.value = res.projectId;
      if (colWidths[tempKey] !== undefined) {
        colWidths[res.projectId] = colWidths[tempKey]!;
        delete colWidths[tempKey];
      }
      dirtyCols.delete(tempKey);
    }
    dirtyCols.delete(col.key);
  }

  /** 切换前自动落库(共用工厂):把当前全部脏列(可跨类目)依次保存;失败列保留在登记中并提示 */
  const autoPersistDirty = createAutoPersist(
    dirtyCols,
    ({ leafKey, col }) => persistColumn(leafKey, col),
    (msg) => (validationError.value = msg),
  );

  /** 全表数据校验:全部类目页签的全部项目列逐列校验(含未修改列),错误逐条写入红字区;
   *  返回 {通过与否, 检查列数}(调用方提示用) */
  function validateAllColumns() {
    const errors: string[] = [];
    let checked = 0;
    const data = periodData.value;
    if (data) {
      for (const [leafKey, tab] of Object.entries(data)) {
        for (const col of tab.projects) {
          checked += 1;
          const error = validateProgressColumn(col, leafKey);
          if (error) errors.push(error);
        }
      }
    }
    validationError.value = errors.length ? errors.join('\n') : undefined;
    return { passed: errors.length === 0, checked };
  }

  /** 全表自动代填:全部类目页签的全部项目列执行必填项代填,有代填的列登记为脏列
   *  (随顶部保存/自动落库写库);返回发生代填的列数 */
  function autoFillAllColumns() {
    let filled = 0;
    const data = periodData.value;
    if (data) {
      for (const [leafKey, tab] of Object.entries(data)) {
        for (const col of tab.projects) {
          const before = Object.keys(col.values).length;
          autoFillSumRows(col);
          if (Object.keys(col.values).length > before) {
            filled += 1;
            dirtyCols.set(col.key, { leafKey, col });
          }
        }
      }
    }
    return filled;
  }

  /** 顶部保存:把全部脏列(可跨类目)依次落库(纯保存,不校验——校验统一由「全表数据校验」按钮负责) */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`已保存，${year.value} 年${quarterLabel(quarter.value)}项目进展填报数据已是最新`);
      return;
    }
    saving.value = true;
    let failed = 0;
    let firstError = '';
    for (const [, { leafKey, col }] of [...dirtyCols]) {
      try {
        await persistColumn(leafKey, col);
      } catch (e: unknown) {
        failed += 1;
        firstError ||= e instanceof Error ? e.message : '保存失败';
      }
    }
    saving.value = false;
    resetEditState();
    if (failed > 0) {
      validationError.value = `有 ${failed} 列保存失败：${firstError}`;
    } else {
      validationError.value = undefined;
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报（共 ${dirtyCount} 个项目列）`);
    }
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑);
   *  校验未通过时保持编辑态,提示用户调整后再保存 */
  async function toggleEdit(col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key) {
      // 保存本列:纯保存,不代填、不校验(校验由「全表数据校验」/顶部「保存」负责)
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(leafKey, col);
        } catch (e: unknown) {
          validationError.value = e instanceof Error ? e.message : '保存失败';
        } finally {
          saving.value = false;
        }
      }
      return;
    }
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    // 进入新列编辑前,先把之前未保存的脏列自动落库(填一列保存一列)
    await autoPersistDirty();
    validationError.value = undefined;
    editingColKey.value = col.key;
  }

  async function handleDeleteColumn(col: ProjectColumn) {
    const leaf = activeLeaf.value;
    if (!leaf || !periodData.value) return;
    const tab = periodData.value[leaf.key];
    if (!tab) return;
    if (col.id) {
      try {
        await deleteProgressProject(col.id);
      } catch (e: unknown) {
        showMessage(e instanceof Error ? e.message : '删除失败');
        return;
      }
    }
    tab.projects = tab.projects.filter((item) => item.key !== col.key);
    dirtyCols.delete(col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  return {
    editingColKey,
    saving,
    validationError,
    validateAllColumns,
    autoFillAllColumns,
    addSeq,
    dirtyCols,
    resetEditState,
    handleFilterChange,
    persistColumn,
    autoPersistDirty,
    handleSave,
    toggleEdit,
    handleDeleteColumn,
  };
}

export type FillEditing = ReturnType<typeof createFillEditing>;
