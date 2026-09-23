import { computed, defineComponent, inject, ref } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { GlowButton } from '@jeesite/display/components/glow-button';
import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';
import { AERIAL_IMAGES, FACTORY_AFTER, FACTORY_BEFORE, selectableThumbClass } from './shared';

/**
 * 「武汉智眼航拍全景」的资料选项（下拉）。仅「航拍照片」有素材，其余待接入。
 */
const AERIAL_TABS = ['全景影像', '航拍照片', '航拍视频'] as const;
type AerialTab = (typeof AERIAL_TABS)[number];

/**
 * 「成效指标对比」的 4 个评估主题（下拉）：对应设计稿表格的 4 个一级维度。
 * 每个主题一张雷达图 —— 雷达的「角」是该维度下的指标项，两条圈是「更新前 / 更新后」。
 */
const RADAR_TABS = ['片区项目进度', '片区更新后直接经济效益', '片区更新后间接经济效益', '片区更新后社会效益'] as const;
type RadarTab = (typeof RADAR_TABS)[number];

/** 一根轴 = 一个指标项 + 它的「更新前 / 更新后」（unit 只给图下的数据表用，雷达图不画单位） */
type RadarMetric = { label: string; before: number; after: number; unit: string };

/**
 * 「成效指标对比」的数据：取自表格的「指标项 / 单位 / 更新前 / 更新后」几列（共 27 条）
 *
 * 两点需要注意（都由代码自适应，不用手工调）：
 * - 各主题指标条数不同（6 / 6 / 9 / 6）→ 轴数、网格都是按当前主题的条数算的；
 * - 单位不统一（% / 亿元 / 家 / 个每平方公里 / 处 / 人 / 个）→ 雷达图每根轴各自归一化
 *   （取该指标更新前/更新后的较大值当满格，见 setup 里的 radarSeries），
 *   否则「居住人口增长数 3200→7800」这种会把图形顶出画布；原始单位只在图下数据表里展示。
 */
const RADAR_METRICS: Record<RadarTab, RadarMetric[]> = {
  片区项目进度: [
    { label: '项目完成率', unit: '%', before: 72.5, after: 91.3 },
    { label: '项目投资比例', unit: '%', before: 68.0, after: 87.6 },
    { label: '专项资金到位率', unit: '%', before: 75.2, after: 93.8 },
    { label: '政策承诺事项办结率', unit: '%', before: 70.1, after: 89.4 },
    { label: '行政审批通过率', unit: '%', before: 82.3, after: 95.7 },
    { label: '报批/备案事项完成率', unit: '%', before: 76.8, after: 90.2 },
  ],
  片区更新后直接经济效益: [
    { label: '固定资产投资', unit: '亿元', before: 45.6, after: 82.3 },
    { label: '招商引资到位比例', unit: '%', before: 63.4, after: 85.1 },
    { label: '房地产税收', unit: '亿元', before: 8.7, after: 15.2 },
    { label: '年度税收增量', unit: '亿元', before: 3.2, after: 7.8 },
    { label: '租金收入', unit: '亿元', before: 1.5, after: 3.6 },
    { label: '土地成交情况', unit: '亿元', before: 22.4, after: 48.9 },
  ],
  片区更新后间接经济效益: [
    { label: '企业注册量', unit: '家', before: 120.0, after: 285.0 },
    { label: '新业务占比', unit: '%', before: 28.5, after: 52.3 },
    { label: '单位企业增量用地产值增长率', unit: '%', before: 6.5, after: 14.2 },
    { label: '地价租金年增长率', unit: '%', before: 3.8, after: 9.6 },
    { label: '房价增长率', unit: '%', before: 2.9, after: 7.8 },
    { label: '商业客流增长率', unit: '%', before: 8.2, after: 18.5 },
    { label: '流动人口增长率', unit: '%', before: 4.5, after: 11.3 },
    { label: '客流消费转化率', unit: '%', before: 15.6, after: 28.4 },
    { label: '夜间经济活跃度', unit: '个/平方公里', before: 12.0, after: 27.0 },
  ],
  片区更新后社会效益: [
    { label: '公众满意度', unit: '%', before: 76.4, after: 92.1 },
    { label: '12345热线群众满意率同比增长', unit: '%', before: 5.2, after: 12.8 },
    { label: '青年人才占比', unit: '%', before: 18.5, after: 32.7 },
    { label: '历史文化建筑数', unit: '处', before: 8.0, after: 15.0 },
    { label: '居住人口增长数', unit: '人', before: 3200.0, after: 7800.0 },
    { label: '就业岗位增加数量', unit: '个', before: 1500.0, after: 4200.0 },
  ],
};

