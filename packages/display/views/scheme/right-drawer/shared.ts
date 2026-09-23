import { cn } from '@jeesite/core/libs';

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

/** 皮子街两厂改造项目：改造前 / 改造后 */
export const FACTORY_BEFORE = `${AREA_OSS}/实施后评估-两厂改造项目-改造前.jpg`;
export const FACTORY_AFTER = `${AREA_OSS}/实施后评估-两厂改造项目-改造后.jpg`;

/** 航拍照片（「武汉智眼航拍全景」块，下拉选「航拍照片」时展示） */
export const AERIAL_IMAGES = [`${AREA_OSS}/实施后评估-航拍-1.webp`, `${AREA_OSS}/实施后评估-航拍-2.webp`];
