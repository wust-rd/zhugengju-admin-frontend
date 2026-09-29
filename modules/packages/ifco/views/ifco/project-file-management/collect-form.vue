<!--
  ifco —— 资料归集（编辑抽屉）

  项目资料管理 · 操作列「编辑」打开（width 70%）。顶栏：胶囊搜索框（按文件名
  过滤——只保留命中文件所在目录与命中条目，其余目录/文件隐藏，命中时无视折叠
  态展开，清空恢复全量）+ 右上角「新增目录」（Modal 输入目录名即建；重名与固定
  目录名校验前后端双做）。
  主体：目录卡片纵向平铺——前两个为固定目录（策划库资料=在库项目管理抽屉
  「策划转储备」四个上传字段的附件；实施库资料=「储备转实施」两个上传字段的
  附件；服务端读 ESP_PROJECT_EXTRA 实时派生，只读——不上传/不改名/不删除，
  文件条目无删除与编辑）；其后为用户目录——标题栏（蓝色竖条 + 目录名 + 文件数
  + 右侧「+」上传（文件本体走 esp 通用上传 /a/esp/file/upload，元数据随清单
  整替保存）/铅笔改名（与新增共用目录名弹窗）/红色删除（前后端双拦截：目录下
  存在文件不可删）/折叠箭头），文件条目 = 序号/回形针图标/文件名（超长省略）/
  上传日期/删除（红字，二次确认）/编辑（红铅笔，Modal 重命名）。
  已接后端 /a/ifco/projectfile/*：list（目录集）、dir/save（新增/改名）、
  dir/delete（空目录删除）、file/save（文件清单整替）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="70%" @register="registerDrawer">
    <template #title>
      <span>资料归集 · {{ record.projectName }}</span>
    </template>

    <!-- 顶栏：胶囊搜索 + 右上角新增目录 -->
    <div class="mb-12px flex items-center gap-12px">
      <div class="flex h-34px w-360px items-center gap-8px b-1 b-solid b-gray-200 rd-full px-14px">
        <span class="i-ant-design:search-outlined shrink-0 text-15px text-gray-400"></span>
        <input
          v-model="keyword"
          type="text"
          placeholder="请输入关键词"
          class="h-full min-w-0 flex-1 bg-transparent text-14px outline-none placeholder-text-gray-300"
        />
        <span
          v-if="keyword"
          class="i-ant-design:close-circle-filled shrink-0 cursor-pointer text-14px text-gray-300 hover-text-gray-400"
          @click="keyword = ''"
        ></span>
      </div>
      <a-button type="primary" class="ml-auto" @click="openDirCreate">
        <Icon icon="i-ant-design:folder-add-outlined" /> 新增目录
      </a-button>
    </div>

    <!-- 目录卡片纵向平铺（搜索时只留命中目录） -->
    <div class="flex flex-col gap-12px">
      <div v-for="dir in visibleDirs" :key="dir.id" class="b-1 b-solid b-gray-100 bg-white rd-8px shadow-sm">
        <!-- 目录标题栏：蓝竖条 + 目录名 + 「+」上传 + 折叠箭头（固定目录只读） -->
        <div class="flex items-center justify-between b-b-1 b-b-solid b-gray-100 px-16px py-12px">
          <div class="flex min-w-0 items-center gap-8px">
            <span class="h-14px w-4px shrink-0 rd-2px bg-#1677ff"></span>
            <span class="truncate text-15px font-600 text-gray-900">{{ dir.name }}</span>
            <span class="shrink-0 text-12px text-gray-400">（{{ filesOf(dir).length }}）</span>
          </div>
          <div class="flex shrink-0 items-center gap-10px">
            <template v-if="!dir.fixed">
              <Upload :show-upload-list="false" :custom-request="(option) => handleUpload(dir, option.file as File)">
                <span
                  class="i-ant-design:plus-outlined cursor-pointer text-16px text-gray-600 hover-text-#1677ff"
                  title="上传文件"
                ></span>
              </Upload>
              <span
                class="i-ant-design:edit-outlined cursor-pointer text-14px text-gray-600 hover-text-#1677ff"
                title="编辑目录名"
                @click="openDirRename(dir)"
              ></span>
              <span
                class="i-ant-design:delete-outlined cursor-pointer text-14px text-#ff4d4f"
                title="删除目录"
                @click="confirmRemoveDir(dir)"
              ></span>
            </template>
            <span
              class="i-ant-design:down-outlined cursor-pointer text-14px text-gray-400 transition-transform"
              :class="isExpanded(dir) ? '' : '-rotate-90'"
              @click="dir.collapsed = !dir.collapsed"
            ></span>
          </div>
        </div>
        <!-- 文件条目：序号/回形针/文件名/日期/删除/编辑（固定目录无删除与编辑） -->
        <div v-show="isExpanded(dir)" class="flex flex-col px-16px py-4px">
          <div
            v-for="(file, index) in filesOf(dir)"
            :key="`${index}-${file.name}`"
            class="flex items-center gap-10px b-b-1 b-b-solid b-gray-50 py-8px text-14px last:b-b-none"
          >
            <span class="w-24px shrink-0 text-center text-12px text-gray-400">{{ index + 1 }}</span>
            <span class="i-ant-design:paper-clip-outline shrink-0 text-14px text-gray-400"></span>
            <span class="min-w-0 flex-1 truncate text-gray-800" :title="file.name">{{ file.name }}</span>
            <span class="shrink-0 text-12px text-gray-400">{{ file.uploadDate || '—' }}</span>
            <template v-if="!dir.fixed">
              <span class="shrink-0 cursor-pointer text-#ff4d4f" @click="confirmRemoveFile(dir, file)"> 删除 </span>
              <span
                class="i-ant-design:edit-outlined shrink-0 cursor-pointer text-14px text-#ff4d4f"
                title="编辑文件名"
                @click="openRename(dir, file)"
              ></span>
            </template>
          </div>
          <div v-if="!filesOf(dir).length" class="py-12px text-center text-13px text-gray-300">
            {{ keyword ? '无命中文件' : dir.fixed ? '暂无文件' : '暂无文件，点击右上角 + 上传' }}
          </div>
        </div>
      </div>
      <div v-if="!visibleDirs.length" class="py-40px text-center text-13px text-gray-300">
        {{ keyword ? '未搜到相关文件' : '暂无目录，点击右上角「新增目录」创建' }}
      </div>
    </div>

    <!-- 目录名弹窗（新增目录 / 编辑目录名共用） -->
    <Modal
      v-model:open="dirModalVisible"
      :title="dirModalMode === 'create' ? '新增目录' : '编辑目录名'"
      :width="420"
      :confirm-loading="saving"
      @ok="handleDirModalOk"
    >
      <Input
        v-model:value="dirNameInput"
        placeholder="请输入目录名"
        :maxlength="50"
        show-count
        @press-enter="handleDirModalOk"
      />
    </Modal>

    <!-- 编辑文件名（重命名） -->
    <Modal
      v-model:open="renameModalVisible"
      title="编辑文件名"
      :width="420"
      :confirm-loading="saving"
      @ok="handleRename"
    >
      <Input
        v-model:value="renameName"
        placeholder="请输入文件名"
        :maxlength="100"
        show-count
        @press-enter="handleRename"
      />
    </Modal>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoProjectFileManagementCollectForm">
  import { computed, ref } from 'vue';
  import { Input, Modal, Upload } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    deleteProjectDir,
    fetchProjectFileList,
    saveProjectDir,
    saveProjectFiles,
    uploadProjectFile,
    type ProjectFileDir,
    type ProjectFileItem,
  } from '@jeesite/ifco/api/ifco/project-file';

  const { showMessage } = useMessage();

  const record = ref<{ pUid?: string; projectName?: string }>({});

  /** 目录集（固定目录在前，fixed 标记只读；每次打开从后端拉全量） */
  const dirs = ref<ProjectFileDir[]>([]);

  /** 写操作进行中（Modal 确认按钮 loading） */
  const saving = ref(false);

  // ── 搜索：按文件名过滤，只留命中目录与命中条目（命中时无视折叠态展开） ──
  const keyword = ref('');

  function filesOf(dir: ProjectFileDir): ProjectFileItem[] {
    const kw = keyword.value.trim();
    return kw ? dir.files.filter((file) => file.name.includes(kw)) : dir.files;
  }

  const visibleDirs = computed(() => dirs.value.filter((dir) => !keyword.value.trim() || filesOf(dir).length));

  function isExpanded(dir: ProjectFileDir): boolean {
    return !!keyword.value.trim() || !dir.collapsed;
  }

  /** 后端异常提示（404 等业务信息由 msg 带回） */
  function showSaveError(e: unknown) {
    showMessage((e as Error)?.message || '保存失败');
  }

  // ── 上传：文件本体走 esp 通用上传，元数据随清单整替保存 ─────────────
  async function handleUpload(dir: ProjectFileDir, file: File) {
    try {
      const uploaded = await uploadProjectFile(file);
      dir.files.push({ ...uploaded, uploadDate: new Date().toISOString().slice(0, 10) });
      await saveProjectFiles(dir.id, dir.files);
      showMessage('上传成功');
    } catch (e) {
      showSaveError(e);
    }
  }

  // ── 删除文件（二次确认 → 本地移除 → 清单整替） ─────────────────────
  function confirmRemoveFile(dir: ProjectFileDir, file: ProjectFileItem) {
    Modal.confirm({
      title: `确认删除文件「${file.name}」？`,
      onOk: async () => {
        const index = dir.files.indexOf(file);
        if (index >= 0) dir.files.splice(index, 1);
        try {
          await saveProjectFiles(dir.id, dir.files);
        } catch (e) {
          showSaveError(e);
        }
      },
    });
  }

  // ── 目录：新增 / 改名（共用弹窗）、删除（前后端双拦截必须无文件） ────
  const dirModalVisible = ref(false);
  const dirModalMode = ref<'create' | 'rename'>('create');
  const dirNameInput = ref('');
  const dirRenameTarget = ref<ProjectFileDir | null>(null);

  function openDirCreate() {
    dirModalMode.value = 'create';
    dirRenameTarget.value = null;
    dirNameInput.value = '';
    dirModalVisible.value = true;
  }

  function openDirRename(dir: ProjectFileDir) {
    dirModalMode.value = 'rename';
    dirRenameTarget.value = dir;
    dirNameInput.value = dir.name;
    dirModalVisible.value = true;
  }

  async function handleDirModalOk() {
    const name = dirNameInput.value.trim();
    if (!name) {
      showMessage('请输入目录名');
      return;
    }
    // 本地先拦（后端 save 同样校验）：重名含固定目录名
    if (dirs.value.some((dir) => dir.name === name && dir !== dirRenameTarget.value)) {
      showMessage('目录名已存在');
      return;
    }
    saving.value = true;
    try {
      const saved = await saveProjectDir({
        id: dirModalMode.value === 'rename' ? dirRenameTarget.value?.id : undefined,
        pUid: dirModalMode.value === 'create' ? record.value.pUid : undefined,
        dirName: name,
      });
      if (dirModalMode.value === 'create') {
        dirs.value.push({ id: saved.id, name: saved.dirName, files: [] });
        showMessage('目录创建成功');
      } else if (dirRenameTarget.value) {
        dirRenameTarget.value.name = saved.dirName;
        showMessage('目录名已更新');
      }
      dirModalVisible.value = false;
    } catch (e) {
      showSaveError(e);
    } finally {
      saving.value = false;
    }
  }

  /** 删除目录：前端先拦（须无文件），后端再兜底校验 */
  function confirmRemoveDir(dir: ProjectFileDir) {
    if (dir.files.length) {
      showMessage('目录下存在文件，不能删除；请先清空目录内文件');
      return;
    }
    Modal.confirm({
      title: `确认删除目录「${dir.name}」？`,
      onOk: async () => {
        try {
          await deleteProjectDir(dir.id);
          dirs.value = dirs.value.filter((item) => item.id !== dir.id);
        } catch (e) {
          showSaveError(e);
        }
      },
    });
  }

  // ── 编辑文件名（重命名 → 清单整替） ─────────────────────────────────
  const renameModalVisible = ref(false);
  const renameName = ref('');
  const renameTarget = ref<ProjectFileItem | null>(null);
  /** 重命名目标所在目录（整替保存需要） */
  const renameDir = ref<ProjectFileDir | null>(null);

  function openRename(dir: ProjectFileDir, file: ProjectFileItem) {
    renameDir.value = dir;
    renameTarget.value = file;
    renameName.value = file.name;
    renameModalVisible.value = true;
  }

  async function handleRename() {
    const name = renameName.value.trim();
    if (!renameTarget.value || !renameDir.value) return;
    if (!name) {
      showMessage('请输入文件名');
      return;
    }
    saving.value = true;
    try {
      renameTarget.value.name = name;
      await saveProjectFiles(renameDir.value.id, renameDir.value.files);
      renameModalVisible.value = false;
    } catch (e) {
      showSaveError(e);
    } finally {
      saving.value = false;
    }
  }

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    record.value = { pUid: data?.pUid, projectName: data?.projectName };
    keyword.value = '';
    dirs.value = [];
    try {
      dirs.value = data?.pUid ? await fetchProjectFileList(data.pUid) : [];
    } catch (e) {
      showMessage((e as Error)?.message || '资料目录加载失败');
    }
    setDrawerProps({ loading: false });
  });
</script>
