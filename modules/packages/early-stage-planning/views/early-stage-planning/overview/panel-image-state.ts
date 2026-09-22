/**
 * 左侧面板大图 · 联动状态（模块级共享，各图片 tab 与 display-panel 通用）
 *
 * 统一交互（同 pdf-export-state.ts 的模块级共享状态模式）：
 * tab 内容里放一排缩略图（单排，超宽横向滑动），点选 → 左侧面板大图切换；
 * 面板左右箭头反向读写同一下标，tab 内选中高亮同步跟随。
 *
 * - panelImageIndexes：key = 抽屉 tab 名（基本情况 / 体检情况 / 功能策划…），
 *   值 = 当前展示图下标（tab 缩略图点选与面板箭头共写）；
 * - examPanelImages：体检情况特有——三清单共用一个下标，当前清单的图集
 *   （问题整治 / 发展机遇 / 更新诉求配图）由 physical-exam 按清单 tab 写入，
 *   清单切换时同步重置下标；
 * - cityDesignPanelImages：城市设计特有——六类别共用一个下标，当前类别的
 *   设计图集由 city-design 按类别 tab 写入，类别切换时同步重置下标。
 */
import { reactive, ref } from 'vue';

/** 各 tab 当前展示图下标（点缩略图 / 面板箭头切换；缺省 0） */
export const panelImageIndexes = reactive<Record<string, number>>({});

/** 体检情况：当前清单图集 url（physical-exam 写入，面板按此展示） */
export const examPanelImages = ref<string[]>([]);

/** 城市设计：当前类别设计图集 url（city-design 按类别 tab 写入，面板按此展示） */
export const cityDesignPanelImages = ref<string[]>([]);

/** 规划调整：面板查看模式（plan-adjust 三按钮写，面板读）——before/after = 单图，
    compare = 调整前后两张图左右并排展示 */
export const adjustViewMode = ref<'before' | 'after' | 'compare'>('before');
