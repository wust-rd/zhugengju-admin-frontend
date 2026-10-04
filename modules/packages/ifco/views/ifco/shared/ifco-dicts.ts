/**
 * ifco 模块业务字典选项中心（六类下拉统一从字典管理加载，静态清单兜底）。
 *
 * 各页面下拉/筛选项一律从这里取 composable，不再直接引用 api 层的静态常量——
 * 字典管理改数据（含调序 tree_sort）后刷新页面即生效；字典未配置/加载失败时
 * 静态兜底保证页面可用。口径说明见 @jeesite/shared/dict（值=中文标签），
 * 唯项目归属例外：业务表存英文码（market/district/scattered），走 useDictCodeOptions。
 */
import { ref, watch } from 'vue';
import { DICT_TYPE, useDictCodeOptions, useDictGroupMap, useDictOptions } from '@jeesite/shared/dict';
import {
  DISTRICTS,
  FIVE_REFORM_SUB_TYPE_MAP,
  FIVE_REFORM_TYPE_OPTIONS,
  FUND_SOURCE_OPTIONS,
  PROJECT_AFFILIATION_OPTIONS,
  SIX_BRING_TYPE_OPTIONS,
} from '@jeesite/ifco/api/ifco/project-library';

/** 行政区选项（district；顺序=字典 tree_sort=业务定案录入序） */
export function useDistrictOptions() {
  return useDictOptions(DICT_TYPE.district, DISTRICTS.map((name) => ({ label: name, value: name })));
}

/** 行政区名称清单（同步初值=静态兜底，字典加载后替换；供区级匹配等需同步读名称的场景） */
export function useDistrictNames() {
  const names = ref<string[]>([...DISTRICTS]);
  const options = useDistrictOptions();
  watch(options, (list) => {
    if (list.length) names.value = list.map((option) => option.value);
  });
  return names;
}

/** 五改类别选项（five_change_type） */
export function useFiveReformTypeOptions() {
  return useDictOptions(DICT_TYPE.fiveChangeType, [...FIVE_REFORM_TYPE_OPTIONS]);
}

/** 五改细分类别级联映射（five_change_sub_type 两级树；key=五改类别 → 细分列表） */
export function useFiveReformSubTypeMap() {
  return useDictGroupMap(DICT_TYPE.fiveChangeSubType, { ...FIVE_REFORM_SUB_TYPE_MAP });
}

/** 六带类型选项（six_belt_type） */
export function useSixBeltTypeOptions() {
  return useDictOptions(DICT_TYPE.sixBeltType, SIX_BRING_TYPE_OPTIONS.map((name) => ({ label: name, value: name })));
}

/** 资金来源选项（fund_source；平铺不分组，值为完整分类名） */
export function useFundSourceOptions() {
  return useDictOptions(DICT_TYPE.fundSource, FUND_SOURCE_OPTIONS.map((option) => ({ ...option })));
}

/** 项目归属选项（project_affiliation；值=英文码 market/district/scattered=存量库口径） */
export function useProjectAffiliationOptions() {
  return useDictCodeOptions(DICT_TYPE.projectAffiliation, [...PROJECT_AFFILIATION_OPTIONS]);
}
