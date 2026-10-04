import { cn } from '@jeesite/core/libs';
import { defineComponent, type PropType } from 'vue';
import type { SpaceFeatureClick } from './map-layers';

/** objectType → 中文名（基础图层对象类型） */
const OBJECT_TYPE_LABEL: Record<string, string> = {
  district: '行政区',
  street: '街道',
  community: '社区',
  building: '建筑楼栋',
  village: '小区 / 村',
};

/** attributes 键 → 中文标签（建筑楼栋属性 / 房屋清册编号等；未知键原样展示） */
const ATTR_LABEL: Record<string, string> = {
  ldh: '楼栋号',
  cs: '层数',
  dysl: '单元数',
  jzsj: '建成年份',
  czrk: '常住人口',
  gt60_czrk: '60岁以上人口',
  FWZBM: '房屋编号',
  GUID: 'GUID',
};

/** 展示行：标签 + 值（null/空跳过） */
type InfoRow = { label: string; value: string };

/** properties（含 attributes）→ 展示行列表 */
export function featureInfoRows(properties: Record<string, unknown>): InfoRow[] {
  const rows: InfoRow[] = [];
  const push = (label: string, value: unknown) => {
    if (value == null || value === '') return;
    rows.push({ label, value: String(value) });
  };
  // MapLibre queryRenderedFeatures 会把嵌套对象平铺成 JSON 字符串，这里统一还原
  let attrs = properties.attributes as Record<string, unknown> | undefined;
  if (typeof attrs === 'string') {
    try {
      attrs = JSON.parse(attrs) as Record<string, unknown>;
    } catch {
      attrs = undefined;
    }
  }

  if (properties.objectType !== undefined) {
    // 基础图层图斑：类型 + 名称 + 对象属性（楼栋/小区档案）
    push('对象类型', OBJECT_TYPE_LABEL[String(properties.objectType)] ?? properties.objectType);
    push('名称', properties.objectName);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (k.startsWith('高德坐标') || k === 'name' || k === '小区名称') continue;
      push(ATTR_LABEL[k] ?? k, v);
    }
    return rows;
  }
  // 指标叠加图斑：数据类型 + 名称/编号 + 地址 + 坐标 + 属性
  push('数据类型', properties.dataType);
  push('名称 / 编号', properties.dataName);
  push('地址', properties.address);
  if (properties.lon != null && properties.lat != null) {
    push('坐标', `${Number(properties.lon).toFixed(6)}, ${Number(properties.lat).toFixed(6)}`);
  }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k.startsWith('高德坐标')) continue;
    push(ATTR_LABEL[k] ?? k, v);
  }
  return rows;
}

/**
 * FeatureInfoModal —— 图斑信息卡片（点击地图图斑后展示）
 *
 * 右上角常驻卡片（无遮罩、不挡地图交互）：点击图斑更新内容，右上角 × 关闭。
 * props：
 * - info: 点击载荷（source + properties）；null = 关闭
 * - onClose: 关闭回调
 */
export const FeatureInfoModal = defineComponent({
  name: 'FeatureInfoModal',
  props: {
    info: { type: Object as PropType<SpaceFeatureClick | null>, default: null },
    onClose: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return () => {
      if (!props.info) return null;
      const rows = featureInfoRows(props.info.properties);
      const title = props.info.source === 'base' ? '图斑信息' : '问题图斑信息';
      return (
        <div class="fixed top-96px right-24px z-1000 w-400px max-h-70vh of-y-auto b b-cyan-800 rd-10px bg-[#0e2237] shadow-2xl">
          {/* 标题栏 */}
          <div class="flex items-center justify-between px-20px py-14px b-b b-cyan-900 sticky top-0 bg-[#0e2237]">
            <div class="flex items-center gap-8px">
              <div class="w-3px h-16px rd-full bg-cyan-400" />
              <span class="text-16px text-white font-500">{title}</span>
            </div>
            <div
              class="i-ri-close-line size-20px text-gray-400 cursor-pointer hover:text-white"
              onClick={() => props.onClose()}
            />
          </div>

          {/* 属性行 */}
          <div class="px-20px py-14px space-y-10px">
            {rows.length === 0 ? (
              <div class="py-16px text-center text-14px text-gray-500">该图斑暂无属性信息</div>
            ) : (
              rows.map((row, i) => (
                <div key={`${row.label}-${i}`} class="flex items-start gap-12px text-14px">
                  <span class="w-110px shrink-0 text-gray-400">{row.label}</span>
                  <span class={cn('flex-1 break-all', props.info?.source === 'base' ? 'text-gray-200' : 'text-amber-200')}>
                    {row.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    };
  },
});
