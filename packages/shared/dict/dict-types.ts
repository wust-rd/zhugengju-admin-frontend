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
} as const;

export type DictTypeKey = keyof typeof DICT_TYPE;
