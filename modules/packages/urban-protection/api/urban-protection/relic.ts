/**
 * 市住更局 —— 名城保护 · 文物（不可移动文物）数据模型与加载器
 *
 * 说明：
 *  - 当前后端尚未介入，数据来自本目录 data/wenwu.json（281 条武汉市不可移动文物），
 *    经 `?url` 导入 + 运行时 fetch 加载（不打进 bundle，与 display 包 geojson 同一套路）；
 *  - 后端就绪后，把 loadRelics() 替换为 defHttp 列表接口即可，页面代码无需调整结构：
 *      const { adminPath } = useGlobSetting();
 *      return defHttp.get({ url: adminPath + '/urban-protection/relic/list', params });
 */
import wenwuUrl from './data/wenwu.json?url';

/** 文物级别定义（地图点色 / 列表标签色 / 筛选与表单选项共用） */
export type RelicLevel = {
  /** 数据中的完整级别名称（如「国家级文物保护单位」） */
  value: string;
  /** 短标签（如「国家级」） */
  label: string;
  /** 地图点位颜色 */
  color: string;
  /** 列表 Tag 颜色（antdv-next 预设色名） */
  tagColor: string;
};

export const RELIC_LEVELS: RelicLevel[] = [
  { value: '国家级文物保护单位', label: '国家级', color: '#FBBF24', tagColor: 'gold' },
  { value: '省级文物保护单位', label: '省级', color: '#22D3EE', tagColor: 'cyan' },
  { value: '市级文物保护单位', label: '市级', color: '#60A5FA', tagColor: 'blue' },
];

/** 级别 → 定义（列表 Tag / 地图点着色用；未知级别回退市级样式） */
export const relicLevelOf = (level?: string): RelicLevel =>
  RELIC_LEVELS.find((l) => l.value === level) ?? {
    value: level ?? '',
    label: level || '未定级',
    color: '#94A3B8',
    tagColor: 'default',
  };

/** 类别选项（空类别归入「未分类」展示） */
export const RELIC_CATEGORIES = [
  '近现代重要史迹及代表性建筑',
  '古遗址',
  '古建筑',
  '古墓葬',
  '石窟寺及石刻',
] as const;

/** 类别展示名（空值显示「未分类」） */
export const relicCategoryLabel = (category?: string): string => category?.trim() || '未分类';

/** 保存状况选项 */
export const RELIC_SITUATIONS = ['好', '较好', '一般', '较差', '差'] as const;

/** 行政区域选项（按数据出现顺序） */
export const RELIC_DISTRICTS = [
  '江岸区',
  '江汉区',
  '硚口区',
  '汉阳区',
  '武昌区',
  '青山区',
  '洪山区',
  '东西湖区',
  '汉南区',
  '蔡甸区',
  '江夏区',
  '黄陂区',
  '新洲区',
  '东湖新技术开发区',
  '东湖风景区',
] as const;

/** 文物实体（页面通用，已把 lonlat / info.avatars 归一化） */
export type Relic = {
  id: number; // 数据主键
  name: string; // 名称
  level: string; // 级别（国家级/省级/市级文物保护单位，可能为空）
  category: string; // 类别（可能为空）
  district: string; // 所属区域
  address: string; // 详细地址
  era: string; // 年代
  code: string; // 文物编号
  publicTime: number; // 公布年份（0 表示未知）
  situation: string; // 保存状况（可能为空）
  lng: number; // 经度（由 lonlat 解析）
  lat: number; // 纬度
  avatars: string[]; // 实景照片（info.avatars，可能为空数组）
  introduce: string; // 简介
  importance: number; // 重要性权重（0~57）
};

/** JSON 原始结构 */
type RelicRaw = {
  id: number;
  name?: string;
  level?: string;
  category?: string;
  district?: string;
  address?: string;
  era?: string;
  code?: string;
  public_time?: number;
  situation?: string;
  lonlat?: string;
  introduce?: string;
  importance?: number;
  info?: { avatars?: string[] } | null;
};

/**
 * 解析 WKT 点坐标字符串（如 `POINT(114.300870811839 30.5446220004052)`）。
 * 非法 / 缺失返回 null。
 */
export function parseLonlat(lonlat?: string | null): { lng: number; lat: number } | null {
  if (!lonlat) return null;
  const matched = /^POINT\(\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s*\)$/.exec(lonlat.trim());
  if (!matched) return null;
  const lng = Number(matched[1]);
  const lat = Number(matched[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

/** 原始 JSON 缓存（只缓存文本解析结果，实体每次深拷贝，避免页面间本地 CRUD 互相污染） */
let rawCache: RelicRaw[] | null = null;

/**
 * 加载文物清单（fetch + 解析 + 归一化）。
 * 每次调用返回全新数组 / 全新对象，调用方可放心本地增删改。
 */
export async function loadRelics(): Promise<Relic[]> {
  rawCache ??= ((await (await fetch(wenwuUrl)).json()) as { data: RelicRaw[] }).data ?? [];
  return rawCache.map((raw) => {
    const { lng, lat } = parseLonlat(raw.lonlat) ?? { lng: 0, lat: 0 };
    return {
      id: raw.id,
      name: raw.name ?? '',
      level: raw.level ?? '',
      category: raw.category ?? '',
      district: raw.district ?? '',
      address: raw.address ?? '',
      era: raw.era ?? '',
      code: raw.code ?? '',
      publicTime: raw.public_time ?? 0,
      situation: raw.situation ?? '',
      lng,
      lat,
      avatars: raw.info?.avatars ?? [],
      introduce: raw.introduce ?? '',
      importance: raw.importance ?? 0,
    };
  });
}
