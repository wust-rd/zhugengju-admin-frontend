import { defineComponent, ref, type CSSProperties } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';
import albumPic1 from '@jeesite/assets/images/display/plan/picture-box.webp';
import albumPic2 from '@jeesite/assets/images/display/plan/test.webp';
import albumPic3 from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';

import { CollapsibleSection } from '../collapsible-section';
import { ViewDetailButton } from './view-detail-button';
import { PostEvaluationModal } from './post-evaluation-modal';

/** 图册占位图（TODO: 替换为真实图册图片） */
const ALBUM_PLACEHOLDERS = [albumPic1, albumPic2, albumPic3, albumPic1];

/** 六维指标（角度：0° 右，逆时针为正，SVG 坐标系 y 向下已取反） */
const RADAR_AXES = [
  { label: '生态宜居', angle: 120 },
  { label: '绿色低碳', angle: 60 },
  { label: '智能便利', angle: 0 },
  { label: '健康舒适', angle: 300 },
  { label: '安全耐久', angle: 240 },
  { label: '智能便捷', angle: 180 },
];

/** 改造前 / 改造后 六维数值（0~100） */
const RADAR_BEFORE = [45, 40, 50, 35, 45, 42];
const RADAR_AFTER = [75, 72, 85, 65, 80, 78];

/** 雷达图几何参数（viewBox 300×300） */
const RADAR_R = 100;
const RADAR_C = 150;

const radarRad = (angle: number) => (angle * Math.PI) / 180;

/** 数值 + 角度 → 坐标 */
const radarPoint = (value: number, angle: number, r = RADAR_R): [number, number] => {
  const rad = radarRad(angle);
  return [RADAR_C + (value / 100) * r * Math.cos(rad), RADAR_C - (value / 100) * r * Math.sin(rad)];
};

/** 一组数值 → polygon points 字符串 */
const radarPoints = (values: number[]) => values.map((v, i) => radarPoint(v, RADAR_AXES[i].angle).join(',')).join(' ');

/** 标签在容器内的百分比位置（轴末端外侧） */
const radarLabelPos = (angle: number): CSSProperties => {
  const rad = radarRad(angle);
  const x = RADAR_C + RADAR_R * 1.28 * Math.cos(rad);
  const y = RADAR_C - RADAR_R * 1.28 * Math.sin(rad);
  return { left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%` };
};

/** 实施后评估 */
export const PostEvaluation = defineComponent({
  setup() {
    /** 图册预览弹窗可见性 / 初始图片下标 */
    const previewVisible = ref(false);
    const previewIndex = ref(0);

    return () => (
      <>
        <div class="p-16px">
          {/* 可折叠区块 */}
          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px w-full items-center relative pb-4px">
                  <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                  <div class="text-18px font-400 text-white ml-8px font-youshe">片区实施后评估</div>

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
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  {/* 标题行 */}
                  <div class="flex h-24px items-center">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>
                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区实施后评估</div>

                    {/* 查看详情按钮 */}
                    <ViewDetailButton
                      class="ml-auto h-30px w-72px"
                      label="查看详情"
                      onClick={() => {
                        previewIndex.value = 0;
                        previewVisible.value = true;
                      }}
                    />
                  </div>

                  {/* 雷达图 + 图例 */}
                  <div class="mt-4px flex items-center justify-center gap-16px">
                    {/* 雷达图 */}
                    <div class="relative size-260px">
                      <svg viewBox="0 0 300 300" class="size-full">
                        {/* 网格（20/40/60/80/100 层） */}
                        {[20, 40, 60, 80, 100].map((level) => (
                          <polygon
                            key={level}
                            points={radarPoints([level, level, level, level, level, level])}
                            fill="none"
                            stroke="rgba(140, 200, 240, 0.18)"
                            stroke-width="1"
                          />
                        ))}

                        {/* 轴线 */}
                        {RADAR_AXES.map((a) => {
                          const [x, y] = radarPoint(100, a.angle);
                          return (
                            <line
                              key={a.label}
                              x1={RADAR_C}
                              y1={RADAR_C}
                              x2={x}
                              y2={y}
                              stroke="rgba(140, 200, 240, 0.18)"
                              stroke-width="1"
                            />
                          );
                        })}

                        {/* 改造前（蓝色） */}
                        <polygon
                          points={radarPoints(RADAR_BEFORE)}
                          fill="rgba(78, 146, 237, 0.22)"
                          stroke="#4E92ED"
                          stroke-width="1.5"
                        />
                        {/* 改造后（青色） */}
                        <polygon
                          points={radarPoints(RADAR_AFTER)}
                          fill="rgba(46, 217, 196, 0.28)"
                          stroke="#2ED9C4"
                          stroke-width="1.5"
                        />

                        {/* 顶点圆点：改造后 */}
                        {RADAR_AFTER.map((v, i) => {
                          const [x, y] = radarPoint(v, RADAR_AXES[i].angle);
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

                        {/* 顶点圆点：改造前 */}
                        {RADAR_BEFORE.map((v, i) => {
                          const [x, y] = radarPoint(v, RADAR_AXES[i].angle);
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
                      </svg>

                      {/* 六维标签 */}
                      {RADAR_AXES.map((a) => (
                        <div
                          key={a.label}
                          class="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-13px text-white/85"
                          style={radarLabelPos(a.angle)}
                        >
                          {a.label}
                        </div>
                      ))}
                    </div>

                    {/* 图例 */}
                    <div class="flex flex-col gap-16px">
                      <div class="flex items-center gap-8px text-14px text-white/85">
                        <span class="size-10px bg-[#4E92ED]" />
                        改造前
                      </div>
                      <div class="flex items-center gap-8px text-14px text-white/85">
                        <span class="size-10px bg-[#2ED9C4]" />
                        改造后
                      </div>
                    </div>
                  </div>
                </div>
              ),
            }}
          />
        </div>

        {/* 实施后评估弹窗（独立文件，结构与图册弹窗一模一样，可自行修改） */}
        <PostEvaluationModal
          visible={previewVisible.value}
          images={ALBUM_PLACEHOLDERS}
          initialIndex={previewIndex.value}
          onUpdate:visible={(v) => (previewVisible.value = v)}
        />
      </>
    );
  },
});
