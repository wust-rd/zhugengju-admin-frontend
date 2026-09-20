/*
  审查流转通知（框架站内消息 msgInner）

  业务：主审单位在审查页点「联合审查」弹窗确定后，除了前端状态流转，还要给被选中的
  联合审查单位**发一条系统通知**（系统「通知 / 站内消息」里能看到），提醒他们及时提交审查意见。

  现状与 TODO：
   - 现在给「联合审查单位」**角色**（role code `esp_pqchsbsc_joint_review`）发通知，
     消息正文里列出本次被选中的单位清单；账号登录后能在系统通知里看到。
   - ⚠️ 精确到「某个单位（部门）」需要后端提供联审单位字典（含部门编码）：
     届时把 receiveType 改为 '2'（部门）、receiveCodes 传所选单位部门编码即可（见接口文档 TODO）。
   - 发送失败（无 msg 权限 / 后端未启动）不影响本地状态流转，仅提示，不阻断主流程。
*/
import { msgInnerSave } from '@jeesite/core/api/msg/msgInner';
import { ROLE_CODE, type ReviewerIdentity } from './review-mock';

/** 审查列表页路径（消息正文里给个入口提示，正式版可换成待办链接） */
const REVIEW_PAGE_PATH = '/early-stage-planning/scheme-declaration-review/scheme-review/list';

export type JointReviewNoticeInput = {
  /** 片区名称 */
  rowName: string;
  /** 联合审查轮次 */
  round: number;
  /** 本轮选中的联合审查单位 */
  units: ReviewerIdentity[];
  /** 发起人（主审单位名称） */
  senderName: string;
};

/**
 * 发起联合审查后发系统通知给联合审查单位角色。
 * @returns 是否发送成功（失败不抛错，调用方据此决定提示文案）
 */
export async function sendJointReviewNotice(input: JointReviewNoticeInput): Promise<boolean> {
  const unitNames = input.units.map((unit) => unit.name).join('、');
  try {
    await msgInnerSave(undefined, {
      msgTitle: `【片区策划方案审查】${input.rowName} 发起第 ${input.round} 次联合审查`,
      // 1普通 2一般 3紧急
      contentLevel: '2',
      // 1公告 2新闻 3会议 4其它
      contentType: '4',
      msgContent:
        `<p>${input.senderName}（主审单位）已发起「${input.rowName}」第 ${input.round} 次联合审查。</p>` +
        `<p>本次联合审查单位：${unitNames}。</p>` +
        `<p>请上述单位登录系统，在「片区策划方案审查」列表中点「审查」提交审查意见` +
        `（审核结果：通过 / 退回修改 / 不涉及）。</p>` +
        `<p>入口：${REVIEW_PAGE_PATH}</p>`,
      // 接受者类型：3=角色（暂按角色推送，精确到部门见文件头 TODO）
      receiveType: '3',
      receiveCodes: ROLE_CODE.jointReview,
      receiveNames: '联合审查单位',
      // 通知类型：PC（站内）
      notifyTypes: 'PC',
    });
    return true;
  } catch (error) {
    console.warn('[scheme-review] 联合审查站内消息发送失败：', error);
    return false;
  }
}
