<!--
  市住更局 —— 名城保护 · 优保建筑详情抽屉（在册列表/优保建筑管理共用）

  回显 + 修改抽屉：BasicForm 表单风格，分 tab 展示（对齐老系统详情页），底部 确定/取消：
   - 基本信息：所在行政区/建筑原名称/建筑现使用名称/建筑坐落/建成年份/建筑面积(平方米)/
     产权人/保护等级/公布批次/公布时间（与「修改优保建筑」字段一致，均可编辑）
   - 详细信息：区房管局监管负责人(监管楼长)*/责任工作部门*/部门负责人*/办公电话*/社区巡查责任人/
     联系电话/所在社区/志愿者(无字段占位)/志愿者联系电话(无字段占位)/遗迹等级/经度/纬度/建筑详情/
     基本信息*/中文介绍/英文介绍/上传图片(无字段占位)
   - 责任书：上传图片区域 + 上传文件按钮（三表无文件存储，占位提示待接入）
  保存走 excellent/save（带 id=修改，不动 STATUS、不动 SFSCZRZ；无字段占位项不下发），成功后 emit success 由列表刷新。
  打开时序：list.vue 用 openDrawer(false, { id }) 只传数据不掀开；
  本组件异步取数回填后末尾 setDrawerProps({ open: true }) 才掀开（防闪烁）。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    width="70%"
    force-render
    :showFooter="true"
    okText="确定"
    cancelText="取消"
    @register="registerDrawer"
    @ok="handleSubmit"
  >
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <!-- ATabs 仅作页签栏（空页签），表单在容器外 v-show 切换：
           保证三个 BasicForm 随抽屉 force-render 必然挂载，规避 Tabs 懒挂载导致表单实例未就绪 -->
      <ATabs v-model:activeKey="activeKey">
        <ATabPane key="basic" tab="基本信息" />
        <ATabPane key="detail" tab="详细信息" />
        <ATabPane key="letter" tab="责任书" />
      </ATabs>
      <div v-show="activeKey === 'basic'" class="pt-4">
        <BasicForm @register="registerBasicForm" />
      </div>
      <div v-show="activeKey === 'detail'">
        <BasicForm @register="registerDetailForm" />
      </div>
      <div v-show="activeKey === 'letter'" class="pt-4">
        <!-- 对齐老系统：上传图片区域 + 上传文件按钮；三表无文件存储，点击提示待接入 -->
        <div class="mb-2 font-bold text-green-600">上传图片</div>
        <div class="rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-gray-400">
          暂无责任书文件（文件存储待接入）
        </div>
        <a-button class="mt-3" type="primary" @click="handleUploadLetter()">上传文件</a-button>
      </div>
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedExcellentDetailDrawer">
  import { computed, ref, unref } from 'vue';
  import { Spin as ASpin, TabPane as ATabPane, Tabs as ATabs } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { fetchExcellentDetail, fetchExcellentDict, saveExcellent, ExcellentRow } from '@jeesite/urban-protection/api/urban-protection/excellent';
  import { batchLabel } from './excellent-format';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';

  const { meta } = unref(router.currentRoute);

  const emit = defineEmits(['success', 'register']);
  const { showMessage, createMessage } = useMessage();

  const loading = ref(false);
  const saving = ref(false);
  /** 当前编辑的建筑 id（保存时用） */
  const currentId = ref<string | undefined>();
  /** 当前页签 */
  const activeKey = ref('basic');

  const districtOptions = ref<{ label: string; value: string }[]>([]);
  const batchOptions = ref<{ label: string; value: string }[]>([]);
  fetchExcellentDict().then((dict) => {
    districtOptions.value = dict.districts.map((d) => ({ label: d, value: d }));
    batchOptions.value = dict.batches.map((b) => ({ label: batchLabel(String(b)), value: String(b) }));
  });

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:home-outlined',
    value: '优保建筑详情',
  }));

  /** 基本信息 tab（对齐老系统「修改优保建筑」字段与顺序） */
  const basicFormSchemas: FormSchema[] = [
    { label: '所在行政区', field: 'xzqName', component: 'Select', componentProps: { options: districtOptions, allowClear: true, showSearch: true, placeholder: '请选择' }, colProps: { md: 24, lg: 12 } },
    { label: '建筑原名称', field: 'jzOldName', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '建筑现使用名称', field: 'jzNowName', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '建筑坐落', field: 'jzLoccation', component: 'Input', colProps: { md: 24, lg: 24 } },
    { label: '建成年份', field: 'buildYear', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '建筑面积(平方米)', field: 'jzArar', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '产权人', field: 'cqr', component: 'Input', colProps: { md: 24, lg: 12 } },
    {
      label: '保护等级',
      field: 'protectLeve',
      component: 'Select',
      componentProps: {
        options: [
          { label: '一级', value: '1' },
          { label: '二级', value: '2' },
        ],
        allowClear: true,
      },
      colProps: { md: 24, lg: 12 },
    },
    { label: '公布批次', field: 'publishPc', component: 'Select', componentProps: { options: batchOptions, allowClear: true, placeholder: '请选择' }, colProps: { md: 24, lg: 12 } },
    { label: '公布时间', field: 'publishTime', component: 'Input', colProps: { md: 24, lg: 12 } },
  ];

  /** 详细信息 tab（对齐老系统「详细信息」） */
  const detailFormSchemas: FormSchema[] = [
    {
      label: '区房管局监管负责人(监管楼长)',
      field: 'jgFzr',
      component: 'Input',
      rules: [{ required: true, message: '请输入区房管局监管负责人' }],
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '区房管局责任工作部门',
      field: 'zrGzBm',
      component: 'Input',
      rules: [{ required: true, message: '请输入区房管局责任工作部门' }],
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '区房管局责任工作部门负责人',
      field: 'zrGzBmFzr',
      component: 'Input',
      rules: [{ required: true, message: '请输入部门负责人' }],
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '区房管局责任工作部门办公电话',
      field: 'zrGzBmTel',
      component: 'Input',
      rules: [{ required: true, message: '请输入部门办公电话' }],
      colProps: { md: 24, lg: 12 },
    },
    { label: '社区巡查责任人', field: 'sqXcFzr', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '社区巡查责任人联系电话', field: 'sqXcFzrTel', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '所在社区', field: 'szSq', component: 'Input', colProps: { md: 24, lg: 12 } },
    // 志愿者/志愿者联系电话/上传图片：三表无对应字段，以禁用输入占位，保存时不下发
    {
      label: '志愿者',
      field: 'zyzPlaceholder',
      component: 'Input',
      componentProps: { disabled: true, placeholder: '—' },
      colProps: { md: 24, lg: 12 },
    },
    {
      label: '志愿者联系电话',
      field: 'zyzTelPlaceholder',
      component: 'Input',
      componentProps: { disabled: true, placeholder: '—' },
      colProps: { md: 24, lg: 12 },
    },
    { label: '遗迹等级', field: 'relicLevel', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '经度', field: 'locationY', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '纬度', field: 'locationX', component: 'Input', colProps: { md: 24, lg: 12 } },
    { label: '建筑详情', field: 'buildingDet', component: 'Input', colProps: { md: 24, lg: 12 } },
    {
      label: '基本信息',
      field: 'jbxx',
      component: 'InputTextArea',
      componentProps: { rows: 4 },
      rules: [{ required: true, message: '请输入基本信息' }],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '中文介绍',
      field: 'js',
      component: 'InputTextArea',
      componentProps: { rows: 6 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '英文介绍',
      field: 'englishIntr',
      component: 'InputTextArea',
      componentProps: { rows: 6 },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '上传图片',
      field: 'photoPlaceholder',
      component: 'Input',
      componentProps: { disabled: true, placeholder: '上传图片待文件存储接入' },
      colProps: { md: 24, lg: 12 },
    },
  ];

  // 隐藏表单自带操作按钮（抽屉底部统一 确定/取消）
  const formBaseConfig = {
    labelWidth: 140,
    baseColProps: { md: 24, lg: 12 },
    showActionButtonGroup: false,
  };

  const [registerBasicForm, { resetFields: resetBasic, setFieldsValue: setBasic, validate: validateBasic }] = useForm({
    ...formBaseConfig,
    schemas: basicFormSchemas,
  });
  const [registerDetailForm, { resetFields: resetDetail, setFieldsValue: setDetail, validate: validateDetail }] = useForm({
    ...formBaseConfig,
    // 区房管局…类长标签，加宽 label
    labelWidth: 200,
    schemas: detailFormSchemas,
  });

  const [registerDrawer, { setDrawerProps }] = useDrawerInner(async (data: Recordable) => {
    // 先回填后掀开：动画期间零翻转
    const id = String(data.id);
    currentId.value = id;
    setDrawerProps({ open: false });
    loading.value = true;
    await Promise.all([resetBasic(), resetDetail()]);
    try {
      const row: ExcellentRow = await fetchExcellentDetail(id);
      await Promise.all([
        setBasic({
          jzOldName: row.jzOldName || '',
          jzNowName: row.jzNowName || '',
          jzLoccation: row.jzLoccation || '',
          buildYear: row.buildYear || '',
          jzArar: row.jzArar || '',
          cqr: row.cqr || '',
          protectLeve: row.protectLeve || undefined,
          publishPc: row.publishPc || undefined,
          publishTime: row.publishTime || '',
          xzqName: row.xzqName || '',
        }),
        setDetail({
          jgFzr: row.jgFzr || '',
          zrGzBm: row.zrGzBm || '',
          zrGzBmFzr: row.zrGzBmFzr || '',
          zrGzBmTel: row.zrGzBmTel || '',
          sqXcFzr: row.sqXcFzr || '',
          sqXcFzrTel: row.sqXcFzrTel || '',
          szSq: row.szSq || '',
          relicLevel: row.relicLevel || '',
          locationY: row.locationY || '',
          locationX: row.locationX || '',
          buildingDet: row.buildingDet || '',
          jbxx: row.jbxx || '',
          js: row.js || '',
          englishIntr: row.englishIntr || '',
        }),
      ]);
    } finally {
      loading.value = false;
      // 回填完成后才掀开抽屉
      setDrawerProps({ open: true });
    }
  });

  /** 上传责任书文件：三表无文件存储，待接入 */
  function handleUploadLetter() {
    createMessage.info('责任书文件上传待文件存储接入');
  }

  /** 确定：三个 tab 表单合并校验后保存（巡查记录数不下发，STATUS/SFSCZRZ 不动） */
  async function handleSubmit() {
    try {
      if (saving.value) return;
      saving.value = true;
      setDrawerProps({ confirmLoading: true });
      const [basicValues, detailValues] = await Promise.all([validateBasic(), validateDetail()]);
      const b = basicValues as Recordable;
      const d = detailValues as Recordable;
      await saveExcellent({
        // 基本信息
        xzqName: b.xzqName,
        jzOldName: b.jzOldName,
        jzNowName: b.jzNowName,
        jzLoccation: b.jzLoccation,
        buildYear: b.buildYear,
        jzArar: b.jzArar,
        cqr: b.cqr,
        protectLeve: b.protectLeve,
        publishPc: b.publishPc,
        publishTime: b.publishTime,
        // 详细信息（志愿者/上传图片等无字段占位项不下发）
        jgFzr: d.jgFzr,
        zrGzBm: d.zrGzBm,
        zrGzBmFzr: d.zrGzBmFzr,
        zrGzBmTel: d.zrGzBmTel,
        sqXcFzr: d.sqXcFzr,
        sqXcFzrTel: d.sqXcFzrTel,
        szSq: d.szSq,
        relicLevel: d.relicLevel,
        locationX: d.locationX,
        locationY: d.locationY,
        buildingDet: d.buildingDet,
        jbxx: d.jbxx,
        js: d.js,
        englishIntr: d.englishIntr,
        id: currentId.value,
        // 不动 STATUS：拟优保行保存后仍为拟优保
      } as Partial<ExcellentRow> & { status?: string });
      showMessage('保存成功');
      setDrawerProps({ open: false });
      emit('success');
    } catch (e) {
      if (e instanceof Error && e.message) {
        showMessage(e.message, 'error');
      }
    } finally {
      saving.value = false;
      setDrawerProps({ confirmLoading: false });
    }
  }

</script>
