<!--
  ifco —— 项目成效填报「导入」抽屉（BasicDrawer + antdv Upload，单文件本地解析）

  界面：项目报送单位 Select + Excel 上传（仅 .xlsx/.xls）+ 底部错误区域（红字列表，
  不走 message）。单位可选范围 = 综合协调组/超管全部；普通区局仅本单位。
  导入语义 = 同名覆盖 + 新增追加（与强制带入同语义），目标周期 = 页面当前所选年+季。

  解析（官方单排表头模板，唯一模板校验）：
  - 固定四列（指标名称/计量单位/代码/数量合计）与「数量合计」列不解析为项目；
  - 项目列 = 表头第 5 列（E）起名称非空的列；指标行只按代码列（C）识别；
  - 双值格「数|面积」拆为 a/b 两键提交（与保存项目列的扁平键同构）；
  - 结构不符（表头四列缺失/无有效项目列/全部无数据）→ 整体拦截，错误列在抽屉空白区。
-->
<template>
  <BasicDrawer
    v-bind="$attrs"
    title="导入项目成效"
    width="500"
    ok-text="开始导入"
    cancel-text="取消"
    show-footer
    force-render
    @register="registerDrawer"
    @ok="handleImport"
  >
    <div class="flex flex-col gap-16px">
      <div>
        <div class="mb-4px text-gray-700">项目报送单位</div>
        <Select
          v-model:value="unitCode"
          :options="unitOptions"
          placeholder="请选择要导入的报送单位"
          show-search
          option-filter-prop="label"
        />
      </div>
      <div>
        <div class="mb-4px text-gray-700">Excel 文件（仅 .xlsx / .xls）</div>
        <Upload
          v-model:file-list="fileList"
          :before-upload="() => false"
          accept=".xlsx,.xls"
          :max-count="1"
          @remove="handleFileRemoved"
        >
          <a-button> <Icon icon="i-ant-design:upload-outlined" /> 选择文件 </a-button>
        </Upload>
        <div v-if="parsedPreview" class="mt-4px text-13px text-gray-500">
          已解析：{{ parsedPreview.projectCount }} 个项目列
        </div>
      </div>

      <!-- 错误区域：解析/校验失败明细（红字列表，不走 message） -->
      <div v-if="errors.length" class="flex flex-col gap-4px rd-6px bg-#fff2f0 px-12px py-10px">
        <div class="text-14px font-600 text-red-500">导入失败，请修正后重新上传：</div>
        <div v-for="(error, index) in errors" :key="index" class="text-13px text-red-400">
          {{ index + 1 }}. {{ error }}
        </div>
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoEffectFillImportDrawer">
  import { computed, ref } from 'vue';
  import { Select, Upload } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Icon } from '@jeesite/core/components/Icon';
  import type { UploadFile } from 'antdv-next';
  import * as XLSX from 'xlsx';
  import { createEffectImportParser } from './import-parser';
  import { EFFECT_INDICATORS, UNITS, importEffectProjects } from '@jeesite/ifco/api/ifco/effect-fill';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  // ── 单位下拉：综合协调组/超管 = 全部；普通账号 = 仅本单位（UNITS 已按权限过滤）──
  const unitOptions = computed(() => UNITS.map((unit) => ({ label: unit.name, value: unit.code })));
  const unitCode = ref<string>();
  const fileList = ref<UploadFile[]>([]);
  const errors = ref<string[]>([]);
  const parsedPreview = ref<{ projectCount: number }>();

  function handleFileRemoved() {
    errors.value = [];
    parsedPreview.value = undefined;
  }

  /** 打开时重置；非综合协调组默认锁定本单位 */
  /** 页面带入的当前周期（打开时传入） */
  const period = ref<{ year: number; quarter: string }>();

  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner((data: any) => {
    period.value = data;
    errors.value = [];
    parsedPreview.value = undefined;
    fileList.value = [];
    unitCode.value = unitOptions.value.length === 1 ? unitOptions.value[0].value : undefined;
  });

  async function handleImport() {
    errors.value = [];
    if (!unitCode.value) {
      errors.value = ['请选择项目报送单位'];
      return;
    }
    const file = fileList.value[0]?.originFileObj;
    if (!file) {
      errors.value = ['请选择要导入的 Excel 文件'];
      return;
    }
    setDrawerProps({ confirmLoading: true });
    try {
      // 1) 本地解析（结构校验 + 双值格拆键 + 指标值提取）
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      // 代码 → 提交键（fill 行；双值行 key 即 dualGroup，提交时拆 a/b）
      const codeDefByCode = new Map(
        EFFECT_INDICATORS.filter((item) => item.kind === 'fill').map((item) => [
          item.code,
          { key: item.key, dual: item.dual === true },
        ]),
      );
      const parsed = createEffectImportParser(codeDefByCode)(workbook);
      if (parsed.errors.length) {
        errors.value = parsed.errors;
        return;
      }
      parsedPreview.value = { projectCount: parsed.projects.length };

      // 2) 提交后端（同名覆盖 + 新增追加；服务端二次校验数据权限）
      const res = await importEffectProjects({
        year: period.value?.year ?? 0,
        quarter: period.value?.quarter ?? '',
        unit: unitCode.value,
        projects: parsed.projects,
      });
      emit('success', res);
      showMessage(
        `导入成功：新增 ${res.broughtProjectCount} 列、覆盖同名 ${res.overwrittenProjectCount} 列、跳过同名 ${res.skippedProjectCount} 列`,
      );
      closeDrawer();
    } catch (e: unknown) {
      errors.value = [e instanceof Error ? e.message : '导入失败'];
    } finally {
      setDrawerProps({ confirmLoading: false });
    }
  }
</script>
