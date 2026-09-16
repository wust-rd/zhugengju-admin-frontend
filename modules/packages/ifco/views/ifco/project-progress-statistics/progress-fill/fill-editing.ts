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
import { validateProgressColumn } from './fill-validation';

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
  let addSeq = 0;
  /** 脏列登记:colKey → 所在叶子类目(保存时按 leafKey 提交) */
  const dirtyCols = new Map<string, { leafKey: string; col: ProjectColumn }>();

  function resetEditState() {
    editingColKey.value = undefined;
  }

  /** 筛选条件变化:未保存修改先确认再丢弃,确认后整包重载 */
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
          reload();
        },
      });
      return;
    }
    resetEditState();
    dirtyCols.clear();
    reload();
  }

  /** 单列落库:值全量同步语义;新列(无 id)保存后用返回的 projectId 回填。
   *  保存前校验(仅前端拦截):项目总投资 ≥ 103 本年完成投资额 ≥ 104 本年实际到位资金 */
  async function persistColumn(leafKey: string, col: ProjectColumn) {
    const error = validateProgressColumn(col);
    if (error) {
      throw new Error(error);
    }
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
  const autoPersistDirty = createAutoPersist(dirtyCols, ({ leafKey, col }) => persistColumn(leafKey, col), showMessage);

  /** 顶部保存:把全部脏列(可跨类目)依次落库 */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`暂无修改，${year.value} 年${quarterLabel(quarter.value)}项目进展填报数据已是最新`);
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
      showMessage(`有 ${failed} 列保存失败：${firstError}`);
    } else {
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报（共 ${dirtyCount} 个项目列）`);
    }
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑);
   *  校验未通过时保持编辑态,提示用户调整后再保存 */
  async function toggleEdit(col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key) {
      if (dirtyCols.has(col.key)) {
        const error = validateProgressColumn(col);
        if (error) {
          showMessage(error);
          return;
        }
      }
      // 完成编辑:先退出编辑态,脏列落库
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(leafKey, col);
        } catch (e: unknown) {
          showMessage(e instanceof Error ? e.message : '保存失败');
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
