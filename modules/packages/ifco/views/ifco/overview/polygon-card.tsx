import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { cn } from '@jeesite/core/libs';
import { computed, defineComponent, ref, watch, type PropType } from 'vue';
import type { MenuItemType } from 'antdv-next';
import type { AreaPolygonProps, ProjectPolygonProps, SelectedPolygon } from './polygon-types';
import { ifcoAreas, ifcoProjects } from './polygon-store';
import { IFCO_LAYER_COLORS } from './map-layers';

/** 类别标签配色（与地图图层色系一致：项目地块紫、片区范围浅黄兜底） */
const KIND_META: Record<SelectedPolygon['kind'], { label: string; color: string }> = {
  project: { label: '项目地块', color: '#A855F7' },
  area: { label: '片区范围', color: IFCO_LAYER_COLORS.areaFill },
};

/** 片区标签色随批次（与 area-fills 图层配色同源）：第一批浅紫 / 第二批浅蓝 / 未知批次浅黄兜底 */
const areaKindColor = (p: AreaPolygonProps): string =>
  p.BATCH === '第一批'
    ? IFCO_LAYER_COLORS.areaBatch1
    : p.BATCH === '第二批'
      ? IFCO_LAYER_COLORS.areaBatch2
      : KIND_META.area.color;

/** 文本取值：null/空白返回 ''（空字段不展示） */
const s = (v: unknown): string => (v == null ? '' : String(v).trim());

/** 金额：数字或数字字符串统一格式化，非正数视为无值（单位已在标签中） */
const bil = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
};

/** 面积：数字格式化两位小数（单位已在标签中） */
const ha = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
};

