/*
  esp 文件上传列表（scheme-fill 各区块上传位共用）

  封装「antd Upload 受控 fileList ↔ 后端文件对象数组」的同步：
   - beforeUpload 同步返回 false 阻止 antd 自动上传（antd 随后把条目入列并触发
     onChange，受控同步照常进行），同时后台调 POST /a/esp/file/upload（单文件一次
     请求），按 uid 定位条目回填 name/url/objectKey/size，失败移除条目并提示后端 msg；
   - espFiles() 输出保存契约的文件对象数组（uploading 中的条目跳过，不阻塞保存）。
*/
import { nextTick, ref } from 'vue';
import type { UploadFile } from 'antdv-next';
import { useMessage } from '@jeesite/core/hooks/web/useMessage';
import {
  espFileUpload,
  type EspSchemeFile,
} from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

/** antd UploadFile 上扩展 objectKey（后端文件对象字段，antd 类型未定义） */
export type EspUploadFile = UploadFile & { objectKey?: string };

/** 受控上传条目 → 后端文件对象 */
function toEspFile(f: EspUploadFile): EspSchemeFile {
  return { name: f.name, url: f.url, objectKey: f.objectKey, size: f.size };
}

/** 后端文件对象（回显初值）→ 受控上传条目 */
export function toUploadFile(f: EspSchemeFile, uid: string): EspUploadFile {
  return { uid, name: f.name, url: f.url, objectKey: f.objectKey, size: f.size, status: 'done' };
}

/**
 * 上传位状态机（单文件位一份实例）
 *
 * @param initial 回显初值（后端文件对象数组）
 */
export function useEspFileList(initial?: EspSchemeFile[]) {
  const fileList = ref<EspUploadFile[]>([]);
  const { showMessage } = useMessage();

  let seq = 0;
  fileList.value = (initial ?? []).map((f) => toUploadFile(f, `esp-${seq++}`));

  /** antd 列表变化（选文件入列/移除图标）→ 受控同步 */
  function onChange(info: { fileList: UploadFile[] }) {
    fileList.value = info.fileList as EspUploadFile[];
  }

  /**
   * 选文件即手动上传：同步返回 false（antd 随后入列条目），上传在后台进行，
   * nextTick 后按 uid 定位 antd 入列的条目标记 uploading，完成回填/失败移除。
   */
  function beforeUpload(file: File): boolean {
    void uploadEntry(file);
    return false;
  }

  async function uploadEntry(file: File) {
    const uid = (file as { uid?: string }).uid ?? `esp-${seq++}`;
    await nextTick();
    const entry = fileList.value.find((f) => f.uid === uid);
    if (entry) {
      entry.status = 'uploading';
    }
    try {
      const uploaded = await espFileUpload(file);
      const target = fileList.value.find((f) => f.uid === uid);
      if (target) {
        target.status = 'done';
        target.name = uploaded.name;
        target.url = uploaded.url;
        target.objectKey = uploaded.objectKey;
        target.size = uploaded.size;
      } else {
        // 极端时序下 antd 未入列：直接补一条完成态，保证不丢文件
        fileList.value = [...fileList.value, toUploadFile(uploaded, uid)];
      }
    } catch (error) {
      fileList.value = fileList.value.filter((f) => f.uid !== uid);
      showMessage(error instanceof Error ? error.message : '上传失败');
    }
  }

  /** 移除条目（自绘清单场景；antd 自带移除图标走 onChange） */
  function remove(file: EspUploadFile) {
    fileList.value = fileList.value.filter((f) => f.uid !== file.uid);
  }

  /** 当前保存值：文件对象数组（uploading 中的条目跳过） */
  function espFiles(): EspSchemeFile[] {
    return fileList.value.filter((f) => f.status !== 'uploading' && f.name).map(toEspFile);
  }

  return { fileList, onChange, beforeUpload, remove, espFiles };
}
