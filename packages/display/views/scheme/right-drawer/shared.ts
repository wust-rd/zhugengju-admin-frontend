import { cn } from '@jeesite/core/libs';

import aerialThumb1 from '@jeesite/assets/images/display/scheme-aerial/aerial-1.webp';
import aerialThumb2 from '@jeesite/assets/images/display/scheme-aerial/aerial-2.webp';
import aerialThumb3 from '@jeesite/assets/images/display/scheme-aerial/aerial-3.webp';
import aerialThumb4 from '@jeesite/assets/images/display/scheme-aerial/aerial-4.webp';
import aerialThumb5 from '@jeesite/assets/images/display/scheme-aerial/aerial-5.webp';
import aerialThumb6 from '@jeesite/assets/images/display/scheme-aerial/aerial-6.webp';
import aerialThumb7 from '@jeesite/assets/images/display/scheme-aerial/aerial-7.webp';
import aerialThumb8 from '@jeesite/assets/images/display/scheme-aerial/aerial-8.webp';
import aerialThumb9 from '@jeesite/assets/images/display/scheme-aerial/aerial-9.webp';
import aerialThumb10 from '@jeesite/assets/images/display/scheme-aerial/aerial-10.webp';
import aerialThumb11 from '@jeesite/assets/images/display/scheme-aerial/aerial-11.webp';
import aerialThumb12 from '@jeesite/assets/images/display/scheme-aerial/aerial-12.webp';
import aerialThumb13 from '@jeesite/assets/images/display/scheme-aerial/aerial-13.webp';
import aerialThumb14 from '@jeesite/assets/images/display/scheme-aerial/aerial-14.webp';
import aerialThumb15 from '@jeesite/assets/images/display/scheme-aerial/aerial-15.webp';
import aerialThumb16 from '@jeesite/assets/images/display/scheme-aerial/aerial-16.webp';
import aerialThumb17 from '@jeesite/assets/images/display/scheme-aerial/aerial-17.webp';
import factoryAfterImg from '@jeesite/assets/images/display/scheme-factory/factory-after.jpg';
import factoryBeforeImg from '@jeesite/assets/images/display/scheme-factory/factory-before.jpg';

/**
 * 可点击的「标题 + 内容」卡片容器样式（抽屉内多个 Tab 共用）
 *
 * 用于「同一屏里并排/上下排列的若干张卡片，点哪张左侧大图就显示哪张对应的图」这类交互
 * （feature-plan 的总体目标/主导功能定位、urban-design 的产业发展/历史文化保护）。
 *
 * 之所以提到这里共用：它是**交互选中态**的样式，两个 Tab 必须长得一模一样，
 * 各写一份容易只改一处导致同一种交互出现两种视觉。静态装饰（标题行等）仍按各 Tab 自己写。
 *
 * @param active 是否为当前选中项
 */
export const selectableCardClass = (active: boolean) =>
  cn('mt-16px w-full b-1 b-solid bg-white/2 p-12px rd-8px bg-white/6 cursor-pointer transition-all duration-200', {
    // 选中：青色描边（与「查看详情」弹窗表头同色）
    'b-[#28DBFF60]': active,
    // 未选中：保持原描边，鼠标悬停微微提亮，给出「可点」提示
    'b-white/6 hover:b-white/20': !active,
  });

/**
 * 可点击的缩略图样式（选中态同上，交互语义与 selectableCardClass 一致）
 *
 * 用于「一排缩略图，点哪张页面左侧大图就显示哪张」（post-evaluation 的更新后评估图）。
 *
 * @param active 是否为当前选中项
 */
export const selectableThumbClass = (active: boolean) =>
  cn('size-52px cursor-pointer rd-8px object-cover transition-all duration-150 b-2px b-solid', {
    'b-[#28DBFF60]': active,
    'b-white/10 hover:b-white/40': !active,
  });

/* ---------- 多图 Tab 的图片清单 ---------- */

/** 皮子街片区素材 OSS 基础地址（原始链接为 percent-encoding，这里已解码） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/**
 * 「更新后评估」素材图（两厂改造项目 + 航拍照片，jpeg）
 *
 * 放在这里共用：Tab 内渲染按钮/缩略图，页面左侧大图取同一份地址，
 * 两边各写一份容易改一处漏一处。
 * 左侧大图的联动状态是 use-area-detail-view 的 evalImgView（单图或前后对比双图）。
 */

/** 皮子街两厂改造项目：改造前 / 改造后。
 *  用本地归一化副本（packages/assets/.../scheme-factory/），非 OSS 原图：
 *  两张 OSS 原图宽高比不同（前 2403×1651 ≈1.455 / 后 2999×2249 ≈1.333），
 *  object-contain 下渲染大小不一致；「改造后」上下各裁 94px（顶部天空 / 底部广场铺装，
 *  视觉确认过非主体）统一到 1.455，对比模式两图等大、不拉伸 */
export const FACTORY_BEFORE = factoryBeforeImg;
export const FACTORY_AFTER = factoryAfterImg;

/** 航拍照片原图（「武汉智眼航拍全景」块，点击缩略图后左侧大图用）：实施后评估-航拍-1~17.webp */
export const AERIAL_IMAGES = Array.from({ length: 17 }, (_, i) => `${AREA_OSS}/实施后评估-航拍-${i + 1}.webp`);

/** 航拍照片缩略图（本地 120px webp，与原图一一对应）：OSS 原图为 4032×3024 的 1~2MB 大图，
    且该桶未开通图片处理服务（x-oss-process 参数被忽略），无法服务端缩图——直接拿原图当
    52px 缩略图会让浏览器解码上亿像素，是抽屉滚动到航拍区卡顿的根因 */
export const AERIAL_THUMBS = [
  aerialThumb1,
  aerialThumb2,
  aerialThumb3,
  aerialThumb4,
  aerialThumb5,
  aerialThumb6,
  aerialThumb7,
  aerialThumb8,
  aerialThumb9,
  aerialThumb10,
  aerialThumb11,
  aerialThumb12,
  aerialThumb13,
  aerialThumb14,
  aerialThumb15,
  aerialThumb16,
  aerialThumb17,
];
