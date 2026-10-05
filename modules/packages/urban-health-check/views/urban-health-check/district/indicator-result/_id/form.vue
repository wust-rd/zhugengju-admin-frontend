<!--
  市住更局 —— 区级体检指标项结果 编辑/查看（页面内联组件）

  由 _id/list.vue 内嵌使用（点「编辑/查看」在当前页切换显示，无路由无抽屉）：
  父级 v-if 切换列表/编辑视图，本组件承载编辑表单。
  与市级编辑差异：少 基准文件/数据来源/责任部门（只读展示）、新增「评估季度」；
  附件两个；资料明细可增删行。未填报行（结果 id=null）按 itemId 懒初始化保存，
  成功后再按 resultId 整批覆盖资料明细。
-->
<template>
  <div>
    <!-- 页头：返回 + 标题 + 保存 -->
    <Card class="mb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <a-button class="mr-3" @click="emit('back')">
            <Icon icon="ant-design:arrow-left-outlined" /> 返回
          </a-button>
          <span class="text-base font-medium">{{ readonly ? '查看' : '编辑' }} · {{ itemInfo?.itemName ?? '指标项结果' }}</span>
        </div>
        <a-button v-if="!readonly" type="primary" :loading="saving" @click="handleSave">保存</a-button>
      </div>
    </Card>

    <!-- 指标项信息（只读） -->
    <Card class="mb-3" title="指标项信息">
      <div class="grid grid-cols-1 gap-y-3 md:grid-cols-4" style="column-gap: 24px">
        <div><span class="text-gray-500">体检维度：</span>{{ itemInfo?.firstDimension ?? '-' }}</div>
        <div><span class="text-gray-500">体检项：</span>{{ itemInfo?.checkItemName ?? '-' }}</div>
        <div><span class="text-gray-500">序号：</span>{{ itemInfo?.itemNo ?? '-' }}</div>
        <div><span class="text-gray-500">指标单位：</span>{{ itemInfo?.itemUnit ?? '-' }}</div>
        <div><span class="text-gray-500">指标来源：</span>{{ itemInfo?.itemSource ?? '-' }}</div>
        <div><span class="text-gray-500">数据来源：</span>{{ row?.dataSource ?? '-' }}</div>
        <div class="md:col-span-2"><span class="text-gray-500">责任部门：</span>{{ row?.responsibilityDept ?? '-' }}</div>
      </div>
    </Card>

    <!-- 填报信息 -->
    <Card title="填报信息">
      <BasicForm @register="registerForm" />

      <!-- 附件（图层 shp / 数据统计表） -->
      <div class="px-4 pb-2">
        <div v-for="slot in attSlots" :key="slot.key" class="mb-3 flex items-center">
          <div class="w-44 shrink-0 text-right">
            <span class="mr-2">{{ slot.label }}</span>
            <Upload
              v-if="!readonly"
              :accept="slot.accept"
              :show-upload-list="false"
              :before-upload="(file: File) => handleUpload(slot.key, file)"
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
            <span v-else class="text-gray-400">未上传</span>
          </div>
        </div>
      </div>

      <!-- 资料明细（表5：可增删行，保存时按 resultId 整批覆盖） -->
      <div class="px-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-base font-medium">资料明细</span>
          <a-button v-if="!readonly" size="small" type="primary" @click="materialRows.push({})">
            <Icon icon="i-fluent:add-12-filled" /> 新增
          </a-button>
        </div>
        <div v-if="materialRows.length">
          <div
            v-for="(mrow, idx) in materialRows"
            :key="idx"
            class="mb-2 flex flex-wrap items-center rounded border px-3 py-2"
            style="column-gap: 10px"
          >
            <Input
              v-model:value="mrow.materialName"
              :disabled="readonly"
              placeholder="资料名称"
              style="width: 200px"
            />
            <Select
              v-model:value="mrow.materialType"
              :options="MATERIAL_TYPE_OPTIONS"
              :disabled="readonly"
              allow-clear
              placeholder="资料类型"
              style="width: 120px"
            />
            <InputNumber
              v-model:value="mrow.resultValue"
              :disabled="readonly"
              placeholder="资料数值"
              style="width: 130px"
            />
            <div class="flex min-w-0 flex-1 items-center">
              <template v-if="mrow._file">
                <Icon icon="ant-design:paper-clip-outlined" class="mr-1 shrink-0" />
                <a class="truncate" :title="mrow._file.name" @click="downloadMaterialFile(idx)">
                  {{ mrow._file.name }}
                </a>
              </template>
              <Upload
                v-if="!readonly"
                :show-upload-list="false"
                :before-upload="(file: File) => uploadMaterialFile(idx, file)"
              >
                <a-button size="small">{{ mrow._file ? '重新上传' : '上传文件' }}</a-button>
              </Upload>
              <a-button
                v-if="!readonly && mrow._file"
                type="link"
                size="small"
                danger
                @click="mrow._file = undefined"
              >
                移除
              </a-button>
            </div>
            <a-button v-if="!readonly" type="link" size="small" danger @click="materialRows.splice(idx, 1)">
              删除
            </a-button>
          </div>
        </div>
        <div v-else class="text-gray-400">暂无资料明细</div>
      </div>
    </Card>
  </div>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckDistrictIndicatorResultIdForm">
  import { computed, onMounted, ref, toRaw } from 'vue';
  import { Card, Input, InputNumber, Select, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { DistrictItem } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import { districtItemList } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-system';
  import type {
    AttFile,
    DistrictMaterialResult,
    DistrictResult,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-result';
  import {
    checkFileDownload,
    checkFileUpload,
    districtMaterialResultSaveList,
    districtResultInfo,
    districtResultSave,
    EVAL_OPTIONS,
    MATERIAL_TYPE_OPTIONS,
    QUARTER_OPTIONS,
  } from '@jeesite/urban-health-check/api/urban-health-check/district/district-indicator-result';

  const emit = defineEmits(['success', 'back']);

  const props = defineProps({
    /** 打开入参：结果行（未填报行仅含 itemId）+ setId + isView */
    record: { type: Object as () => Recordable, required: true },
  });

  const { showMessage } = useMessage();

  const row = ref<DistrictResult>({} as DistrictResult);
  const itemId = ref('');
  const setId = ref('');
  const isView = ref(false);

  /** 指标项信息（只读卡） */
  const itemInfo = ref<DistrictItem>();

  const readonly = computed(() => isView.value || row.value.submitStatus === 1);

  /** 附件模型（{name,url}）与插槽定义 */
  const attModel = ref<Record<'layerShpFile' | 'dataStatFile', AttFile | undefined>>({
    layerShpFile: undefined,
    dataStatFile: undefined,
  });
  const attSlots = [
    { key: 'layerShpFile' as const, label: '图层 shp 文件', accept: '.zip,.shp' },
    { key: 'dataStatFile' as const, label: '数据统计表文件', accept: '.xlsx,.xls' },
  ];

  /** 资料明细行（_file 为前端持有的附件对象，提交时序列化进 materialFile） */
  type MaterialRow = Partial<DistrictMaterialResult> & { _file?: AttFile };
  const materialRows = ref<MaterialRow[]>([]);

  const inputFormSchemas: FormSchema[] = [
    {
      label: '填报信息',
      field: 'fillInfo',
      component: 'FormGroup',
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
    {
      label: '评估季度',
      field: 'resultQuarter',
      component: 'Select',
      componentProps: () => ({ options: QUARTER_OPTIONS, allowClear: true, disabled: readonly.value }),
      colProps: { xs: 24, sm: 12, md: 12, lg: 12 },
    },
    {
      label: '指标值',
      field: 'resultValue',
      component: 'InputNumber',
      componentProps: () => ({ style: 'width: 100%', disabled: readonly.value }),
      colProps: { xs: 24, sm: 12, md: 12, lg: 12 },
      rules: [{ required: true, message: '请输入指标值' }],
    },
    {
      label: '标准值',
      field: 'standardValue',
      component: 'InputNumber',
      componentProps: () => ({ style: 'width: 100%', disabled: readonly.value }),
      colProps: { xs: 24, sm: 12, md: 12, lg: 12 },
    },
    {
      label: '基准值',
      field: 'baselineValue',
      component: 'InputNumber',
      componentProps: () => ({ style: 'width: 100%', disabled: readonly.value }),
      colProps: { xs: 24, sm: 12, md: 12, lg: 12 },
    },
    {
      label: '评估结果',
      field: 'evaluateResult',
      component: 'Select',
      componentProps: () => ({ options: EVAL_OPTIONS, allowClear: true, disabled: readonly.value }),
      colProps: { xs: 24, sm: 12, md: 12, lg: 12 },
      rules: [{ required: true, message: '请选择评估结果' }],
      helpMessage: '预警状态由系统按评估结果自动生成',
    },
    {
      label: '指标结果分析',
      field: 'resultAnalysis',
      component: 'InputTextArea',
      componentProps: () => ({ maxlength: 500, showCount: true, rows: 4, disabled: readonly.value }),
      colProps: { xs: 24, sm: 24, md: 24, lg: 24 },
    },
  ];

  const [registerForm, { resetFields, setFieldsValue, validate, setProps }] = useForm({
    labelWidth: 120,
    schemas: inputFormSchemas,
    baseColProps: { xs: 24, sm: 12, md: 12, lg: 12 },
  });

  function parseAtt(json?: string | null): AttFile | undefined {
    if (!json) return undefined;
    try {
      const v = JSON.parse(json);
      return v && v.url ? { name: v.name ?? '附件', url: v.url } : undefined;
    } catch {
      return undefined;
    }
  }

  onMounted(async () => {
    row.value = toRaw(props.record) as DistrictResult;
    itemId.value = String(props.record?.itemId ?? '');
    setId.value = String(props.record?.setId ?? '');
    isView.value = !!props.record?.isView;
    try {
      // 指标项信息（维度/体检项/来源等）
      const items = await districtItemList(setId.value);
      itemInfo.value = items.find((it) => it.id === itemId.value);
      // 已有结果行时取详情（含资料明细）
      let materials: DistrictMaterialResult[] = [];
      if (row.value.id) {
        const info = await districtResultInfo(row.value.id);
        materials = info.materialResultList ?? [];
      }
      attModel.value = {
        layerShpFile: parseAtt(row.value.layerShpFile),
        dataStatFile: parseAtt(row.value.dataStatFile),
      };
      materialRows.value = materials.map((m) => ({
        ...m,
        _file: parseAtt(m.materialFile as unknown as string),
      }));
      await Promise.race([resetFields().catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
      await setFieldsValue({
        resultQuarter: row.value.resultQuarter ?? undefined,
        resultValue: row.value.resultValue ?? undefined,
        standardValue: row.value.standardValue ?? undefined,
        baselineValue: row.value.baselineValue ?? undefined,
        evaluateResult: row.value.evaluateResult ?? undefined,
        resultAnalysis: row.value.resultAnalysis ?? '',
      });
      await setProps({ disabled: readonly.value });
    } catch (e: any) {
      showMessage(e?.message || '加载指标项结果失败', 'error');
    }
  });

  const uploadingKey = ref('');
  async function handleUpload(key: 'layerShpFile' | 'dataStatFile', file: File) {
    uploadingKey.value = key;
    try {
      attModel.value[key] = await checkFileUpload(file, key === 'layerShpFile' ? 'shp' : 'xlsx');
      showMessage('上传成功');
    } catch (e: any) {
      showMessage(e?.message || '上传失败', 'error');
    } finally {
      uploadingKey.value = '';
    }
    return false;
  }

  async function handleDownload(key: 'layerShpFile' | 'dataStatFile') {
    const att = attModel.value[key];
    if (att) await checkFileDownload(att);
  }

  async function uploadMaterialFile(idx: number, file: File) {
    try {
      materialRows.value[idx]._file = await checkFileUpload(file);
      showMessage('上传成功');
    } catch (e: any) {
      showMessage(e?.message || '上传失败', 'error');
    }
    return false;
  }

  async function downloadMaterialFile(idx: number) {
    const att = materialRows.value[idx]._file;
    if (att) await checkFileDownload(att);
  }

  const saving = ref(false);
  async function handleSave() {
    let data: any;
    try {
      data = await validate();
    } catch (error: any) {
      if (error && error.errorFields) {
        showMessage(error.message || '请完善必填项');
      }
      return;
    }
    // 资料行完整性：名称/类型成对必填
    const badRow = materialRows.value.findIndex((m) => !m.materialName || !m.materialType);
    if (badRow >= 0) {
      showMessage(`第 ${badRow + 1} 行资料明细请填写名称与类型`);
      return;
    }
    saving.value = true;
    try {
      const saved = await districtResultSave({
        id: row.value.id ?? undefined,
        itemId: itemId.value,
        resultQuarter: data.resultQuarter ?? null,
        resultValue: data.resultValue ?? null,
        standardValue: data.standardValue ?? null,
        baselineValue: data.baselineValue ?? null,
        evaluateResult: data.evaluateResult,
        resultAnalysis: data.resultAnalysis ?? null,
        layerShpFile: attModel.value.layerShpFile ? JSON.stringify(attModel.value.layerShpFile) : null,
        dataStatFile: attModel.value.dataStatFile ? JSON.stringify(attModel.value.dataStatFile) : null,
      });
      // 资料明细整批覆盖（依赖结果主键，保存结果后提交；后端要求列表非空，无行时跳过）
      if (materialRows.value.length > 0) {
        await districtMaterialResultSaveList(
          saved.id,
          materialRows.value.map((m) => ({
            id: m.id,
            materialId: m.materialId ?? null,
            materialName: m.materialName,
            materialType: m.materialType,
            resultValue: m.resultValue ?? null,
            materialFile: m._file ? JSON.stringify(m._file) : null,
            sortNo: m.sortNo,
          })),
        );
      }
      showMessage('保存成功');
      emit('success');
    } catch (e: any) {
      showMessage(e?.message || '保存失败', 'error');
    } finally {
      saving.value = false;
    }
  }
</script>