/** 综合评估结论（文字来自设计稿；设计稿右侧被裁断的一句按上下文补全，TODO 待甲方核实原文） */
const COMPREHENSIVE_TEXT = `(一)人居环境改善，供给“好房子”
住房品质提升：F 地块新建住宅8.85万平方米，老旧小区实施基础设施焕新，包括 排水、道路、楼本体、景观绿化、适老及停车设施改造，加装住宅电梯，改造仁寿路、 双厂巷道路。
公共服务完善：新增社区综合服务站、公共活动空间、养老托育设施、社区卫生服 务中心、社区食堂、智慧菜场、便民服务网点等，构建全龄友好型“好社区”。
绿色空间拓展：规划建设社区口袋公园、休闲广场，配置休憩座椅、健身设施及景 观照明，打造可参与的公共绿色空间。
(二)城市功能优化，打造“好社区”
基础设施升级：实施道路修整工程， 对市政给排水管网进行修缮改造；新增地 面及地下停车泊位，布局新能源充电设施， 缓解停车难题。
商业服务提质：引入品牌商业综合体， 丰富商品品类，完善生鲜日配供应链；招 引特色品牌，优化餐饮空间布局；在南洋 产业园引入公寓民宿等中长期住宿资源， 拓展居住业态。
文旅功能增强：通过D+M 工业设计小 镇、南洋1916等项目，打造文旅创意街区， 提升片区文化吸引力与产业活力。
(三)社会经济效益提升，建设“好城区”
经济效益：通过商业运营、住宅销售、文旅消费等多渠道实现资金平衡与持续收益， 带动区域资产增值。老旧小区改造预计20年总收益1629.46万元，老旧厂区改造预计10 年实现资金平衡，F 地块通过品质住宅销售与商业运营实现自平衡。
社会效益：提升居民满意度与获得感，完善社区服务体系，增强社区凝聚力与认同 感。
文化效益：保护工业遗存，传承城市文脉，推动工业记忆与现代功能融合，打造具   有辨识度的城市更新样板。四大举措协同推进，塑造“好房子、好小区、好社区、好街区” 四好发展样板。
`;

/* ---------- 雷达图几何（viewBox 360×340：四周留出轴标签的位置） ---------- */

const RADAR_VB_W = 360; // viewBox 宽
const RADAR_VB_H = 340; // viewBox 高
const RADAR_CX = 180; // 圆心 x
const RADAR_CY = 168; // 圆心 y
const RADAR_R = 92; // 半径
/**
 * 轴标签块中心距圆心 = 半径 × 该倍数（取在轴末端外侧一点）。
 * 1.34 是配合下面「每行 5 字 + 12px 字号」试出来的：9 根轴时相邻标签也不重叠，
 * 标签块内缘（1.34R − 半个标签宽≈30）刚好落在最外圈之外，且不超出 viewBox 被裁掉。
 */
const RADAR_LABEL_R = 1.34;
const RADAR_LABEL_SIZE = 12; // 轴标签字号（viewBox 单位，随图等比缩放）
const RADAR_LABEL_LINE_H = 13; // 轴标签行高（换行时用）
const RADAR_LABEL_MAX_CHARS = 5; // 轴标签每行最多字符数（中文按 1 个算，超出换行）

/** 第 i 根轴的角度（度）：90° 在正上方，顺时针依次排开 */
const radarAxisAngle = (index: number, count: number) => 90 - (index * 360) / count;

const radarRad = (angle: number) => (angle * Math.PI) / 180;

/** 半径比例（0~1）+ 角度 → 坐标（SVG 坐标系 y 向下，所以 sin 取负） */
const radarPoint = (ratio: number, angle: number, r = RADAR_R): [number, number] => {
  const rad = radarRad(angle);
  return [RADAR_CX + ratio * r * Math.cos(rad), RADAR_CY - ratio * r * Math.sin(rad)];
};

