/**
 * 选中面共用类型（polygon-card / map-layers / index 共用）。
 * 数据源：esp 模块图斑接口（GET /a/esp/map/areas、/a/esp/map/projects，表 ESP_MAP_AREA /
 * ESP_MAP_PROJECT），字段键即接口响应行的大写属性键；geometry（TopoJSON 原文）在挂图层前已还原剥离。
 */

/** 项目图斑与片区范围共有的属性字段（片区、项目均适用） */
export type PolygonPropsBase = {
  /** 批次：第一批 / 第二批 */
  BATCH?: string;
  /** 合并后片区唯一号（PQ001、PQ002……） */
  A_UID?: string;
  /** 原片区唯一号（各批次合并前，用于回溯） */
  OLD_A_UID?: string;
  /** 原片区编号 */
  OLD_A_NO?: string;
  /** 行政区 */
  DIST?: string;
  /** 片区名称 */
  AREA_NAME?: string;
  /** 功能定位-中文名（标准字典：交通导向/文旅导向/公服导向/生态导向/产业导向/康养导向/公园导向，多个逗号分隔；无法识别时存原文） */
  FUNC_TYPE_NAME?: string;
  /** 功能定位-编码（TOD/COD/SOD/EOD/IOD/HOD/POD，多个逗号分隔；无法识别时为 null） */
  FUNC_TYPE_VALUE?: string;
  /** 五改大类（第一批五改大类、第二批五改类别统一后字段） */
  WG_BIG?: string;
  /** 五改分类 / 四好目标（第一批五改分类、第二批四好目标统一后字段） */
  WG_SUB?: string;
  /** 投资估算（亿元，项目或片区） */
  INV_BIL?: number | string;
  /** 资金来源及落实情况 */
  FUND_SRC?: string;
  /** 开工时间原始值（清单中原始表达） */
  START_RAW?: string;
  /** 完工时间原始值（清单中原始表达） */
  END_RAW?: string;
  /** 标准化开工日期文本 */
  START_DATE?: string;
  /** 标准化完工日期文本 */
  END_DATE?: string;
  /** 时间核对状态（识别、缺失或异常） */
  DATE_STAT?: string;
  /** 图斑面积（公顷） */
  AREA_HA?: number | string;
  /** 数据来源（合并来源图层说明） */
  DATA_SRC?: string;
  /** 唯一号说明（本轮编号重建说明或异常提示） */
  UID_NOTE?: string;
};

/** 项目图斑属性（projects 接口行，source 以 P_UID 为要素 id） */
export type ProjectPolygonProps = PolygonPropsBase & {
  /** 合并后项目图斑唯一号（PQ001_1 格式） */
  P_UID?: string;
  /** 原项目图斑唯一号（各批次合并前，用于回溯） */
  OLD_P_UID?: string;
  /** 片区内项目顺序号 */
  P_SEQ?: number;
  /** 图斑原名称（原矢量图层中的项目/图斑名称） */
  GIS_NAME?: string;
  /** 图斑描述（原矢量 layer 字段等） */
  GIS_DESC?: string;
  /** Excel 项目 ID（项目清单唯一编号） */
  PJ_ID?: string;
  /** 项目名称（Excel 清单原始名称） */
  PJ_NAME?: string;
  /** 实施主体 */
  BODY?: string;
  /** 所属片区投资估算（亿元） */
  A_INV_BIL?: number | string;
  /** 责任主体（项目责任主体） */
  RESP?: string;
  /** 项目增减情况 */
  PJ_CHANGE?: string;
  /** 建设内容（第二批，第一批为空） */
  CONTENT?: string;
  /** 前期手续（第二批，第一批为空） */
  PRE_PROC?: string;
  /** 建设性质（第二批，第一批为空） */
  BLD_NATURE?: string;
  /** 项目进展（第二批，第一批为空） */
  PROG?: string;
  /** 2026 年计划投资（亿元，第二批） */
  INV_2026?: number | string;
  /** 2027 年计划投资（亿元，第二批） */
  INV_2027?: number | string;
  /** 匹配方式（名称匹配、ID 匹配等说明） */
  MAT_METHOD?: string;
};

/** 片区范围属性（areas 接口行，source 以 A_UID 为要素 id） */
export type AreaPolygonProps = PolygonPropsBase & {
  /** 片区顺序号 */
  A_SEQ?: number;
  /** 责任主体（片区责任主体） */
  RESP_BODY?: string;
  /** 片区内项目投资合计（亿元，图层统计字段） */
  PROJECT_INV_BIL?: number | string;
  /** 片区内项目数量（图层统计字段） */
  PROJECT_CNT?: number | string;
  /** 片区项目调整说明 */
  PROJECT_CHANGE?: string;
  /** 三色图颜色（2026 年第二季度推进情况：green/yellow/red；仅第一批片区有值，第二批为 null） */
  AREA_COLOR?: 'green' | 'yellow' | 'red' | null;
};

/** 当前选中的面（地图点击查询构造：kind 区分项目地块 / 片区范围，props 为 GeoJSON 原始属性；discriminated union） */
export type SelectedPolygon =
  { kind: 'project'; props: ProjectPolygonProps } | { kind: 'area'; props: AreaPolygonProps };
