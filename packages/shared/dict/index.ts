/**
 * @jeesite/shared/dict —— 业务字典按需取用的通用封装
 *
 * 用法（组件 setup 中）：
 *   const options = useDictOptions(DICT_TYPE.fiveChangeType, FALLBACK_OPTIONS);
 *   const groupMap = useDictGroupMap(DICT_TYPE.fiveChangeSubType, FALLBACK_MAP);
 * 返回的 ref 初始为传入的静态兜底清单，字典加载成功后自动覆盖——下拉不会闪空，
 * 字典未配置/加载失败时界面仍可用。需要自行管理加载时机时，用下方的纯转换函数。
 *
 * 口径（重要）：选项 value 一律取 dict_label（中文标签）。本系统业务表（如 wg_big/
 * wg_sub）存中文、查询参数传中文；字典的 dict_value（数字键，如 1/2/3）与后端节点
 * id（雪花 ID）均不能作业务值。新增字典接入必须沿用此口径，否则与存量数据错位。
 *
 * 缓存：走框架 useDict（userStore 会话级 dictListMap），同会话同类型只请求一次；
 * 字典管理改数据后需刷新页面才能看到。
 */
import { ref, type Ref } from 'vue';
import { useDict } from '@jeesite/core/components/Dict';

export * from './dict-types';

/** 下拉选项（value=中文标签，见模块头口径说明） */
export interface DictOption {
  label: string;
  value: string;
}

/** 字典树列表 → 单层选项（取根节点，name 去重防脏数据） */
export function dictTreeToOptions(dictList: Recordable[]): DictOption[] {
  const seen = new Set<string>();
  const options: DictOption[] = [];
  for (const item of dictList) {
    if (item?.pId == '0' && item.name && !seen.has(item.name)) {
      seen.add(item.name);
      options.push({ label: item.name, value: item.name });
    }
  }
  return options;
}

/** 字典树列表 → 两级分组映射（子节点按父节点 name 分组，供级联下拉；值同为中文） */
export function dictTreeToGroupMap(dictList: Recordable[]): Record<string, string[]> {
  const idToName = new Map(dictList.map((item) => [item.id as string, item.name as string]));
  const map: Record<string, string[]> = {};
  for (const item of dictList) {
    if (item?.pId == '0') continue;
    const parentName = idToName.get(item.pId);
    if (parentName && item.name) (map[parentName] ??= []).push(item.name);
  }
  return map;
}

/** 按需加载单层字典选项（组合式；字典为空/失败时保留 fallback 静态清单） */
export function useDictOptions(dictType: string, fallback: DictOption[] = []): Ref<DictOption[]> {
  const options = ref<DictOption[]>([...fallback]);
  const { initDict, getDictList } = useDict();
  initDict([dictType])
    .then(() => {
      const list = dictTreeToOptions(getDictList(dictType));
      if (list.length) options.value = list;
    })
    .catch(() => {
      // 加载失败保留兜底清单，不中断页面
    });
  return options;
}

/** 按需加载「值=编码」单层字典选项（组合式；value=dict_value 编码、label=dict_label）。
 *  适用业务表存英文码的字典（如项目归属 market/district/scattered）：字典的 dict_value
 *  存编码、dict_label 存中文，取值用编码——与 useDictOptions（值=中文标签）口径相反，勿混用 */
export function useDictCodeOptions(dictType: string, fallback: DictOption[] = []): Ref<DictOption[]> {
  const options = ref<DictOption[]>([...fallback]);
  const { initDict, getDictList } = useDict();
  initDict([dictType])
    .then(() => {
      const list = getDictList(dictType)
        .filter((item) => item?.pId == '0' && item.name && item.value)
        .map((item) => ({ label: String(item.name), value: String(item.value) }));
      if (list.length) options.value = list;
    })
    .catch(() => {
      // 加载失败保留兜底清单，不中断页面
    });
  return options;
}

/** 按需加载两级字典分组映射（组合式；字典为空/失败时保留 fallback） */
export function useDictGroupMap(
  dictType: string,
  fallback: Record<string, string[]> = {},
): Ref<Record<string, string[]>> {
  const groupMap = ref<Record<string, string[]>>({ ...fallback });
  const { initDict, getDictList } = useDict();
  initDict([dictType])
    .then(() => {
      const map = dictTreeToGroupMap(getDictList(dictType));
      if (Object.keys(map).length) groupMap.value = map;
    })
    .catch(() => {
      // 加载失败保留兜底映射，不中断页面
    });
  return groupMap;
}
