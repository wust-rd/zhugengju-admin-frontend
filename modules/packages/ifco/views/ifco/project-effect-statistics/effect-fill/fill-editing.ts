/**
 * ifco 成效填报 —— 编辑状态机（从 list.vue 拆出）
 *
 * 同时仅一列可编辑；脏列登记（colKey → col）顶部「保存」统一落库；
 * "填一列保存一列"由切换时机自动落库（共用工厂）。成效域无类目维度。
 */
import { ref, type ComputedRef, type Ref } from 'vue';
import { Modal } from 'antdv-next';
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
import type { EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
import { deleteEffectProject, quarterLabel, saveEffectProject } from '@jeesite/ifco/api/ifco/effect-fill';
import { createAutoPersist } from '../../shared/dirty-persist';
import { syncEffectAutoSums, validateEffectColumn } from './fill-validation';

export type FillEditingDeps = {
  year: Ref<number>;
  quarter: Ref<string>;
  reportUnit: Ref<string | undefined>;
  unitEditable: ComputedRef<boolean>;
  unitData: Ref<EffectUnitData | undefined>;
  /** 筛选切换后的整包重载（丢弃确认通过时调用） */
  reload: () => Promise<void>;
  /** 列宽登记（新列落库后临时 key 宽度迁移到服务端 id 用），来自表格列模块 */
  colWidths: Record<string, number>;
  showMessage: (msg: string) => void;
};

export function createFillEditing(deps: FillEditingDeps) {
  const { year, quarter, reportUnit, unitEditable, unitData, reload, colWidths, showMessage } = deps;

  const editingColKey = ref<string>();
  const saving = ref(false);
  const dirtyCols = new Map<string, ProjectColumn>();

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

  /** 单列落库:双值行二元组拆回 a/b 两键(仅 fill 行键提交,值全量同步)。
   *  提交前先同步自动计算行(233=234+235+236),再做保存前校验(仅前端拦截) */
  async function persistColumn(col: ProjectColumn) {
    syncEffectAutoSums(col);
    const error = validateEffectColumn(col);
    if (error) {
      throw new Error(error);
    }
    const res = await saveEffectProject({
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value!,
      project: { id: col.id, name: col.name, values: col.values },
    });
    if (!col.id) {
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

  /** 切换前自动落库(共用工厂):把当前全部脏列依次保存;失败列保留在登记中并提示 */
  const autoPersistDirty = createAutoPersist(dirtyCols, (col) => persistColumn(col), showMessage);

  /** 顶部保存:把全部脏列依次落库 */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`暂无修改，${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报数据已是最新`);
      return;
    }
    saving.value = true;
    let failed = 0;
    let firstError = '';
    for (const col of [...dirtyCols.values()]) {
      try {
        await persistColumn(col);
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
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报（共 ${dirtyCount} 个项目列）`);
    }
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑);
   *  校验未通过时保持编辑态,提示用户调整后再保存 */
  async function toggleEdit(col: ProjectColumn) {
    if (editingColKey.value === col.key) {
      if (dirtyCols.has(col.key)) {
        syncEffectAutoSums(col);
        const error = validateEffectColumn(col);
        if (error) {
          showMessage(error);
          return;
        }
      }
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(col);
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
    if (!unitData.value) return;
    if (col.id) {
      try {
        await deleteEffectProject(col.id);
      } catch (e: unknown) {
        showMessage(e instanceof Error ? e.message : '删除失败');
        return;
      }
    }
    unitData.value.projects = unitData.value.projects.filter((item) => item.key !== col.key);
    dirtyCols.delete(col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  return {
    editingColKey,
    saving,
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
