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
 * 用于「一排缩略图，点哪张页面左侧大图就显示哪张」（post-evaluation 的实施后评估图）。
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
 * 「实施后评估」的两张图
 *
 * 放在这里共用：Tab 内要用它们渲染缩略图，页面要用选中那张当左侧大图，
 * 两边各写一份地址容易改一处漏一处。**状态本身是下标**（use-area-detail-view 的 evalImgIndex），
 * 页面直接 `EVALUATION_IMAGES[下标]`。
 */
export const EVALUATION_IMAGES = [`${AREA_OSS}/实施后评估-1.webp`, `${AREA_OSS}/实施后评估-2.webp`];