/** 一组半径比例（长度 = 轴数）→ polygon points 字符串 */
const radarPoints = (ratios: number[], count: number) =>
  ratios.map((v, i) => radarPoint(v, radarAxisAngle(i, count)).join(',')).join(' ');

/** 轴标签按字数硬换行（中文没有词边界，按固定字数切最稳） */
const radarLabelLines = (label: string) => {
  const lines: string[] = [];
  for (let i = 0; i < label.length; i += RADAR_LABEL_MAX_CHARS) {
    lines.push(label.slice(i, i + RADAR_LABEL_MAX_CHARS));
  }
  return lines;
};

/**
 * 轴标签块的位置：整块贴在轴的延长线上，上半区的向上排、下半区的向下排，
 * 这样标签不会盖住图形，也不会跑出 viewBox（标签用 SVG text/tspan 画，随图等比缩放）。
 */
const radarLabelLayout = (index: number, count: number, label: string) => {
  const lines = radarLabelLines(label);
  const rad = radarRad(radarAxisAngle(index, count));
  const x = RADAR_CX + RADAR_R * RADAR_LABEL_R * Math.cos(rad);
  const y = RADAR_CY - RADAR_R * RADAR_LABEL_R * Math.sin(rad);
  // 上半区：最后一行 baseline 落在 y 上，其余往上叠；下半区：第一行落在 y 下方一个字高
  const startY = y < RADAR_CY ? y - (lines.length - 1) * RADAR_LABEL_LINE_H : y + RADAR_LABEL_SIZE;
  return { x, lines, ys: lines.map((_, i) => startY + i * RADAR_LABEL_LINE_H) };
};

/**
 * 数值展示：保留 1 位小数 + 千分位（和设计稿表格一致：68.0 / 3,200.0）。
 * 单位不固定，跟着每条指标走（见 RADAR_METRICS 的 unit）。
 */
const fmtMetric = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 卡片标题行：圆点 + 标题（各块通用的小标题样式，与项目情况等 Tab 同款） */
const CardTitle = ({ title, hint }: { title: string; hint?: string }) => (
  <div class="flex h-24px items-center">
    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
      <div class="w-4px h-4px bg-white rd-full" />
    </div>
    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">{title}</div>
    {hint && <div class="ml-8px text-12px text-white/40">{hint}</div>}
  </div>
);

/** 卡片容器样式（与抽屉内其他卡片一致） */
const CARD_CLASS = 'mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6';

/**
 * 自绘下拉选择（大屏风格）：触发条 + 透明遮罩关闭 + 浮层选项列表。
 * 选项文字较长放不下一排按钮，块2 / 块3 共用。
 */
