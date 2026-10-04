<!--
  市住更局 —— 指标项结果 编辑/查看 表单抽屉

  接口已接入：indicatorResultInfo（详情含资料清单结果快照 + 附件）→
  indicatorResultSave（数值/文字双轨，预警状态按评估结果自动计算）→
  materialResultSaveList（资料清单对应结果整单替换）。
  口径（US-4.3 原型图5）：头部为指标项只读信息（维度/序号/单位/来源/责任部门/指标解释，
  维度与数据来源由表2 联表补齐）；可编辑仅 指标值/标准值目标值/评估结果/附件/资料结果值/结果分析；
  预警状态只读（保存后端自动分级）；已提交行(submitStatus=1)整卡只读。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="780px" @register="registerDrawer" @ok="handleSubmit">
    <template #title>
      <Icon :icon="getTitle.icon" class="m-1 pr-1" />
      <span> {{ getTitle.value }} </span>
    </template>

    <a-spin :spinning="loading">
      <!-- 指标项只读信息（对齐原型：一/二/三级维度、序号、单位、来源、责任部门、指标解释） -->
      <div class="mb-2 grid grid-cols-2 gap-x-8 gap-y-2 rounded bg-gray-50 p-3 text-sm">
        <div><span class="mr-2 text-gray-400">一级维度：</span>{{ detail?.dim1 || '——' }}</div>
        <div><span class="mr-2 text-gray-400">二级维度：</span>{{ detail?.dim2 || '——' }}</div>
        <div><span class="mr-2 text-gray-400">三级维度：</span>{{ detail?.dim3 || '——' }}</div>
        <div><span class="mr-2 text-gray-400">序号：</span>{{ detail?.code ?? '——' }}</div>
        <div><span class="mr-2 text-gray-400">指标单位：</span>{{ detail?.unit || '——' }}</div>
        <div><span class="mr-2 text-gray-400">数据来源：</span>{{ detail?.dataSource || '——' }}</div>
        <div class="col-span-2"><span class="mr-2 text-gray-400">指标项名称：</span>{{ detail?.indicatorName || '——' }}</div>
        <div class="col-span-2">
          <div class="mb-1 text-gray-400">指标解释：</div>
          <div>{{ detail?.itemExplain || '——' }}</div>
        </div>
      </div>

      <BasicForm @register="registerForm" />

      <!-- 附件上传（shp 图层 / 数据统计表 / 城市横向对标数据表） -->
      <div class="mb-2">
        <div class="mb-2 text-base font-medium">附件上传</div>
        <div class="space-y-3">
          <div v-for="slot in attSlots" :key="slot.key" class="flex items-center">
            <div class="w-44 shrink-0 text-right">
              <span class="mr-2">{{ slot.label }}</span>
              <Upload
                v-if="!readonly"
                :accept="slot.accept"
                :show-upload-list="false"
                :before-upload="(file: File) => handleUpload(slot.key, file, slot.bizType)"
              >
                <a-button size="small" :loading="uploadingKey === slot.key">上传</a-button>
              </Upload>
            </div>
            <div class="ml-3 flex min-w-0 flex-1 items-center">
              <template v-if="attModel[slot.key]">
                <Icon icon="ant-design:paper-clip-outlined" class="mr-1 shrink-0" />
                <a class="truncate" :title="attModel[slot.key]!.name" @click="handleDownload(slot.key)">
                  {{ attModel[slot.key]!.name }}
                </a>
                <a-button
                  v-if="!readonly"
                  type="link"
                  size="small"
                  danger
                  @click="attModel[slot.key] = undefined"
                >
                  删除
                </a-button>
              </template>
              <span v-else class="text-gray-400">{{ slot.hint }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 资料清单对应情况（表7：资料名只读 + 对应结果值） -->
      <div v-if="materialRows.length" class="mb-2">
        <div class="mb-2 text-base font-medium">资料清单对应情况</div>
        <div v-for="(row, idx) in materialRows" :key="row.id ?? idx" class="mb-2 flex items-start">
          <div class="w-44 shrink-0 text-right align-middle">
            <span class="mr-2" :title="row.materialName">{{ row.materialName }}</span>
          </div>
          <div class="ml-3 flex-1">
            <span class="mr-2 text-gray-400">对应结果值：</span>
            <InputNumber
              v-model:value="row.resultValue"
              :disabled="readonly"
              :maxlength="16"
              style="width: 200px"
            />
          </div>
        </div>
      </div>
    </a-spin>
  </BasicDrawer>
</template>
<script lang="ts" setup name="UhcSharedIndicatorResultIdForm">
  import { computed, reactive, ref, unref } from 'vue';
  import type { PropType } from 'vue';
  import { InputNumber, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import { EVAL_RESULT } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import type { AttFile, IndicatorResultDetail, MaterialResultRow } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import {
    indicatorResultInfo,
    indicatorResultSave,
    materialResultSaveList,
    checkFileUpload,
    checkFileDownload,
    displayValue,
  } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';

  const props = defineProps({
    /** 表2 指标项联表映射（item_no → 指标项）：补维度/数据来源只读信息 */
    itemsMap: { type: Object as PropType<Map<number, Indicator>>, required: true },
  });

  const emit = defineEmits(['success', 'register']);

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);

  const EVAL_RESULT_OPTIONS = Object.values(EVAL_RESULT).map((item) => ({ label: item, value: item }));

  const loading = ref(false);
  const isView = ref(false);
  const detail = ref<IndicatorResultDetail>();

  /** 已提交行后端拒绝保存 → 整卡只读（查看态） */
  const readonly = computed(() => isView.value || detail.value?.submitStatus === 1);

  const getTitle = computed(() => ({
    icon: meta.icon || 'ant-design:book-outlined',
    value: readonly.value
      ? `查看 · ${detail.value?.indicatorName ?? ''}`
      : `编辑 · ${detail.value?.indicatorName ?? ''}`,
  }));

  const inputFormSchemas: FormSchema[] = [
    {
      label: '指标值',
      field: 'indicatorValueInput',
      component: 'Input',
      componentProps: { maxlength: 200, placeholder: '指标结果值' },
      rules: [{ required: true, message: '请输入指标值' }],
    },
    {
      label: '标准值/目标值',
      field: 'standardValueInput',
      component: 'Input',
      componentProps: { maxlength: 200 },
      helpMessage: '无标准的指标可留空，评估为「无标准」',
    },
    {
      label: '评估结果',
      field: 'evaluateResult',
      component: 'Select',
      componentProps: { options: EVAL_RESULT_OPTIONS, allowClear: true },
      rules: [{ required: true, message: '请选择评估结果' }],
    },
    {
      label: '预警状态',
      field: 'warningStatus',
      component: 'Input',
      dynamicDisabled: true,
      helpMessage: '保存时按评估结果自动分级：不足→红色预警；一般/无标准→黄色预警；很好/较好→正常',
    },
    {
      label: '指标结果分析',
      field: 'resultAnalysis',
      component: 'InputTextArea',
      componentProps: { maxlength: 255, rows: 3, placeholder: '请输入指标结果分析描述' },
      colProps: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 140,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 },
  });

  /** 附件位定义（key 对应保存契约 layerShpFile/dataStatFile/benchmarkFile） */
  const attSlots = [
    { key: 'shpAtt', label: '上传图层shp文件', hint: '支持 .shp 文件上传，多个文件请打包 .zip', accept: '.zip,.shp', bizType: 'shp' },
    { key: 'statAtt', label: '上传数据统计表', hint: '支持 .xlsx 文件上传', accept: '.xlsx,.xls', bizType: 'xlsx' },
    { key: 'benchmarkAtt', label: '上传城市横向对标数据表', hint: '支持 .xlsx 文件上传', accept: '.xlsx,.xls', bizType: 'xlsx' },
  ] as const;
  type AttKey = (typeof attSlots)[number]['key'];

  const attModel = reactive<Record<AttKey, AttFile | undefined>>({
    shpAtt: undefined,
    statAtt: undefined,
    benchmarkAtt: undefined,
  });
  const uploadingKey = ref<AttKey | ''>('');

  /** 资料清单对应结果（表7 整单替换保存） */
  const materialRows = ref<MaterialResultRow[]>([]);

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetFields();
    isView.value = !!data?.isView;
    loading.value = true;
    try {
      detail.value = await indicatorResultInfo(data.id);
      // 维度/数据来源：结果行不带这些列，按 item_no 联表2 补齐
      const item = props.itemsMap.get(Number(detail.value.code));
      if (item) {
        detail.value = {
          ...detail.value,
          dim1: item.dim1,
          dim2: item.dim2,
          dim3: item.dim3,
          dataSource: detail.value.dataSource ?? item.dataSource,
        };
      }
      attModel.shpAtt = detail.value.shpAtt;
      attModel.statAtt = detail.value.statAtt;
      attModel.benchmarkAtt = detail.value.benchmarkAtt;
      materialRows.value = (detail.value.materialResultList ?? []).map((m) => ({ ...m }));
      await setFieldsValue({
        indicatorValueInput: displayValue(detail.value.resultValue, detail.value.resultValueText),
        standardValueInput: displayValue(detail.value.standardValue, detail.value.standardValueText),
        evaluateResult: detail.value.evaluateResult ?? undefined,
        warningStatus: detail.value.warningStatus ?? '',
        resultAnalysis: detail.value.resultAnalysis ?? '',
      });
      await setProps({ disabled: readonly.value });
    } catch (e: any) {
      showMessage(e?.message || '加载指标项结果失败', 'error');
    } finally {
      loading.value = false;
      setDrawerProps({ loading: false });
    }
  });

  /** 选文件即手动上传（beforeUpload 返回 false 阻止 antd 自动上传） */
  function handleUpload(key: AttKey, file: File, bizType: string): boolean {
    uploadingKey.value = key;
    checkFileUpload(file, bizType)
      .then((att) => {
        attModel[key] = att;
      })
      .catch((e: any) => {
        showMessage(e?.message || '上传失败', 'error');
      })
      .finally(() => {
        uploadingKey.value = '';
      });
    return false;
  }

  async function handleDownload(key: AttKey) {
    if (attModel[key]) await checkFileDownload(attModel[key]!);
  }

  async function handleSubmit() {
    if (readonly.value) {
      closeDrawer();
      return;
    }
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    if (uploadingKey.value) {
      showMessage('附件上传中，请稍候');
      return;
    }
    setDrawerProps({ loading: true });
    try {
      const { warningStatus } = await indicatorResultSave({
        id: detail.value!.id,
        indicatorValueInput: data.indicatorValueInput,
        standardValueInput: data.standardValueInput,
        evaluateResult: data.evaluateResult,
        resultAnalysis: data.resultAnalysis,
        shpAtt: attModel.shpAtt,
        statAtt: attModel.statAtt,
        benchmarkAtt: attModel.benchmarkAtt,
      });
      if (materialRows.value.length) {
        await materialResultSaveList(detail.value!.id, materialRows.value);
      }
      showMessage(`保存成功${warningStatus ? `（预警状态：${warningStatus}）` : ''}`);
      setTimeout(closeDrawer);
      emit('success');
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      setDrawerProps({ loading: false });
    }
  }
</script>
