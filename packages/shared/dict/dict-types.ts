/**
 * 业务字典类型编码登记处（系统管理 → 字典管理维护，全局唯一键名）。
 *
 * 五个业务模块（modules/packages/*）共用的字典编码集中登记在此，避免各包重复定义漂移；
 * 仅登记编码字符串与含义注释，不放业务数据与业务逻辑（shared 去业务化约定）。
 * 新增共用字典：先在字典管理建类型，再在此追加一行。
 */
export const DICT_TYPE = {
  /** 五改类别（单层：既有建筑/老旧小区/老旧街区/老旧厂区/城中村改造） */
  fiveChangeType: 'five_change_type',
  /** 五改细分类别（两级树：根节点=五改类别，子节点=细分类别） */
  fiveChangeSubType: 'five_change_sub_type',
  /** 六带类型（单层：带建设/带保护/带开发/带整治/带管理/带改造） */
  sixBeltType: 'six_belt_type',
  /** 行政区（单层 16 区；tree_sort=业务定案录入顺序，下拉展示序以此为准） */
  district: 'district',
  /** 资金来源（单层，值为完整分类名，如「中央预算资金-中央预算内投资」；不做分组） */
  fundSource: 'fund_source',
  /** 项目归属（单层；dict_value=英文码 market/district/scattered=业务表存量口径，取值用编码非标签） */
  projectAffiliation: 'project_affiliation',
} as const;

export type DictTypeKey = keyof typeof DICT_TYPE;