const DropdownSelect = defineComponent({
  name: 'PostEvaluationDropdownSelect',
  props: {
    value: { type: String, required: true },
    options: { type: Array as () => string[], required: true },
    width: { type: String, default: '100%' },
  },
  emits: { change: (_v: string) => true },
  setup(props, { emit }) {
    const open = ref(false);
    return () => (
      <div class="relative" style={{ width: props.width }}>
        {/* 透明遮罩：接住组件外部的点击并关闭浮层 */}
        {open.value && <div class="fixed inset-0 z-20" onClick={() => (open.value = false)} />}

        {/* 触发条 */}
        <div
          class="flex h-32px w-full cursor-pointer items-center justify-between rd-6px b-1 b-solid b-white/15 bg-white/6 px-10px text-13px text-white/85 transition-colors hover:b-white/30"
          onClick={() => (open.value = !open.value)}
        >
          <span>{props.value}</span>
          <span
            class={cn('i-ri:arrow-down-s-line text-14px text-white/60 transition-transform duration-200', {
              'rotate-180': open.value,
            })}
          />
        </div>

        {/* 选项浮层 */}
        {open.value && (
          <div class="absolute top-38px left-0 z-30 w-full overflow-hidden rd-6px b-1 b-solid b-white/15 bg-[#0A2A48]">
            {props.options.map((opt) => (
              <div
                key={opt}
                class={cn(
                  'cursor-pointer px-10px py-7px text-13px transition-colors',
                  opt === props.value ? 'bg-[#0E83BD]/50 text-white' : 'text-white/70 hover:bg-white/10',
                )}
                onClick={() => {
                  emit('change', opt);
                  open.value = false;
                }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
});

/** 更新后评估 */
export const PostEvaluation = defineComponent({
  setup() {
    // 共享状态（页面 provide）：写入 evalImgView 驱动页面左侧大图（单图 / 前后对比双图）
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();

    /** 块1 按钮选中态（同步写 evalImgView；默认前后对比） */
    const factoryMode = ref<'before' | 'after' | 'compare'>('compare');

    /** 块2 资料选项 + 航拍照片缩略图选中下标 */
    const aerialTab = ref<AerialTab>('航拍照片');
    const aerialImg = ref(0);

    /** 块3 评估主题 */
    const radarTab = ref<RadarTab>('片区项目进度');

    /** 块1：切换两厂改造项目的展示模式 */
    function selectFactory(mode: 'before' | 'after' | 'compare') {
      factoryMode.value = mode;
      view.evalImgView.value =
        mode === 'before'
          ? { mode: 'single', src: FACTORY_BEFORE }
          : mode === 'after'
            ? { mode: 'single', src: FACTORY_AFTER }
            : { mode: 'compare', before: FACTORY_BEFORE, after: FACTORY_AFTER };
    }

    /** 块2：点航拍缩略图 → 左侧大图联动 */
    function selectAerial(index: number) {
      aerialImg.value = index;
      view.evalImgView.value = { mode: 'single', src: AERIAL_IMAGES[index] };
    }

    /**
     * 块3 当前主题的雷达数据
     *
     * 每条指标的单位不同（% / 亿元 / 家 / 人 …），归一化到各自轴上：
     * 该轴满格 = max(更新前, 更新后)，于是「更新后」那条圈总有一根顶点贴到最外圈，
     * 更新前按同一比例落位 —— 两根圈的形状差异就是各指标的提升幅度（网格没有数值刻度，
     * 所以不存在「刻度被拉平」的误导，只是各轴量纲不同、横向不可比）。
     */
    const radarSeries = computed(() => {
      const metrics = RADAR_METRICS[radarTab.value];
      const maxes = metrics.map((m) => Math.max(m.before, m.after));
      const ratio = (v: number, i: number) => (maxes[i] > 0 ? v / maxes[i] : 0);
      return {
        metrics,
        count: metrics.length,
        before: metrics.map((m, i) => ratio(m.before, i)),
        after: metrics.map((m, i) => ratio(m.after, i)),
      };
    });

    /** 块1 的三个按钮配置 */
    const factoryButtons: { key: 'before' | 'after' | 'compare'; label: string }[] = [
      { key: 'before', label: '康成酒厂改造前' },
      { key: 'after', label: '康成酒厂改造后' },
      { key: 'compare', label: '改造前后对比' },
    ];

    return () => (
      <div class="p-16px">
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区更新后评估</div>

                {/* 箭头：打开朝下（SVG 原方向不旋转），关闭朝右（逆时针转 90°） */}
                <img
                  src={arrowImg}
                  alt=""
                  class={cn('w-20px h-20px ml-auto transition-transform duration-200', {
                    '-rotate-90': !isOpen,
                  })}
                />

                {/* 底部图片 */}
                <img src={bottomImg} alt="" class="w-full h-4px absolute bottom-0 left-0 object-fill" />
              </div>
            ),
            body: () => (
              <>
                {/* ===== 块1：皮子街两厂改造项目（三个按钮：前 / 后 / 前后对比，联动左侧大图） ===== */}
                <div class={CARD_CLASS}>
                  <CardTitle title="皮子街两厂改造项目" hint="点击切换左侧大图" />

                  <div class="mt-12px flex justify-center gap-8px">
                    {factoryButtons.map((btn) => (
                      <GlowButton
                        key={btn.key}
                        isActive
                        borderGlow={factoryMode.value === btn.key}
                        glowOpacity={factoryMode.value === btn.key ? 1.5 : 0.25}
                        width={112}
                        height={32}
                        radius={8}
                        class={cn('text-13px font-500', {
                          'text-white': factoryMode.value === btn.key,
                          'text-white/60': factoryMode.value !== btn.key,
                        })}
                        onClick={() => selectFactory(btn.key)}
                      >
                        {btn.label}
                      </GlowButton>
                    ))}
                  </div>
                </div>

                {/* ===== 块2：武汉智眼航拍全景（三个资料按钮横排；航拍照片有两张图） ===== */}
                <div class={CARD_CLASS}>
                  <CardTitle title="武汉智眼航拍全景" />

                  {/* 三个资料按钮平分整行宽度（原先固定 96px + 居中，两侧各空 20px 显得没占满）：
                      flex-1 让每个按钮按 1:1:1 吃掉可用宽度，且抽屉宽度/滚动条变化时自适应；
                      GlowButton 内联的 width 在主轴上会被 flex-basis:0 覆盖，这里的 112
                      只当 SVG 坐标系基准用（取与「皮子街两厂改造项目」同款的 112 走短版渐变，
                      实际渲染宽度与之只差几个百分比，拉伸误差可忽略） */}
                  <div class="mt-12px flex gap-12px">
                    {AERIAL_TABS.map((t) => (
                      <GlowButton
                        key={t}
                        isActive
                        borderGlow={aerialTab.value === t}
                        glowOpacity={aerialTab.value === t ? 1.5 : 0.25}
                        width={112}
                        height={32}
                        radius={8}
                        class={cn('flex-1 text-13px font-500', {
                          'text-white': aerialTab.value === t,
                          'text-white/60': aerialTab.value !== t,
                        })}
                        onClick={() => (aerialTab.value = t)}
                      >
                        {t}
                      </GlowButton>
                    ))}
                  </div>

                  {aerialTab.value === '航拍照片' ? (
                    <>
                      <div class="mt-12px flex gap-6px">
                        {AERIAL_IMAGES.map((src, index) => (
                          <img
                            key={src}
                            src={src}
                            alt={`航拍照片 ${index + 1}`}
                            class={selectableThumbClass(aerialImg.value === index)}
                            onClick={() => selectAerial(index)}
                          />
                        ))}
                      </div>
                      <div class="mt-6px text-12px text-white/40">点击缩略图，左侧大图同步显示</div>
                    </>
                  ) : (
                    <div class="mt-12px flex h-80px items-center justify-center rd-8px b-1 b-dashed b-white/15 text-13px text-white/35">
                      「{aerialTab.value}」资料建设中
                    </div>
                  )}
                </div>

                {/* ===== 块3：成效指标对比（下拉选主题：雷达图「更新前 / 更新后」+ 图下数据表） ===== */}
                <div class={CARD_CLASS}>
                  <CardTitle title="成效指标对比" />

                  <div class="mt-12px flex justify-start">
                    <DropdownSelect
                      value={radarTab.value}
                      options={[...RADAR_TABS]}
                      width="180px"
                      onChange={(v: string) => (radarTab.value = v as RadarTab)}
                    />
                  </div>

                  {/* 雷达图：轴 = 该主题的指标项，两条圈 = 更新前 / 更新后 */}
                  <div class="mt-4px">
                    <svg
                      viewBox={`0 0 ${RADAR_VB_W} ${RADAR_VB_H}`}
                      width={RADAR_VB_W}
                      height={RADAR_VB_H}
                      class="block h-auto w-full"
                    >
                      {/* 网格（20/40/60/80/100 层；每层的边数 = 当前主题的指标条数） */}
                      {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
                        <polygon
                          key={level}
                          points={radarPoints(
                            Array.from({ length: radarSeries.value.count }, () => level),
                            radarSeries.value.count,
                          )}
                          fill="none"
                          stroke="rgba(140, 200, 240, 0.18)"
                          stroke-width="1"
                        />
                      ))}

                      {/* 轴线（圆心 → 每根轴末端） */}
                      {radarSeries.value.metrics.map((m, i) => {
                        const [x, y] = radarPoint(1, radarAxisAngle(i, radarSeries.value.count));
                        return (
                          <line
                            key={m.label}
                            x1={RADAR_CX}
                            y1={RADAR_CY}
                            x2={x}
                            y2={y}
                            stroke="rgba(140, 200, 240, 0.18)"
                            stroke-width="1"
                          />
                        );
                      })}

                      {/* 更新前（蓝色） */}
                      <polygon
                        points={radarPoints(radarSeries.value.before, radarSeries.value.count)}
                        fill="rgba(78, 146, 237, 0.22)"
                        stroke="#4E92ED"
                        stroke-width="1.5"
                      />
                      {/* 更新后（青色） */}
                      <polygon
                        points={radarPoints(radarSeries.value.after, radarSeries.value.count)}
                        fill="rgba(46, 217, 196, 0.28)"
                        stroke="#2ED9C4"
                        stroke-width="1.5"
                      />

                      {/* 顶点圆点：更新后 */}
                      {radarSeries.value.after.map((v, i) => {
                        const [x, y] = radarPoint(v, radarAxisAngle(i, radarSeries.value.count));
                        return (
                          <circle
                            key={`after-${i}`}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#7BF2DC"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(46, 217, 196, 0.8))' }}
                          />
                        );
                      })}

                      {/* 顶点圆点：更新前 */}
                      {radarSeries.value.before.map((v, i) => {
                        const [x, y] = radarPoint(v, radarAxisAngle(i, radarSeries.value.count));
                        return (
                          <circle
                            key={`before-${i}`}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill="#5FA5F5"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(78, 146, 237, 0.8))' }}
                          />
                        );
                      })}

                      {/* 轴标签：指标项（画在 SVG 内，按字数换行 + 分上下侧，轴多了也不会重叠/被裁） */}
                      {radarSeries.value.metrics.map((m, i) => {
                        const { x, lines, ys } = radarLabelLayout(i, radarSeries.value.count, m.label);
                        return (
                          <text
                            key={m.label}
                            x={x}
                            y={ys[0]}
                            text-anchor="middle"
                            font-size={RADAR_LABEL_SIZE}
                            fill="rgba(255, 255, 255, 0.85)"
                          >
                            {lines.map((line, li) => (
                              <tspan key={li} x={x} y={ys[li]}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        );
                      })}
                    </svg>

                    {/* 图例（放在图下方：图要占满卡片宽度，四周留给轴标签） */}
                    <div class="mt-6px flex items-center justify-center gap-24px">
                      <div class="flex items-center gap-8px text-14px text-white/85">
                        <span class="size-10px bg-[#4E92ED]" />
                        更新前
                      </div>
                      <div class="flex items-center gap-8px text-14px text-white/85">
                        <span class="size-10px bg-[#2ED9C4]" />
                        更新后
                      </div>
                    </div>

                    {/* 图对应的数据表（当前主题）：指标项 / 单位 / 更新前 / 更新后
                        数值配色沿用图例（更新前蓝、更新后青）；单位随行，因为各指标单位不同 */}
                    <div class="mt-12px overflow-hidden rd-6px b-1 b-solid b-white/10">
                      <div class="flex items-center bg-white/6 px-10px py-6px text-12px text-white/60">
                        <div class="min-w-0 flex-1">指标项</div>
                        <div class="w-64px shrink-0 text-center">单位</div>
                        <div class="w-56px shrink-0 text-right">更新前</div>
                        <div class="w-56px shrink-0 text-right">更新后</div>
                      </div>

                      {radarSeries.value.metrics.map((m, i) => (
                        <div
                          key={m.label}
                          class={cn('flex items-center px-10px py-5px text-12px leading-18px', {
                            'bg-white/2': i % 2 === 1, // 隔行底色，长表格好读
                          })}
                        >
                          <div class="min-w-0 flex-1 text-white/85">{m.label}</div>
                          <div class="w-64px shrink-0 whitespace-nowrap text-center text-white/60">{m.unit}</div>
                          <div class="w-56px shrink-0 text-right text-[#5FA5F5]">{fmtMetric(m.before)}</div>
                          <div class="w-56px shrink-0 text-right text-[#7BF2DC]">{fmtMetric(m.after)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ===== 块4：综合评估（标题 + 结论文字） ===== */}
                <div class={CARD_CLASS}>
                  <CardTitle title="综合评估" />
                  <div class="mt-4px text-14px font-400 lh-24px text-white whitespace-pre-line">
                    {COMPREHENSIVE_TEXT}
                  </div>
                </div>
              </>
            ),
          }}
        />
      </div>
    );
  },
});
