import { defineComponent, inject, ref, type CSSProperties } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';
import albumPic1 from '@jeesite/assets/images/display/plan/picture-box.webp';
import albumPic2 from '@jeesite/assets/images/display/plan/test.webp';
import albumPic3 from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';
import { ViewDetailButton } from './view-detail-button';
import { PostEvaluationModal } from './post-evaluation-modal';
import { EVALUATION_IMAGES, selectableThumbClass } from './shared';

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

/** 评估结论文字块（多行：换行位置即展示分行，渲染处用 whitespace-pre-line） */
const EVALUATION_TEXT = `(一)人居环境改善，供给“好房子”
住房品质提升：F地块新建住宅8.85万平方米，老旧小区实施基础设施焕新，包括排水、道路、楼本体、景观绿化、适老及停车设施改造，加装住宅电梯，改造仁寿路、双厂巷道路。
公共服务完善：新增社区综合服务站、公共活动空间、养老托育设施、社区卫生服务中心、社区食堂、智慧菜场、便民服务网点等，构建全龄友好型“好社区”。
绿色空间拓展：规划建设社区口袋公园、休闲广场，配置休憩座椅、健身设施及景观照明，打造可参与的公共绿色空间。
(二)城市功能优化，打造“好社区”
基础设施升级：实施道路修整工程，对市政给排水管网进行修缮改造；新增地面及地下停车泊位，布局新能源充电设施，缓解停车难题。
商业服务提质：引入品牌商业综合体，丰富商品品类，完善生鲜日配供应链；招引特色品牌，优化餐饮空间布局；在南洋产业园引入公寓民宿等中长期住宿资源，拓展居住业态。
文旅功能增强：通过D+M工业设计小镇、南洋1916等项目，打造文旅创意街区，提升片区文化吸引力与产业活力。
(三)社会经济效益提升，建设“好城区”
经济效益：通过商业运营、住宅销售、文旅消费等多渠道实现资金平衡与持续收益，带动区域资产增值。老旧小区改造预计20年总收益1629.46万元，老旧厂区改造预计10年实现资金平衡，F地块通过品质住宅销售与商业运营实现自平衡。
社会效益：提升居民满意度与获得感，完善社区服务体系，增强社区凝聚力与认同感。
文化效益：保护工业遗存，传承城市文脉，推动工业记忆与现代功能融合，打造具有辨识度的城市更新样板。四大举措协同推进，塑造“好房子、好小区、好社区、好街区”四好发展样板。`;

/** 更新后评估 */
export const PostEvaluation = defineComponent({
  setup() {
    /** 图册预览弹窗可见性 / 初始图片下标 */
    const previewVisible = ref(false);
    const previewIndex = ref(0);

    // 缩略图选中下标：优先用页面 provide 的共享实例（页面左侧大图据此联动），
    // 没有 provider 时退化为组件自己的局部状态
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeImg = view.evalImgIndex;

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
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    {/* 标题行 */}
                    <div class="flex h-24px items-center">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>
                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区更新后评估</div>

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

                  {/* 缩略图：点哪张，页面左侧大图就显示哪张（缩略图样式与「片区策划图册」同款） */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="flex h-24px items-center">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>
                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">更新后评估图</div>
                      <div class="ml-8px text-12px text-white/40">点击切换左侧大图</div>
                    </div>

                    <div class="mt-12px flex gap-6px">
                      {EVALUATION_IMAGES.map((src, index) => (
                        <img
                          key={src}
                          src={src}
                          alt={`更新后评估图 ${index + 1}`}
                          class={selectableThumbClass(activeImg.value === index)}
                          onClick={() => (activeImg.value = index)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 文字块：独立卡片，容器样式与雷达图卡片一致（同边框/底色/圆角/内边距） */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="text-14px font-400 lh-24px text-white whitespace-pre-line">{EVALUATION_TEXT}</div>
                  </div>
                </>
              ),
            }}
          />
        </div>

        {/* 更新后评估弹窗（独立文件，结构与图册弹窗一模一样，可自行修改） */}
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
