<!--
  填报页区块五：片区资金方案（对齐设计稿）

  字段：
   - 总体投资估算（亿元）*：复用 Scheme.invest（与列表页同名字段打通）；
   - 片区资金来源（选填）：14 项「圈选 + 金额（亿元）」网格（4 列自适应），
     圈选样式仿设计稿 radio 圆点，圆点与来源名整块可点切换；输入金额自动视为选中。
     值结构：{ 来源名: 金额|null }；清单与项目情况的「项目资金来源」下拉共用（fund-sources.ts）；
   - 资金来源概况（选填，≤500 字）：普通 schema 文本域，随表单模型自动取值/回显。

  实现注意（坑）：
   - 金额输入不用 antd InputNumber：它 changeOnBlur 默认开启，失焦时会用
     组件收到的 value prop 强制重写显示文本，在 slot 场景下时序稍有偏差即
     表现为「失焦丢值」；改用全局注册的 a-input（纯受控、无内部提交逻辑，
     与 list-editor 同模式）+ 手动数字解析；
   - 非 a-button/a-input 的 antd 组件必须显式 import，裸用小写标签不渲染。
-->
<template>
  <BasicForm @register="registerForm">
    <!-- 总体投资估算：slot 自绘（a-input + 数字解析，0 为合法值） -->
    <template #invest>
      <a-input v-model:value="investText" :disabled="disabled" placeholder="请输入" @change="syncInvest" />
    </template>
    <template #fundSources>
      <div class="grid grid-cols-1 gap-x-32px gap-y-12px md:grid-cols-2 xl:grid-cols-4">
        <div v-for="s in FUND_SOURCES" :key="s" class="flex min-w-0 items-center gap-8px">
          <!-- 圆点 + 来源名整块可点（仿 radio label 行为）：点击切换选中；金额输入不参与 -->
          <span class="group flex min-w-0 flex-1 cursor-pointer items-center gap-8px" @click="toggleSource(s)">
            <span
              class="h-14px w-14px flex-none rd-full transition-colors"
              :class="
                selected(s) ? 'border-4px border-[#1677ff]' : 'border-1px border-gray-300 group-hover:border-[#1677ff]'
              "
            ></span>
            <span
              class="min-w-0 flex-1 text-13px leading-18px text-gray-700 transition-colors group-hover:text-[#1677ff]"
            >
              {{ s }}
            </span>
          </span>
          <!-- 宽度用内联 style：antd 组件默认样式运行时注入，会覆盖 Uno 类选择器 -->
          <a-input
            v-model:value="sources[s]"
            :disabled="disabled"
            style="width: 88px"
            class="flex-none"
            @change="syncSources"
          />
          <span class="flex-none text-12px text-gray-500">亿元</span>
        </div>
      </div>
    </template>
  </BasicForm>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionFundingPlan">
  import { reactive, ref } from 'vue';
  import { BasicForm, FormSchema } from '@jeesite/core/components/Form';
  import { FUND_SOURCES } from './fund-sources';
  import { useSectionForm } from './use-section-form';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  const inputFormSchemas: FormSchema[] = [
    {
      label: '总体投资估算（亿元）',
      field: 'invest',
      component: 'Input',
      slot: 'invest',
      rules: [{ required: true, message: '请输入总体投资估算' }],
    },
    {
      label: '片区资金来源',
      field: 'fundSources',
      component: 'Input',
      slot: 'fundSources',
      colProps: { span: 24, md: 24, lg: 24 },
    },
    {
      label: '资金来源概况',
      field: 'fundOverview',
      component: 'InputTextArea',
      colProps: { span: 24, md: 24, lg: 24 },
      componentProps: { maxlength: 500, rows: 4, showCount: true, placeholder: '不超过500字' },
    },
  ];

  const { registerForm, exposed } = useSectionForm({
    data: props.data,
    disabled: props.disabled,
    layout: 'vertical',
    rowProps: { gutter: 24 },
    baseColProps: { md: 24, lg: 12 },
    schemas: inputFormSchemas,
  });

  /** 金额文本 → 数值（空/非法 → undefined；0 为合法值） */
  function parseAmount(s: string | null | undefined): number | undefined {
    const t = String(s ?? '').trim();
    if (t === '') return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }

  /** 总体投资估算（显示文本驱动，失焦/重渲染不会被打回） */
  const investText = ref(props.data?.invest == null ? '' : String(props.data.invest));

  function syncInvest() {
    exposed.setFieldsValueSilently({ invest: parseAmount(investText.value) });
  }

  /** 资金来源本地状态：{ 来源名: 金额文本 }，键存在即选中 */
  const sources = reactive<Record<string, string>>({});

  for (const s of FUND_SOURCES) {
    const v = (props.data?.fundSources ?? {})[s];
    if (v != null) sources[s] = String(v);
  }

  function selected(s: string): boolean {
    return s in sources;
  }

  /** 圈选切换：取消时连同金额一并移除 */
  function toggleSource(s: string) {
    if (props.disabled) {
      return;
    }
    if (selected(s)) {
      delete sources[s];
    } else {
      sources[s] = sources[s] ?? '';
    }
    syncSources();
  }

  /** 输入/圈选后同步进表单字段 fundSources（值解析为数值，非法/空记 null） */
  function syncSources() {
    const out: Record<string, number | null> = {};
    for (const s of FUND_SOURCES) {
      if (!(s in sources)) continue;
      out[s] = parseAmount(sources[s]) ?? null;
    }
    exposed.setFieldsValueSilently({ fundSources: out });
  }

  /** 覆写导出：资金来源汇总为一行（来源（金额亿元）用「；」拼接）；概况行从表单模型取 */
  function exportRows(): [string, string][] {
    const rows: [string, string][] = [['总体投资估算（亿元）', investText.value.trim()]];
    const picked = FUND_SOURCES.filter(selected);
    rows.push([
      '片区资金来源',
      picked.length
        ? picked
            .map((s) => {
              const n = parseAmount(sources[s]);
              return `${s}${n != null ? ` ${n}亿元` : '（未填金额）'}`;
            })
            .join('；')
        : '（无）',
    ]);
    rows.push(['资金来源概况', String(exposed.getFieldsValue().fundOverview ?? '')]);
    return rows;
  }

  defineExpose({ ...exposed, exportRows });
</script>
