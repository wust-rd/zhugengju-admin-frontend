/**
 * ifco —— 项目资料管理（接口层）
 *
 * 资料归集的目录/文件仓库。用户自建目录：后端未接入，会话内存存储
 * （Map<项目pUid, 目录[]>，刷新即恢复），组件持有 fetchProjectDirs 返回的活引用，
 * 增删改直接作用于其上，无需回写。固定目录（策划库资料/实施库资料）：来自
 * 项目库详情的转库附件字段（策划转储备四项/储备转实施两项），只读展示。
 */

import { fetchLibDetail, fileListNames, parseFileList } from '@jeesite/ifco/api/ifco/project-library';

/** 归集文件条目（固定目录文件来自项目库附件；上传仅记录文件名与日期，演示口径） */
export type ProjectFileItem = {
  id: string;
  /** 文件名（含后缀） */
  name: string;
  /** 上传日期（YYYY-MM-DD；项目库附件无日期，展示为 —） */
  uploadDate: string;
};

/** 归集目录 */
export type ProjectFileDir = {
  id: string;
  name: string;
  /** 固定目录（策划库/实施库资料）：只读，不可上传/改名/删除（展示层标记） */
  fixed?: boolean;
  /** 折叠态（仅会话内的展开状态，不参与业务数据） */
  collapsed?: boolean;
  files: ProjectFileItem[];
};

/** 演示初始目录（后端接入前；首个访问时生成） */
const DEFAULT_DIR_NAMES = ['立项批复文件', '施工许可文件', '验收备案文件'];

const projectFileStore = new Map<string, ProjectFileDir[]>();

/** id 发生器（会话内自增，前缀区分目录/文件便于调试） */
let idSeq = 0;
export function nextProjectFileId(prefix = ''): string {
  idSeq += 1;
  return `${prefix}${Date.now().toString(36)}${idSeq}`;
}

/** 取项目的用户自建目录集（无则按演示目录初始化；返回活引用，改动即时生效） */
export function fetchProjectDirs(pUid: string): ProjectFileDir[] {
  let dirs = projectFileStore.get(pUid);
  if (!dirs) {
    dirs = DEFAULT_DIR_NAMES.map((name) => ({ id: nextProjectFileId('d'), name, files: [] }));
    projectFileStore.set(pUid, dirs);
  }
  return dirs;
}

// ── 固定目录：项目库转库附件（在库项目管理抽屉的上传字段） ────────────

/** 策划转储备（抽屉步骤②）附件字段 → 策划库资料目录 */
const PLANNING_FILE_FIELDS = ['approval_filing_files', 'tsp_files', 'impl_plan_files', 'other_arg_files'];

/** 储备转实施（抽屉步骤③）附件字段 → 实施库资料目录 */
const IMPL_FILE_FIELDS = ['impl_plan_adj_files', 'impl_fund_proof_files'];

/** 详情附件字段（JSON 数组串）→ 文件条目（无日期，展示 —） */
function libFilesOf(row: Recordable, field: string): ProjectFileItem[] {
  return fileListNames(parseFileList(row[field])).map((name, index) => ({
    id: `lib-${field}-${index}-${name}`,
    name,
    uploadDate: '',
  }));
}

/** 取项目的固定目录（第一/第二个：策划库资料、实施库资料；文件来自项目库详情） */
export async function fetchFixedProjectDirs(pUid: string): Promise<ProjectFileDir[]> {
  const row = (await fetchLibDetail(pUid)) ?? {};
  return [
    {
      id: 'fixed-planning',
      name: '策划库资料',
      fixed: true,
      files: PLANNING_FILE_FIELDS.flatMap((field) => libFilesOf(row, field)),
    },
    {
      id: 'fixed-impl',
      name: '实施库资料',
      fixed: true,
      files: IMPL_FILE_FIELDS.flatMap((field) => libFilesOf(row, field)),
    },
  ];
}
