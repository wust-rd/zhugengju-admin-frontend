/**
 * 市住更局 —— 城市更新专家管理 · 项目评估 接口层（后端 modules/esp，jeesite-module-esp）
 *
 * 后端代码：api/web/uproject/UreProjectController（/a/ure/project/*）。
 * 响应协议：{code, msg, data}，unwrap() 统一解包（同 ure-expert.ts）。
 * 状态机（2026-09-27 评估流程升级，服务端强制）：
 *   0-待提交 --submit--> 1-评估中 --comprehensive(组长)--> 2-待评价 --finishEval--> 3-已完成
 * 评估中：参与专家（含组长）各提交一条个人评估（saveEval，可重复更新）；
 * 综合评估仅组长可交，前置全部组员已交个人评估。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { UreExpert } from './ure-expert';

const { adminPath } = useGlobSetting();

/** 统一解包 {code, msg, data}（兼容 jeesite result 协议透传） */
function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  // jeesite 协议（框架拦截/权限校验返回 {result:'false', message}）：视为业务错误，避免错误对象被当数据渲染
  if (body && typeof body === 'object' && body.result === 'false') {
    throw new Error(body.message || '接口请求失败');
  }
  return body as T;
}

/** 后端分页结构 */
type UrePage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

// ---------------- 类型 ----------------

/** 附件文件（真实上传 /a/esp/file/upload 后的保存契约；旧数据仅含 name 无 url） */
export type UreFile = { name: string; url?: string; objectKey?: string; size?: number };

/** 个人评估（当前用户回显 / 组员意见卡片共用结构） */
export type UreMemberEval = {
  expertId?: string;
  name?: string;
  org?: string;
  field?: string;
  isLeader?: boolean;
  /** 通过 / 不通过 */
  evalResult: string;
  evalOpinion: string;
  evalAttachments: UreFile[];
  /** yyyy-MM-dd */
  evalDate?: string;
};

/** 综合评估（组长提交后存于项目字段） */
export type UreComprehensive = {
  evalResult: string;
  evalOpinion: string;
  evalAttachments: UreFile[];
};

/** 项目列表行（page 接口，含状态中文/码、组长姓名、专家名单） */
export type UreProjectRow = {
  id: string;
  code: string;
  name: string;
  adminDistrict: string;
  district: string;
  coordinator: string;
  implementOrg: string;
  reviewMode: string;
  status: string;
  statusCode: string;
  /** 视角状态（不同角色不同状态机：实施主体 待提交/待评估/待评价/已完成；组员 待评估/已评估；组长 待评估/待总结/已完成） */
  viewStatus?: string;
  /** 视角状态码：0待提交/1待评估/2待评价/3已完成 沿用全局码，另有 4已评估（组员）、5待总结（组长） */
  viewStatusCode?: string;
  startDate: string;
  expertCount: number;
  expertNames: string[];
  leaderName: string;
  evalResult: string;
  createByName: string;
  createDate: string;
  /** 当前登录为绑定专家时返回（评估按钮显示条件） */
  isLeader?: boolean;
  /** 当前登录专家是否已提交个人评估 */
  myEval?: boolean;
};

/** 项目详情行（form/detail/evalForm 共用，全字段 + 参与专家 + 组长） */
export type UreProjectDetail = UreProjectRow & {
  dept: string;
  fundSource: string;
  investment: string;
  content: string;
  materials: UreFile[];
  experts: (UreExpert & { isLeader?: boolean })[];
  leaderId: string;
  evalOpinion: string;
  evalAttachments: UreFile[];
  /** evalForm 接口附加：当前用户视角 */
  isParticipant?: boolean;
  /** 本人个人评估回显（未提交为 null） */
  myEval?: UreMemberEval | null;
  /** 组长可见：组员意见卡片 */
  memberEvals?: UreMemberEval[];
  /** 组长可见：组员提交进度（不含组长） */
  memberSubmitted?: number;
  memberTotal?: number;
};

/** 保存项目入参（新建/修改合一，id 空=新增） */
export type UreProjectSaveData = {
  id?: string;
  name: string;
  adminDistrict?: string;
  district?: string;
  coordinator?: string;
  implementOrg?: string;
  reviewMode?: string;
  dept?: string;
  fundSource?: string;
  investment?: string;
  content?: string;
  materials?: UreFile[];
  /** 参与专家主键（3~7 名，全量重建） */
  expertIds?: string[];
  /** 组长专家主键（须为参与专家之一） */
  leaderId?: string;
};

