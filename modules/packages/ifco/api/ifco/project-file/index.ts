/**
 * ifco —— 项目资料管理（接口层）
 *
 * 对接后端 /a/ifco/projectfile/*（modules/ifco projectfile 包，接口文档-项目资料管理.md）。
 * 目录：固定目录（策划库资料/实施库资料——服务端读 ESP_PROJECT_EXTRA 转库附件实时
 * 派生，只读）+ 用户目录（IFCO_PROJECT_FILE_DIR，项目内目录名唯一）。文件为 JSON
 * 数组串（与项目库附件同构 {name,url,objectKey,size,uploadDate}），上传/删除/
 * 重命名均整替提交；文件本体走 esp 通用上传 /a/esp/file/upload（MinIO 永久直链）。
 */
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/projectfile';

/** 文件元数据（name 必有；固定目录来自项目库附件，无 uploadDate 展示为 —） */
export type ProjectFileItem = {
  name: string;
  url?: string;
  objectKey?: string;
  size?: number;
  uploadDate?: string;
};

/** 目录（fixed=固定目录：转库附件只读，无上传/改名/删除入口） */
export type ProjectFileDir = {
  id: string;
  name: string;
  fixed?: boolean;
  /** 折叠态（仅会话内的展开状态，不参与业务数据） */
  collapsed?: boolean;
  files: ProjectFileItem[];
};

type DirRow = { id: string; dirName: string; files: ProjectFileItem[] };

/** 项目资料目录集（固定目录在前 + 用户目录；一次拉全） */
export async function fetchProjectFileList(pUid: string): Promise<ProjectFileDir[]> {
  const data = await unwrap<{ fixed: { name: string; files: ProjectFileItem[] }[]; dirs: DirRow[] }>(
    defHttp.get({ url: BASE + '/list', params: { pUid } }),
  );
  return [
    ...(data.fixed ?? []).map((dir) => ({
      id: `fixed-${dir.name}`,
      name: dir.name,
      fixed: true,
      files: dir.files ?? [],
    })),
    ...(data.dirs ?? []).map((dir) => ({ id: dir.id, name: dir.dirName, files: dir.files ?? [] })),
  ];
}

/** 目录保存（id 空=新增需带 pUid；非空=改名；后端做重名与固定目录名校验） */
export async function saveProjectDir(data: { id?: string; pUid?: string; dirName: string }) {
  return unwrap<{ id: string; dirName: string }>(defHttp.postJson({ url: BASE + '/dir/save', data }));
}

/** 目录删除（后端校验：仅空目录可删） */
export async function deleteProjectDir(id: string) {
  return unwrap<{ id: string }>(defHttp.postJson({ url: BASE + '/dir/delete', data: { id } }));
}

/** 文件清单整替（上传/删除/重命名后整份提交；空清单即清空） */
export async function saveProjectFiles(dirId: string, files: ProjectFileItem[]) {
  return unwrap<{ dirId: string; files: ProjectFileItem[] }>(
    defHttp.postJson({ url: BASE + '/file/save', data: { dirId, files } }),
  );
}

/**
 * 文件本体上传（esp 通用上传，单文件；uploadFile 直走 axios 实例，resolve 完整
 * AxiosResponse，.data 才是 {code,msg,data} body——与 scheme-fill 的 uploadBody 同款）
 */
export async function uploadProjectFile(file: File): Promise<ProjectFileItem> {
  const res = await defHttp.uploadFile({ url: adminPath + '/esp/file/upload' }, { file, name: 'files' });
  const uploaded = unwrap<{ fileName: string; url: string; objectKey: string; size: number }[]>(
    (res as Recordable)?.data,
  );
  const first = (uploaded ?? [])[0];
  if (!first) {
    throw new Error('上传失败：未返回文件信息');
  }
  return { name: first.fileName, url: first.url, objectKey: first.objectKey, size: first.size };
}