/** 个数：数字字符串（如 '4.0'）取整展示 */
const cnt = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)} 个` : '';
};

/** 下拉显示名超长截断（触发器单行不换行，全名见卡片头部标题） */
const clip = (text: string, max = 16): string => (text.length > max ? `${text.slice(0, max)}…` : text);

/** 片区属性网格项（空值字段跳过） */
const areaMetaItems = (p: AreaPolygonProps): [string, string][] =>
  (
    [
      ['功能定位', s(p.FUNC_TYPE)],
      ['项目数量', cnt(p.PROJECT_CNT)],
      ['投资估算（亿元）', bil(p.INV_BIL)],
      ['图斑面积（公顷）', ha(p.AREA_HA)],
      ['责任主体', s(p.RESP_BODY)],
      ['资金来源', s(p.FUND_SRC)],
      ['行政区', s(p.DIST) || '—'],
      ['批次', s(p.BATCH) || '—'],
    ] as [string, string][]
  ).filter(([, v]) => v !== '');

/** 项目属性网格项（空值字段跳过） */
const projectMetaItems = (p: ProjectPolygonProps): [string, string][] =>
  (
    [
      ['项目编号', s(p.PJ_ID)],
      ['片区名称', s(p.AREA_NAME)],
      ['项目名称', s(p.PJ_NAME)],
      ['功能定位', s(p.FUNC_TYPE)],
      ['投资估算（亿元）', bil(p.INV_BIL)],
      ['2026年计划投资（亿元）', bil(p.INV_2026)],
      ['2027年计划投资（亿元）', bil(p.INV_2027)],
      ['图斑面积（公顷）', ha(p.AREA_HA)],
      ['项目进展', s(p.PROG)],
      ['实施主体', s(p.BODY)],
      ['责任主体', s(p.RESP)],
      ['资金来源', s(p.FUND_SRC)],
      ['行政区', s(p.DIST) || '—'],
      ['批次', s(p.BATCH) || '—'],
    ] as [string, string][]
  ).filter(([, v]) => v !== '');

/** 属性网格（两列；起止时间任一存在时跨两列展示） */
const MetaGrid = (props: { items: [string, string][]; start: string; end: string }) => {
  const showRange = props.start !== '' || props.end !== '';
  return (
    <div class="grid grid-cols-2 gap-x-16px gap-y-10px px-20px py-14px">
      {props.items.map(([label, value]) => (
        <div key={label} class="min-w-0">
          <div class="text-14px text-white/45">{label}</div>
          <div class="mt-2px truncate text-14px text-white/90" title={value}>
            {value}
          </div>
        </div>
      ))}

      {showRange && (
        <div class="col-span-2 min-w-0">
          <div class="text-14px text-white/45">起止时间</div>
          <div class="mt-2px text-14px text-white/90">
            {props.start || '—'} ~ {props.end || '—'}
          </div>
        </div>
      )}
    </div>
  );
};

/** 页签定义：片区 / 项目 */
const TABS = [
  { key: 'area', label: '片区' },
  { key: 'project', label: '项目' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * PolygonCard —— 面（片区范围 / 项目地块）详情卡片（项目投融建运大屏右侧）
 *
 * 点击地图面要素后从右侧滑入，内部为「片区 / 项目」两个页签：
 * - 点到片区 → 停在「片区」页签，展示片区信息，地图高亮片区面；
 * - 点到项目 → 停在「项目」页签，页签内下拉可切换同片区其他项目，
 *   切换时 emit update:polygon 回写父级选中面，地图高亮随之迁移；
 * - 手动切到「片区」页签 → 高亮同步切到该片区面（切回「项目」恢复上次项目）。
 * polygon 为 null 时整体隐藏（透明 + 禁用鼠标穿透）。
 * 数据来自 project_merged_all / area_merged_all geojson 的原始属性字段。
 */
export const PolygonCard = defineComponent({
  name: 'IfcoPolygonCard',

  props: {
    polygon: { type: Object as PropType<SelectedPolygon | null>, default: null },
  },

  emits: {
    close: () => true,
    'update:polygon': (_polygon: SelectedPolygon | null) => true,
  },

  setup(props, { emit }) {
    /** 当前页签（跟随点击对象类型，也允许手动切换） */
    const activeTab = ref<TabKey>('area');

    /** 「项目」页签下拉选中项（P_UID；点项目时回填，下拉/页签切换时更新） */
    const selectedProjectUid = ref('');

    /** 地图点击 → 同步页签与下拉（父级回灌时各值幂等，不会形成循环） */
    watch(
      () => props.polygon,
      (polygon) => {
        if (!polygon) return;
        if (polygon.kind === 'area') {
          activeTab.value = 'area';
        } else {
          activeTab.value = 'project';
          selectedProjectUid.value = s(polygon.props.P_UID);
        }
      },
      { immediate: true },
    );

    /** 当前选中面（项目/片区）所属片区 A_UID——两类 props 均携带 */
    const areaUid = computed(() => s(props.polygon?.props.A_UID));

    /** 片区内项目下拉选项（按 P_SEQ 排序已在 map-layers 填充时完成） */
    const projectItems = computed<MenuItemType[]>(() =>
      ifcoProjects.value
        .filter((it) => it.aUid === areaUid.value)
        .map((it) => ({ key: it.uid, label: clip(it.label) })),
    );

    /** 「项目」页签当前展示的项目（下拉选中项；null = 尚未选择） */
    const currentProject = computed(() => {
      const uid = selectedProjectUid.value;
      return uid ? (ifcoProjects.value.find((it) => it.uid === uid) ?? null) : null;
    });

    /** 手动切页签：同步地图高亮面（父级回写 selectedPolygon → feature-state 迁移） */
    const selectTab = (tab: TabKey) => {
      if (activeTab.value === tab) return;
      activeTab.value = tab;

      if (tab === 'area' && props.polygon) {
        // 切「片区」：优先取片区索引；缺失时用共有字段兜底构造
        const found = ifcoAreas.value.find((it) => it.uid === areaUid.value);
        const base = props.polygon.props;
        emit('update:polygon', {
          kind: 'area',
          props: found?.props ?? {
            A_UID: base.A_UID,
            AREA_NAME: base.AREA_NAME,
            FUNC_TYPE: base.FUNC_TYPE,
            DIST: base.DIST,
            BATCH: base.BATCH,
          },
        });
        return;
      }

      if (tab === 'project' && selectedProjectUid.value) {
        // 切回「项目」：恢复上次选中项目的高亮
        const found = ifcoProjects.value.find((it) => it.uid === selectedProjectUid.value);
        if (found) emit('update:polygon', { kind: 'project', props: found.props });
      }
    };

    /** 下拉切换项目：回写选中面，地图高亮跳到新项目 */
    const onSelectProject = (key: string | number | null) => {
      selectedProjectUid.value = key == null ? '' : String(key);
      const found = ifcoProjects.value.find((it) => it.uid === selectedProjectUid.value);
      if (found) emit('update:polygon', { kind: 'project', props: found.props });
    };

    return () => {
      const polygon = props.polygon;
      /** 类别标签（片区色随批次，与图层配色同源） */
      const kind = polygon
        ? {
            label: KIND_META[polygon.kind].label,
            color: polygon.kind === 'area' ? areaKindColor(polygon.props) : KIND_META.project.color,
          }
        : null;

      /** 片区页签展示数据（切到该页签时 polygon 已回写为片区） */
      const areaProps = polygon?.kind === 'area' ? polygon.props : null;
      /** 项目页签展示数据（下拉选中项；未选时展示空态） */
      const project = currentProject.value;

      /** 头部标题与类别标签跟随当前高亮面（polygon），页签仅切换视图 */
      const heading =
        polygon?.kind === 'project'
          ? s(polygon.props.GIS_NAME) || s(polygon.props.PJ_NAME) || '未命名项目'
          : polygon
            ? s(polygon.props.AREA_NAME) || '未命名片区'
            : '';

      return (
        <div
          class={cn(
            'absolute right-24px top-24px z-50 w-420px max-h-[calc(100%-48px)] flex flex-col rd-12px overflow-hidden',
            'border border-cyan-900 bg-[#0f2b47]/95 shadow-2xl backdrop-blur',
            'transition-[transform,opacity] duration-200',
            polygon ? 'opacity-100' : 'pointer-events-none translate-x-16px opacity-0',
          )}
        >
          {polygon && kind && (
            <>
              {/* 头部：名称 + 类别标签 + 关闭按钮（跟随当前高亮面） */}
              <div class="flex items-start gap-8px bg-gradient-to-r px-20px pt-16px pb-12px">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-18px font-600 text-white" title={heading}>
                    {heading}
                  </div>
                </div>

                <GlassRing
                  class="h-28px w-28px flex shrink-0 cursor-pointer items-center justify-center"
                  onClick={() => emit('close')}
                >
                  <div class="i-ri-close-line size-16px text-white" />
                </GlassRing>
              </div>

              {/* 页签条：片区 / 项目（下划线式，激活琥珀金） */}
              <div class="flex border-b border-white/10 px-12px">
                {TABS.map((tab) => (
                  <div
                    key={tab.key}
                    class={cn(
                      '-mb-px cursor-pointer border-b-2px px-16px py-10px text-14px transition-colors duration-150',
                      activeTab.value === tab.key
                        ? 'border-[#F59E0B] font-500 text-white'
                        : 'border-transparent text-white/55 hover:text-white',
                    )}
                    onClick={() => selectTab(tab.key)}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>

              {/* 内容区：高度受限时纵向滚动 */}
              <div class="min-h-0 flex-1 overflow-y-auto">
                {activeTab.value === 'area' ? (
                  areaProps && (
                    <MetaGrid
                      items={areaMetaItems(areaProps)}
                      start={s(areaProps.START_DATE)}
                      end={s(areaProps.END_DATE)}
                    />
                  )
                ) : (
                  <>
                    {/* 片区内项目切换下拉（选项 = 当前片区全部项目） */}
                    <div class="px-20px pt-14px">
                      <DropdownSelector
                        activeKey={selectedProjectUid.value || null}
                        items={projectItems.value}
                        onUpdate:activeKey={onSelectProject}
                        placeholder="请选择项目"
                        ghost
                        class="w-full"
                      />
                    </div>

                    {project ? (
                      <MetaGrid
                        items={projectMetaItems(project.props)}
                        start={s(project.props.START_DATE)}
                        end={s(project.props.END_DATE)}
                      />
                    ) : (
                      <div class="flex items-center justify-center py-40px text-14px text-white/40">
                        请在上方选择项目查看信息
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      );
    };
  },
});