/** 评估提交入参（个人评估 / 综合评估共用） */
export type UreEvalSubmitData = {
  /** 通过 / 不通过（或 1 / 0） */
  evalResult: string;
  evalOpinion: string;
  evalAttachments?: UreFile[];
};

/** 评估情况（详情页展示） */
export type UreProjectEvals = {
  code: string;
  name: string;
  status: string;
  statusCode: string;
  memberEvals: UreMemberEval[];
  comprehensive: UreComprehensive | null;
};

// ---------------- 1. 项目生命周期 ----------------

/** 1.1 分页查询（后端按登录角色过滤数据范围）——BasicTable api 直用 */
export async function ureProjectPage(params: Recordable): Promise<TablePage<UreProjectRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<UrePage<UreProjectRow>>(
    await defHttp.get({
      url: adminPath + '/ure/project/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 1.2 编辑回显（id 空=新增空骨架） */
export async function ureProjectForm(id: string): Promise<UreProjectDetail> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/project/form', params: { id } }));
}

/** 1.3 项目详情（按业务编码，下钻路由参数） */
export async function ureProjectDetail(code: string): Promise<UreProjectDetail> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/project/detail', params: { code } }));
}

/** 1.4 暂存项目（仅待提交可改；参与专家全量重建） */
export async function ureProjectSave(
  data: UreProjectSaveData,
): Promise<{ id: string; code: string; name: string; status: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/project/save', data }));
}

/** 1.5 提交项目（待提交 → 评估中；服务端强校验必填/材料/专家 3~7 名/组长） */
export async function ureProjectSubmit(id: string): Promise<{ id: string; code: string; status: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/ure/project/submit', params: { id } }));
}

/** 1.6 删除项目（仅待提交可删） */
export async function ureProjectDelete(id: string): Promise<{ id: string; code: string; name: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/ure/project/delete', params: { id } }));
}

// ---------------- 2. 评估流转 ----------------

/** 2.1 保存个人评估（评估中状态，参与专家含组长；一次性提交，提交后锁定不可修改） */
export async function ureProjectSaveEval(
  id: string,
  data: UreEvalSubmitData,
): Promise<{ id: string; code: string; status: string; evalResult: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/project/saveEval', params: { id }, data }));
}

/** 2.2 评估页数据（组长返回 memberEvals 组员意见与进度；新后端未上线时 404 静默，页面自行提示） */
export async function ureProjectEvalForm(id: string): Promise<UreProjectDetail> {
  return unwrap(
    await defHttp.get({ url: adminPath + '/ure/project/evalForm', params: { id } }, { errorMessageMode: 'none' }),
  );
}

/** 2.3 提交综合评估（仅组长；前置全部组员已交个人评估；评估中 → 待评价） */
export async function ureProjectComprehensive(
  id: string,
  data: UreEvalSubmitData,
): Promise<{ id: string; code: string; status: string; evalResult: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/project/comprehensive', params: { id }, data }));
}

/** 2.4 评估情况（详情页展示；仅组长/创建人/运维可见。errorMessageMode=none：
 *  无权限（普通组员）与后端未上线时都静默返回 null，不弹全局错误） */
export async function ureProjectEvals(code: string): Promise<UreProjectEvals> {
  return unwrap(
    await defHttp.get({ url: adminPath + '/ure/project/evals', params: { code } }, { errorMessageMode: 'none' }),
  );
}

/** 2.5 完成专家评价（待评价 → 已完成；前置全部参与专家已有项目化打分记录） */
export async function ureProjectFinishEval(id: string): Promise<{ id: string; code: string; status: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/ure/project/finishEval', params: { id } }));
}

// ---------------- 3. 组长判定 ----------------

/** 3.1 当前登录账号是否为项目组长（权限仅需登录） */
export async function ureProjectIsLeader(
  id: string,
): Promise<{ isLeader: boolean; expert: UreExpert | null; projectCode: string }> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/project/isLeader', params: { id } }));
}
