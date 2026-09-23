<!--
  ifco —— 提示/督办下发表单抽屉（三模式，与入口数据 mode 区分）

  市级下发（默认）：标题 = 新增工作提示单/新增督办单（编辑待下发行=编辑督办单/
  编辑工作提示单）。下发编号系统生成恒只读，前缀按入口按钮区分：提示单=项目
  提示〔2026〕、督办单=项目督办〔2026〕。下发信息组：下发编号 / 巡查月份 /
  处理截止日期 / 联系人 / 联系电话。下发对象组（步骤引导）：第一步选择行政区；
  第二步选择片区（多选，片区条带 已选/总数 计数，勾选=全选其下项目，片区下
  项目恒展开可直接勾选）；项目勾选后下方出现「请描述具体问题：」输入框
  （随项目保存为该项目的具体问题，反选项目即清除）；更换行政区清空已勾选的
  片区、项目及具体问题。底部按钮：取消 / 提交（提交后 下发状态=待下发、
  处理状态=待下发，下发前可在列表无限编辑；下发动作在列表行按钮二次确认）。

  区级处理（mode=districtHandle，区级列表「去处理/查看」入口）：标题 =
  处理 · 下发编号；下发信息与下发对象整表只读，底部处理结果组全部可编辑：
  处理完成时间（可选）/ 处理情况说明（可选）/ 上传处理照片（不限数量、仅
  图片格式）/ 上传处理附件（不限格式，必填——提交拦截）。提交后处理状态转
  待确认，回到市级确认。

  市级确认（mode=urbanConfirm，市级列表待确认行「确认」入口）：标题 =
  确认 · 下发编号；下发内容与区级处理结果整表只读，底部市级确认组：确认
  结果（下拉：同意处理结果/不同意处理结果，必填）。提交后处理状态转已确认，
  流程办结。

  查看态（isView）= 整表只读仅关闭。当前后端尚未介入：保存直接改内存
  （api/ifco/impl-progress 的 SUPERVISES，刷新即恢复）；片区项目候选=实施库
  项目（接口失败回退内存假数据）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="50%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
    </template>

    <BasicForm @register="registerForm">
      <!-- 下发对象：第一步选行政区 → 第二步选片区/项目；勾选项目下填具体问题 -->
      <template #dispatchTarget>
        <div class="mb-4px text-13px text-#1677ff">第一步：选择行政区</div>
        <Select
          :value="district"
          :options="districtOptions"
          allow-clear
          :disabled="contentReadonly"
          placeholder="请选择行政区"
          class="w-full"
          @change="onDistrictChange"
        />
        <div class="mt-16px mb-4px text-13px text-#1677ff">第二步：选择片区（多选）</div>
        <template v-if="district">
          <div v-for="group in areaGroups" :key="group.area" class="mb-12px">
            <div class="flex items-center gap-8px rd-4px px-12px py-6px">
              <Checkbox
                :checked="areaState(group.projects).checked"
                :indeterminate="areaState(group.projects).indeterminate"
                :disabled="contentReadonly"
                @change="onAreaCheck(group, $event)"
              />
              <span class="font-600">{{ group.area }}</span>
              <span class="text-13px text-gray-400">({{ selectedCount(group) }}/{{ group.projects.length }})</span>
            </div>
            <!-- 片区下项目恒展开供直接勾选；项目勾选后下方出现具体问题输入框 -->
            <div v-for="name in group.projects" :key="name" class="mt-4px pl-24px">
              <Checkbox
                :checked="selectedProjectNames.includes(name)"
                :disabled="contentReadonly"
                @change="onProjectCheck(name, $event)"
              >
                <span class="text-13px">{{ name }}</span>
              </Checkbox>
              <div v-if="selectedProjectNames.includes(name)" class="mt-4px pl-28px">
                <TextArea
                  v-model:value="problemInputs[name]"
                  :rows="2"
                  :maxlength="500"
                  :disabled="contentReadonly"
                  placeholder="请描述具体问题："
                />
              </div>
            </div>
          </div>
          <div v-if="!areaGroups.length" class="text-13px text-gray-400">该行政区暂无片区和项目</div>
        </template>
        <div v-else class="text-13px text-gray-400">请先选择行政区</div>
      </template>

      <!-- 处理结果 · 上传处理照片（区级处理可编辑；不限数量、仅图片格式） -->
      <template #districtHandlePhotoList>
        <Upload
          v-if="isDistrictHandle && !isView"
          v-model:file-list="photoFiles"
          list-type="picture-card"
          multiple
          :before-upload="beforePhotoUpload"
          accept=".jpg,.jpeg,.png,.gif,.webp"
        >
          <span class="text-12px text-gray-500">上传照片</span>
        </Upload>
        <!-- 只读态（市级确认/查看）：只读照片清单 -->
        <div v-else class="flex flex-col gap-4px">
          <div v-for="file in photoFiles" :key="file.uid" class="flex items-center gap-6px text-14px text-gray-800">
            <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
            {{ file.name }}
          </div>
          <div v-if="!photoFiles.length" class="text-14px text-gray-400">未上传照片</div>
        </div>
      </template>

      <!-- 处理结果 · 上传处理附件（区级处理可编辑；不限格式，必填提交拦截） -->
      <template #districtHandleFileList>
        <Upload
          v-if="isDistrictHandle && !isView"
          v-model:file-list="attachFiles"
          multiple
          :before-upload="() => false"
        >
          <Button preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
        </Upload>
        <!-- 只读态（市级确认/查看）：只读附件清单 -->
        <div v-else class="flex flex-col gap-4px">
          <div v-for="file in attachFiles" :key="file.uid" class="flex items-center gap-6px text-14px text-gray-800">
            <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
            {{ file.name }}
          </div>
          <div v-if="!attachFiles.length" class="text-14px text-gray-400">未上传附件</div>
        </div>
      </template>
    </BasicForm>

    <!-- 底部按钮：各模式均为 取消/提交；查看=关闭 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <a-button v-if="!isView" type="primary" @click="handleSubmit"> 提交 </a-button>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressDispatchForm">
  import { computed, ref } from 'vue';
  import { Checkbox, Select, TextArea, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Button } from '@jeesite/core/components/Button';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { DISTRICTS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    SCHEDULES,
    SUPERVISES,
    fetchScheduleRows,
    nextDispatchNo,
    type ScheduleItem,
    type SuperviseItem,
    type SuperviseType,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isNew = ref(true);
  /** 单据类型（新增时由入口按钮带入：工具栏「新增工作提示单」/「新增督办单」，决定编号前缀与标题） */
  const presetType = ref<SuperviseType>('督办');
  const record = ref<Partial<SuperviseItem>>({});

  /** 抽屉模式：市级下发（默认）/ 区级处理 / 市级确认 */
  const mode = ref<'dispatch' | 'districtHandle' | 'urbanConfirm'>('dispatch');
  const isDistrictHandle = computed(() => mode.value === 'districtHandle');
  const isUrbanConfirm = computed(() => mode.value === 'urbanConfirm');
  const isView = ref(false);
  /** 下发信息/下发对象只读（区级处理、市级确认、查看态；各自的可填组不受影响） */
  const contentReadonly = computed(() => isDistrictHandle.value || isUrbanConfirm.value || isView.value);
  /** 处理结果组只读（市级确认、查看态；区级处理时可编辑） */
  const resultReadonly = computed(() => isUrbanConfirm.value || isView.value);

  const title = computed(() => {
    if (isDistrictHandle.value) return `处理 · ${record.value.dispatchNo ?? ''}`;
    if (isUrbanConfirm.value) return `确认 · ${record.value.dispatchNo ?? ''}`;
    if (isNew.value) return `新增${presetType.value === '督办' ? '督办单' : '工作提示单'}`;
    return `编辑${(record.value.superviseType ?? '督办') === '督办' ? '督办单' : '工作提示单'}`;
  });

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const URBAN_CONFIRM_OPTIONS = ['同意处理结果', '不同意处理结果'].map((name) => ({ label: name, value: name }));

  /** 片区/项目候选行（首次打开抽屉拉实施库项目，失败回退内存假数据；本实例内只拉一次） */
  const candidateRows = ref<ScheduleItem[]>(SCHEDULES);
  let candidateRowsLoaded = false;
  function loadCandidateRows() {
    if (candidateRowsLoaded) return;
    candidateRowsLoaded = true;
    fetchScheduleRows().then(
      (rows) => {
        candidateRows.value = rows;
      },
      () => {
        candidateRows.value = SCHEDULES;
      },
    );
  }

  /** 当前行政区（片区/项目候选按它过滤） */
  const district = ref<string>();
  /** 已勾选项目名（片区勾选=全选/清空其下项目） */
  const selectedProjectNames = ref<string[]>([]);
  /** 逐项目具体问题（勾选项目下方输入框；随项目保存） */
  const problemInputs = ref<Record<string, string>>({});

  /** 处理结果附件模型（上传控件不自动传；保存时收拢文件名写回行） */
  const photoFiles = ref<UploadFile[]>([]);
  const attachFiles = ref<UploadFile[]>([]);
  const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;

  /** 处理照片仅允许图片格式（非图片不入清单） */
  function beforePhotoUpload(file: any) {
    const isImage = IMAGE_RE.test(file.name);
    if (!isImage) showMessage('只允许上传图片格式文件');
    return isImage ? false : Upload.LIST_IGNORE;
  }

  /** 行政区 → 片区分组（每组=片区名+项目名清单；未匹配片区的项目归「其他」） */
  const areaGroups = computed(() => {
    if (!district.value) return [];
    const grouped = new Map<string, string[]>();
    for (const row of candidateRows.value) {
      if (row.district !== district.value) continue;
      const area = row.renewalAreaName || '其他';
      const names = grouped.get(area) ?? [];
      if (!names.includes(row.projectName)) names.push(row.projectName);
      grouped.set(area, names);
    }
    return [...grouped.entries()].map(([area, projects]) => ({ area, projects }));
  });

  function selectedCount(group: { area: string; projects: string[] }) {
    return group.projects.filter((name) => selectedProjectNames.value.includes(name)).length;
  }

  /** 片区勾选态（全选=勾、部分=半选） */
  function areaState(projects: string[]) {
    const count = projects.filter((name) => selectedProjectNames.value.includes(name)).length;
    return { checked: count > 0 && count === projects.length, indeterminate: count > 0 && count < projects.length };
  }

  function onAreaCheck(group: { area: string; projects: string[] }, e: any) {
    const checked = !!e.target.checked;
    const rest = selectedProjectNames.value.filter((name) => !group.projects.includes(name));
    if (checked) {
      selectedProjectNames.value = [...rest, ...group.projects];
    } else {
      selectedProjectNames.value = rest;
      // 反选片区：其下项目已填的具体问题一并清除
      for (const name of group.projects) delete problemInputs.value[name];
    }
  }

  function onProjectCheck(name: string, e: any) {
    const checked = !!e.target.checked;
    if (checked) {
      selectedProjectNames.value = [...selectedProjectNames.value, name];
    } else {
      selectedProjectNames.value = selectedProjectNames.value.filter((item) => item !== name);
      // 反选项目：已填的具体问题一并清除
      delete problemInputs.value[name];
    }
  }

  /** 更换行政区：清空已勾选的片区、项目及具体问题 */
  function onDistrictChange(value: any) {
    district.value = value;
    selectedProjectNames.value = [];
    problemInputs.value = {};
  }

  const schemas: FormSchema[] = [
    { label: '下发信息', field: 'dispatchGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '下发编号',
      field: 'dispatchNo',
      component: 'Input',
      dynamicDisabled: () => true,
      componentProps: { placeholder: '系统自动生成' },
    },
    {
      label: '巡查月份',
      field: 'inspectMonth',
      component: 'MonthPicker',
      dynamicDisabled: () => contentReadonly.value,
      componentProps: { valueFormat: 'YYYY-MM', style: 'width: 100%', placeholder: '请选择巡查月份' },
      rules: [{ required: true, message: '请选择巡查月份' }],
    },
    {
      label: '处理截止日期',
      field: 'deadline',
      component: 'DatePicker',
      dynamicDisabled: () => contentReadonly.value,
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择处理截止日期' },
      rules: [{ required: true, message: '请选择处理截止日期' }],
    },
    {
      label: '联系人',
      field: 'contactPerson',
      component: 'Input',
      dynamicDisabled: () => contentReadonly.value,
      componentProps: { maxlength: 20, placeholder: '请输入联系人' },
    },
    {
      label: '联系电话',
      field: 'contactPhone',
      component: 'Input',
      dynamicDisabled: () => contentReadonly.value,
      componentProps: { maxlength: 20, placeholder: '请输入联系电话' },
    },
    { label: '下发对象', field: 'targetGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '', field: 'dispatchTarget', component: 'Input', slot: 'dispatchTarget', colProps: { md: 24, lg: 24 } },
    // 处理结果组（区级处理可编辑、市级确认/查看只读；除附件必填外均可选）
    {
      label: '处理结果',
      field: 'resultGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
      ifShow: () => isDistrictHandle.value || isUrbanConfirm.value,
    },
    {
      label: '处理完成时间',
      field: 'districtHandleDate',
      component: 'DatePicker',
      dynamicDisabled: () => resultReadonly.value,
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择处理完成时间' },
      ifShow: () => isDistrictHandle.value || isUrbanConfirm.value,
    },
    {
      label: '处理情况说明',
      field: 'districtHandleDesc',
      component: 'InputTextArea',
      dynamicDisabled: () => resultReadonly.value,
      componentProps: { rows: 4, maxlength: 500, placeholder: '请输入处理情况说明' },
      colProps: { md: 24, lg: 24 },
      ifShow: () => isDistrictHandle.value || isUrbanConfirm.value,
    },
    {
      label: '上传处理照片',
      field: 'districtHandlePhotoList',
      component: 'Input',
      slot: 'districtHandlePhotoList',
      colProps: { md: 24, lg: 24 },
      ifShow: () => isDistrictHandle.value || isUrbanConfirm.value,
    },
    {
      label: '上传处理附件',
      field: 'districtHandleFileList',
      component: 'Input',
      slot: 'districtHandleFileList',
      colProps: { md: 24, lg: 24 },
      ifShow: () => isDistrictHandle.value || isUrbanConfirm.value,
      // 附件必填：插槽无表单值，校验器直查附件清单做提交拦截（仅区级处理模式校验）
      rules: [
        {
          required: true,
          message: '请上传处理附件',
          validator: () =>
            !isDistrictHandle.value || attachFiles.value.length
              ? Promise.resolve()
              : Promise.reject(new Error('请上传处理附件')),
        },
      ],
    },
    // 市级确认组（市级确认模式专属：确认结果必填）
    {
      label: '市级确认',
      field: 'confirmGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
      ifShow: () => isUrbanConfirm.value,
    },
    {
      label: '确认结果',
      field: 'urbanConfirmResult',
      component: 'Select',
      componentProps: { options: URBAN_CONFIRM_OPTIONS, placeholder: '请选择' },
      ifShow: () => isUrbanConfirm.value,
      rules: [{ required: true, message: '请选择确认结果' }],
    },
  ];

  const [registerForm, { setFieldsValue, validate, resetFields }] = useForm({
    labelWidth: 140,
    schemas,
    showActionButtonGroup: false,
  });

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isNew.value = !!data?.isNewRecord;
    presetType.value = (data?.superviseType as SuperviseType) ?? '督办';
    mode.value = data?.mode === 'districtHandle' || data?.mode === 'urbanConfirm' ? data.mode : 'dispatch';
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<SuperviseItem>;
    district.value = record.value.district ?? undefined;
    selectedProjectNames.value = (record.value.areaItems ?? []).flatMap((area) =>
      area.projects.map((project) => project.projectName),
    );
    problemInputs.value = Object.fromEntries(
      (record.value.areaItems ?? []).flatMap((area) =>
        area.projects.map((project) => [project.projectName, project.problem]),
      ),
    );
    photoFiles.value = (record.value.districtHandlePhotoList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    attachFiles.value = (record.value.districtHandleFileList ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
    }));
    await setFieldsValue({
      dispatchNo: isNew.value ? nextDispatchNo(presetType.value) : (record.value.dispatchNo ?? ''),
      inspectMonth: record.value.inspectMonth ?? undefined,
      deadline: record.value.deadline ?? undefined,
      contactPerson: record.value.contactPerson ?? '',
      contactPhone: record.value.contactPhone ?? '',
      districtHandleDate: record.value.districtHandleDate || undefined,
      districtHandleDesc: record.value.districtHandleDesc ?? '',
      urbanConfirmResult: record.value.urbanConfirmResult ?? undefined,
    });
    loadCandidateRows();
    setDrawerProps({ loading: false });
  });

  /** 已勾选项目按所属片区归组（未匹配到片区的项目归「其他」，具体问题取逐项目输入值） */
  function buildAreaItems() {
    const grouped = new Map<string, string[]>();
    for (const name of selectedProjectNames.value) {
      const area = candidateRows.value.find((row) => row.projectName === name)?.renewalAreaName || '其他';
      const names = grouped.get(area) ?? [];
      names.push(name);
      grouped.set(area, names);
    }
    return [...grouped.entries()].map(([area, names]) => ({
      area,
      projects: names.map((name) => ({
        projectName: name,
        problem: problemInputs.value[name] ?? '',
        foundProblem: '',
      })),
    }));
  }

  /** 提交：按模式路由（市级下发 / 区级处理 / 市级确认） */
  function handleSubmit() {
    if (isUrbanConfirm.value) return handleUrbanConfirmSubmit();
    if (isDistrictHandle.value) return handleDistrictSubmit();
    return handleSave();
  }

  /** 提交（市级新增/编辑待下发行）：状态=待下发（下发走列表行按钮二次确认）；新行 push、原位更新 */
  async function handleSave() {
    if (!district.value) {
      showMessage('请选择行政区');
      return;
    }
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const type: SuperviseType = isNew.value ? presetType.value : (record.value.superviseType ?? '督办');
    const item: SuperviseItem = {
      dispatchNo: isNew.value ? nextDispatchNo(type) : (record.value.dispatchNo as string),
      superviseType: type,
      district: district.value,
      dispatchStatus: '待下发',
      inspectMonth: String(values.inspectMonth ?? ''),
      dispatchDate: '',
      deadline: String(values.deadline ?? ''),
      dispatchOrg: '市住更局',
      problem: '',
      dispatchFile: type === '督办' ? '督办单.pdf' : '工作提示函.pdf',
      contactPerson: String(values.contactPerson ?? ''),
      contactPhone: String(values.contactPhone ?? ''),
      districtHandleStatus: '待下发',
      districtHandleDate: '',
      districtHandleDesc: '',
      districtHandleFileList: [],
      districtHandlePhotoList: [],
      areaItems: buildAreaItems(),
    };
    if (isNew.value) {
      SUPERVISES.push(item);
    } else {
      const index = SUPERVISES.findIndex((row) => row.dispatchNo === record.value.dispatchNo);
      if (index >= 0) SUPERVISES[index] = item;
    }
    showMessage('提交成功（待下发）');
    closeDrawer();
    emit('success', item);
  }

  /** 区级提交处理结果：原位更新内存行，处理状态转待确认（回到市级确认；附件必填经校验器拦截） */
  async function handleDistrictSubmit() {
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const target = SUPERVISES.find((item) => item.dispatchNo === record.value.dispatchNo);
    if (target) {
      target.districtHandleStatus = '待确认';
      target.districtHandleDate = String(values.districtHandleDate ?? '');
      target.districtHandleDesc = String(values.districtHandleDesc ?? '');
      target.districtHandleFileList = attachFiles.value.map((file) => file.name);
      target.districtHandlePhotoList = photoFiles.value.map((file) => file.name);
    }
    showMessage('提交成功，已进入市级确认流程');
    closeDrawer();
    emit('success', target);
  }

  /** 市级确认：确认结果必填，提交后处理状态转已确认，流程办结 */
  async function handleUrbanConfirmSubmit() {
    let values: Recordable;
    try {
      values = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    const target = SUPERVISES.find((item) => item.dispatchNo === record.value.dispatchNo);
    if (target) {
      target.districtHandleStatus = '已确认';
      target.urbanConfirmResult = String(values.urbanConfirmResult ?? '');
    }
    showMessage('确认完成，流程已办结');
    closeDrawer();
    emit('success', target);
  }
</script>
