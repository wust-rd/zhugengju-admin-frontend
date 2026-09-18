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
  /** 数据校验/保存失败提示（红字显示在表格上方，不走 message；空 = 无错误） */
  const validationError = ref<string>();
  const dirtyCols = new Map<string, ProjectColumn>();

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

  /** 单列落库:双值行二元组拆回 a/b 两键(仅 fill 行键提交,值全量同步)。
   *  纯保存:不校验(校验统一由「全表数据校验」按钮负责);
   *  仅同步自动计算行(233=234+235+236)后提交 */
  async function persistColumn(col: ProjectColumn) {
    syncEffectAutoSums(col);
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
  const autoPersistDirty = createAutoPersist(
    dirtyCols,
    (col) => persistColumn(col),
    (msg) => (validationError.value = msg),
  );

  /** 全表数据校验:本单位全部项目列逐列校验(含未修改列),错误逐条写入红字区;
   *  返回 {通过与否, 检查列数}(调用方提示用) */
  function validateAllColumns() {
    const errors: string[] = [];
    let checked = 0;
    for (const col of unitData.value?.projects ?? []) {
      checked += 1;
      const error = validateEffectColumn(col);
      if (error) errors.push(error);
    }
    validationError.value = errors.length ? errors.join('\n') : undefined;
    return { passed: errors.length === 0, checked };
  }

  /** 顶部保存:把全部脏列依次落库 */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`已保存，${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报数据已是最新`);
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
      validationError.value = `有 ${failed} 列保存失败：${firstError}`;
    } else {
      validationError.value = undefined;
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报（共 ${dirtyCount} 个项目列）`);
    }
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑) */
  async function toggleEdit(col: ProjectColumn) {
    if (editingColKey.value === col.key) {
      // 保存本列:纯保存,不校验(校验统一由「全表数据校验」按钮负责;r233 在落库前自动计算)
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(col);
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
    validationError,
    validateAllColumns,
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
