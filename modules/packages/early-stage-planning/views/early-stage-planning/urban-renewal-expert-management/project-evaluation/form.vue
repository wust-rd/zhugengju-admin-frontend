<!--
  市住更局 —— 城市更新专家管理 · 新增/编辑 评估项目（独立路由页，tab 保活，已接后端）

  项目评估列表「新增项目 / 编辑」进入的整页表单：项目基本信息 + 评估材料 + 参与专家。
  参与专家：默认 3 行可加行（3~7），专家名称输入远程搜索（须为专家库内专家，选中后单位/联系方式自动带出；
  输入未匹配到时提示「未查到专家信息」；库外专家须先在个人档案入库）；再从已选专家中指定组长。
  「去抽取」需先填项目名称/统筹主体/实施主体（缺项弹出提示），跳在线抽取挑选，返回带回专家回填。
  规划路由（RESTful，后端隐藏菜单）：
   - 链接地址（新增）：/early-stage-planning/urban-renewal-expert-management/project-evaluation/form
   - 编辑带参：.../project-evaluation/form?id={项目id}
  底部右侧：取消 / 暂存（待提交）/ 提交（评估中；先暂存拿 id 再 submit）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <div class="text-20px font-600 text-gray-900">{{ getTitle }}</div>

    <!-- 项目基本信息 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="text-16px font-600 text-gray-800">项目基本信息</div>
      <div class="mt-16px grid grid-cols-2 gap-x-32px gap-y-16px">
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">项目名称 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.name" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">行政区 <span class="text-red-500">*</span></span>
          <Select v-model:value="form.adminDistrict" :options="districtOptions" placeholder="请选择" allowClear />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">片区名称 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.district" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">统筹主体 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.coordinator" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">实施主体 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.implementOrg" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">评估模式 <span class="text-red-500">*</span></span>
          <Select v-model:value="form.reviewMode" :options="modeOptions" placeholder="请选择" allowClear />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">责任部门 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.dept" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">资金来源</span>
          <Input v-model:value="form.fundSource" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">项目投资估算（亿元）</span>
          <Input v-model:value="form.investment" placeholder="请输入" :maxlength="50" />
        </div>
        <div class="col-span-2 flex flex-col gap-4px">
          <span class="text-13px text-gray-600">主要项目内容 <span class="text-red-500">*</span></span>
          <Input.TextArea
            v-model:value="form.content"
            :rows="5"
            :maxlength="500"
            placeholder="不超过500字"
            show-count
          />
        </div>
      </div>
    </div>

    <!-- 评估材料 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="text-16px font-600 text-gray-800">评估材料 <span class="text-red-500">*</span></div>
      <Upload
        class="mt-16px"
        :show-upload-list="false"
        :before-upload="handleBeforeUpload"
        multiple
        accept=".pdf,.doc,.docx"
      >
        <div class="upload-zone">
          <span class="i-ant-design:cloud-upload-outlined text-30px text-[#3A8EF6]"></span>
          <div class="mt-8px text-14px text-gray-600">点击或拖拽文件到此处上传</div>
          <div class="mt-4px text-12px text-gray-400">支持 PDF、doc/docx 格式，可多选</div>
        </div>
      </Upload>
      <EspFileList v-model:value="form.materials" :uploadable="false" class="mt-12px" empty-text="尚未上传评估材料" />
    </div>

    <!-- 参与专家 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="flex items-center justify-between">
        <div class="text-16px font-600 text-gray-800">参与专家 <span class="text-red-500">*</span></div>
        <a-button type="primary" @click="goPick">
          <span class="inline-flex items-center gap-4px">
            <span class="i-ant-design:swap-outlined"></span> 去抽取
          </span>
        </a-button>
      </div>
      <div class="mt-16px space-y-12px">
        <div v-for="(row, index) in rows" :key="index" class="flex items-center gap-16px">
          <span class="w-70px shrink-0 text-14px text-gray-600">专家{{ index + 1 }}:</span>
          <AutoComplete
            v-model:value="row.name"
            :options="rowOptions[index]"
            class="flex-1"
            placeholder="输入专家姓名搜索选择"
            @search="(text: string) => onSearchExpert(text, index)"
            @select="(value: any, option: any) => onSelectExpert(option, index)"
            @blur="() => onBlurExpert(index)"
          />
          <Input v-model:value="row.org" class="flex-1" placeholder="选择专家后自动填充" readonly />
          <Input v-model:value="row.phone" class="flex-1" placeholder="选择专家后自动填充" readonly />
          <span
            v-if="rows.length > 3"
            class="flex h-22px w-22px shrink-0 items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="removeRow(index)"
          >
            <span class="i-ant-design:close-outlined"></span>
          </span>
        </div>

        <div class="flex items-center gap-16px">
          <span class="w-70px shrink-0 text-14px text-gray-600">选择组长:</span>
          <Select v-model:value="leaderId" :options="LEADER_OPTIONS" class="w-280px" placeholder="请选择" allowClear />
          <a-button v-if="rows.length < 7" type="dashed" class="ml-auto" @click="addRow">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:plus-outlined"></span> 添加专家
            </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="flex justify-end gap-12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button :loading="saving" @click="handleDraft">暂存</a-button>
      <Popconfirm title="是否确认提交该项目？" ok-text="确定" cancel-text="取消" @confirm="handleSubmit">
        <a-button type="primary" :loading="saving">提交</a-button>
      </Popconfirm>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluationForm">
  import { computed, onMounted, reactive, ref, unref, watch } from 'vue';
  import { AutoComplete, Input, Popconfirm, Select, Upload, message } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { areaTreeData } from '@jeesite/core/api/sys/area';
  import { ureDictOptions, ureExpertPage } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import type { UreExpert } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import { ureProjectForm, ureProjectSave, ureProjectSubmit } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import type { UreFile } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import { espFileUpload } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import EspFileList from '../../components/esp-file-list.vue';
  import type { PickedExpert } from '../expert-store';
  import { useUrbanExpertStore } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';
  const ONLINE_DRAW_ROUTE = '/early-stage-planning/urban-renewal-expert-management/online-draw/index';
  const FORM_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/form';

  const { query } = unref(router.currentRoute);
  const editId = String(query.id ?? '') || '';
  const getTitle = computed(() => (editId ? '编辑评估项目' : '新增评估项目'));

  /** 字典选项（行政区=框架区划接口武汉下辖区；评审模式=ure 字典） */
  const districtOptions = ref<{ label: string; value: string }[]>([]);
  const modeOptions = ref<{ label: string; value: string }[]>([]);

  /** 表单 */
  const form = reactive({
    name: '',
    adminDistrict: undefined as string | undefined,
    district: '',
    coordinator: '',
    implementOrg: '',
    reviewMode: undefined as string | undefined,
    dept: '',
    fundSource: '',
    investment: '',
    content: '',
    materials: [] as (UreFile & { uploading?: boolean })[],
  });

  /** 参与专家行（3~7 人；expertId 为专家库主键，选中后带出单位/联系方式） */
  type ExpertRow = { id: string; name: string; org: string; phone: string };
  const rows = reactive<ExpertRow[]>([]);
  const leaderId = ref<string | undefined>(undefined);

  function emptyRow(): ExpertRow {
    return { id: '', name: '', org: '', phone: '' };
  }
  function seedRows() {
    rows.splice(0, rows.length, emptyRow(), emptyRow(), emptyRow());
  }
  seedRows();

  // ── 编辑回显 ─────────────────────────────────────────────────────

  onMounted(async () => {
    // 行政区：框架行政区划接口（武汉市 420100 下辖 13 区）；评审模式：ure 字典
    try {
      const tree = await areaTreeData({ parentCode: '420100' });
      districtOptions.value = (tree ?? []).map((n) => ({ label: String(n.name ?? ''), value: String(n.name ?? '') }));
    } catch (e) {
      // 区划加载失败时下拉为空，不阻塞表单
    }
    try {
      const dict = await ureDictOptions();
      modeOptions.value = (dict.reviewModes ?? []).map((m) => ({ label: m, value: m }));
    } catch (e) {
      // 字典加载失败不阻塞表单
    }
    if (editId) {
      try {
        const detail = await ureProjectForm(editId);
        Object.assign(form, {
          name: detail.name ?? '',
          adminDistrict: detail.adminDistrict,
          district: detail.district ?? '',
          coordinator: detail.coordinator ?? '',
          implementOrg: detail.implementOrg ?? '',
          reviewMode: detail.reviewMode,
          dept: detail.dept ?? '',
          fundSource: detail.fundSource ?? '',
          investment: detail.investment ?? '',
          content: detail.content ?? '',
          materials: [...(detail.materials ?? [])],
        });
        const next: ExpertRow[] = (detail.experts ?? []).slice(0, 7).map((e) => ({
          id: e.id,
          name: e.name,
          org: e.org ?? '',
          phone: e.phone ?? '',
        }));
        while (next.length < 3) next.push(emptyRow());
        rows.splice(0, rows.length, ...next);
        leaderId.value = detail.leaderId || undefined;
      } catch (e) {
        showMessage((e as Error)?.message || '项目加载失败');
      }
    }
    // 去抽取返回：恢复出发前保存的表单草稿（表单字段+组长；参与专家行以带回的抽取结果优先）
    if (store.pickDraft && store.pickDraft.editId === editId) {
      Object.assign(form, store.pickDraft.form);
      if (store.pickDraft.leaderId) {
        leaderId.value = store.pickDraft.leaderId;
      }
      store.clearPickDraft();
    }
    // 消费在线抽取带回的专家（须在编辑回显之后，带回结果优先覆盖参与专家行）
    if (store.pickedExperts.length) {
      fillPicked(store.pickedExperts);
      store.endPick();
      store.setPickedExperts([]);
    }
  });

  // ── 专家远程搜索（AutoComplete） ────────────────────────────────

  /** 每行的候选选项（value=姓名，label=姓名+单位） */
  const rowOptions = ref<{ value: string; label: string; expert: UreExpert }[][]>([]);
  /** 每行防抖句柄 */
  const searchTimers: (ReturnType<typeof setTimeout> | null)[] = [];

  function onSearchExpert(text: string, index: number) {
    if (searchTimers[index]) clearTimeout(searchTimers[index]);
    searchTimers[index] = setTimeout(() => searchExperts(text.trim(), index), 300);
  }

  async function searchExperts(kw: string, index: number) {
    try {
      const page = await ureExpertPage({ name: kw || undefined, pageNo: 1, pageSize: 10 });
      rowOptions.value[index] = page.list.map((e) => ({
        value: e.name,
        label: `${e.name}（${e.org ?? ''}）`,
        expert: e,
      }));
    } catch (e) {
      rowOptions.value[index] = [];
    }
  }

  /** 选中选项：锁定专家主键并带出单位/联系方式 */
  function onSelectExpert(option: Recordable, index: number) {
    const expert = option?.expert as UreExpert | undefined;
    if (!expert) return;
    rows[index] = { id: expert.id, name: expert.name, org: expert.org ?? '', phone: expert.phone ?? '' };
    if (rowOptions.value[index]) {
      // 选中后清空该行候选，避免同名干扰下一行
      rowOptions.value[index] = [];
    }
  }

  /** 失焦校验：有输入但未从库内选中 → 提示未查到（可从当前候选中精确匹配自动选中） */
  function onBlurExpert(index: number) {
    const row = rows[index];
    const name = String(row.name ?? '').trim();
    if (!name) {
      row.id = '';
      row.org = '';
      row.phone = '';
      return;
    }
    if (row.id && row.name === name) return; // 已选中且未被改动
    const exact = (rowOptions.value[index] ?? []).find((o) => o.expert.name === name);
    if (exact) {
      onSelectExpert({ expert: exact.expert }, index);
      return;
    }
    message.warning('未查到专家信息，请从下拉中选择专家库内专家；库外专家请先在「个人档案」中入库');
    rows[index] = emptyRow();
  }

  function addRow() {
    if (rows.length < 7) rows.push(emptyRow());
  }
  function removeRow(index: number) {
    if (rows.length > 3) {
      const removed = rows[index];
      rows.splice(index, 1);
      rowOptions.value.splice(index, 1);
      if (removed && leaderId.value === removed.id) leaderId.value = undefined;
    }
  }

  /** 组长下拉选项：已选中的专家行 */
  const LEADER_OPTIONS = computed(() =>
    rows.filter((r) => r.id).map((r) => ({ label: r.name, value: r.id })),
  );

  /** 把在线抽取挑好的专家回填成 3~7 行 */
  function fillPicked(picked: PickedExpert[]) {
    const next: ExpertRow[] = picked.slice(0, 7).map((p) => ({
      id: p.id,
      name: p.name,
      org: p.org,
      phone: p.phone,
    }));
    while (next.length < 3) next.push(emptyRow());
    rows.splice(0, rows.length, ...next);
  }

  /** 去抽取：需先填项目名称/统筹主体/实施主体（缺项弹出提示），保存表单草稿后带三项进入在线抽取页 */
  function goPick() {
    if (!form.name?.trim()) {
      showMessage('请先填写项目名称');
      return;
    }
    if (!form.coordinator?.trim()) {
      showMessage('请先填写统筹主体');
      return;
    }
    if (!form.implementOrg?.trim()) {
      showMessage('请先填写实施主体');
      return;
    }
    // 保存草稿快照（返回本页时恢复，避免已填内容丢失）
    store.setPickDraft({
      editId,
      form: {
        name: form.name,
        adminDistrict: form.adminDistrict,
        district: form.district,
        coordinator: form.coordinator,
        implementOrg: form.implementOrg,
        reviewMode: form.reviewMode,
        dept: form.dept,
        fundSource: form.fundSource,
        investment: form.investment,
        content: form.content,
        materials: form.materials.filter((m) => !m.uploading).map(({ uploading: _u, ...rest }) => rest),
      },
      leaderId: leaderId.value,
    });
    store.beginPick(`${FORM_ROUTE}${editId ? `?id=${editId}` : ''}`, {
      name: form.name,
      coordinator: form.coordinator,
      implementOrg: form.implementOrg,
    });
    // 路由未注册（当前账号未授权「在线抽取」菜单）时明确提示，避免静默无反应
    if (!router.resolve(ONLINE_DRAW_ROUTE).matched.length) {
      showMessage('在线抽取页面不可用：当前账号未授权「在线抽取」菜单，请联系管理员配置');
      return;
    }
    go(ONLINE_DRAW_ROUTE);
  }

  /** 在线抽取「返回」带回专家（页面被 keep-alive 缓存不重建时由此消费；重建场景在 onMounted 编辑回显后消费） */
  watch(
    () => store.pickedExperts,
    (list) => {
      if (list.length) {
        fillPicked(list);
        store.endPick();
        store.setPickedExperts([]);
      }
    },
  );

  /** 上传：走真实上传接口（/a/esp/file/upload，MinIO 永久直链），完成后回填文件对象；
   *  列表渲染/预览下载/删除由 EspFileList 公用组件负责 */
  async function handleBeforeUpload(file: File) {
    const entry = reactive<UreFile & { uploading?: boolean }>({ name: file.name, uploading: true });
    form.materials.push(entry);
    try {
      const uploaded = await espFileUpload(file);
      Object.assign(entry, uploaded, { uploading: false });
    } catch (e) {
      form.materials.splice(form.materials.indexOf(entry), 1);
      message.error(`「${file.name}」上传失败：${(e as Error)?.message || '请重试'}`);
    }
    return false;
  }

  /** 已选专家（有主键的行） */
  const pickedRows = computed(() => rows.filter((r) => r.id));

  /** 提交前校验：除资金来源/项目投资估算外都必填（与后端 submit 强校验一致，本地提前拦截） */
  function validateRequired(): boolean {
    const missing: string[] = [];
    const checks: [unknown, string][] = [
      [form.name, '项目名称'],
      [form.adminDistrict, '行政区'],
      [form.district, '片区名称'],
      [form.coordinator, '统筹主体'],
      [form.implementOrg, '实施主体'],
      [form.reviewMode, '评估模式'],
      [form.dept, '责任部门'],
      [form.content, '主要项目内容'],
    ];
    for (const [val, label] of checks) {
      if (!val) missing.push(label);
    }
    if (form.materials.length === 0 || form.materials.some((m) => m.uploading)) missing.push('评估材料');
    if (pickedRows.value.length < 3) missing.push('至少 3 名参与专家');
    if (!leaderId.value) missing.push('组长');
    if (missing.length) {
      showMessage(`请先填写：${missing.join('、')}`);
      return false;
    }
    return true;
  }

  /** 保存（暂存/提交共用）：提交时先暂存拿 id 再 submit */
  const saving = ref(false);

  async function save(submit: boolean) {
    saving.value = true;
    try {
      const res = await ureProjectSave({
        id: editId || undefined,
        name: form.name,
        adminDistrict: form.adminDistrict,
        district: form.district,
        coordinator: form.coordinator,
        implementOrg: form.implementOrg,
        reviewMode: form.reviewMode,
        dept: form.dept,
        fundSource: form.fundSource,
        investment: form.investment,
        content: form.content,
        materials: form.materials
          .filter((m) => !m.uploading)
          .map(({ uploading: _u, ...rest }) => rest),
        expertIds: pickedRows.value.map((r) => r.id),
        leaderId: leaderId.value,
      });
      store.clearPickDraft();
      if (submit) {
        await ureProjectSubmit(res.id);
        showMessage('提交成功，项目进入评估中');
      } else {
        showMessage('暂存成功');
      }
      go(LIST_ROUTE);
    } finally {
      saving.value = false;
    }
  }

  function handleCancel() {
    go(LIST_ROUTE);
  }
  async function handleDraft() {
    // 暂存宽松：只需项目名称且无上传中的材料，其余可后续补填
    if (!form.name) {
      showMessage('请输入项目名称');
      return;
    }
    if (form.materials.some((m) => m.uploading)) {
      showMessage('评估材料正在上传，请稍候');
      return;
    }
    await save(false);
  }
  async function handleSubmit() {
    // 参与专家必须都从库内选中（未选中的行在失焦时已清空并提示）
    if (rows.some((r) => r.name && !r.id)) {
      showMessage('存在未从专家库选中的专家行，请先修正');
      return;
    }
    if (!validateRequired()) return;
    await save(true);
  }
</script>

<style scoped>
  :deep(.ant-upload) {
    display: block;
    width: 100%;
  }
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 28px 16px;
    border: 1px dashed #c9d4e3;
    border-radius: 8px;
    background: #fafcff;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .upload-zone:hover {
    border-color: #3a8ef6;
    background: #f0f6ff;
  }
</style>
