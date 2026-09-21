/** 步骤状态：finish=已完成（灰色实心+打钩） process=当前所处（强调色） wait=未到达（灰描边+数字） */
export type StepStatus = 'finish' | 'process' | 'wait';

/** 步骤条单项 */
export type StepItem = {
  title: string;
  description?: string;
  status?: StepStatus;
  /** 禁用（不可点击进入；置灰降透明度）：用于按业务阶段限制可进入的步骤页签 */
  disabled?: boolean;
};
