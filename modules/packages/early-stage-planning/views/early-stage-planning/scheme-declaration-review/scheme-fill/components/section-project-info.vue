<!--
  填报页区块四：片区项目情况（对齐设计稿）

  片区内项目逐个填报：顶部自绘 tab 条 + 右侧「添加 / 删除」按钮；
  每个 tab 渲染一个 section-project-item.vue 实例。实现要点：
   - 项目列表 projects = [{ _uid, stock, name, data }]，tab 以 _uid 为 key（增删不打乱已挂载表单）；
   - tab 标题显示项目名称（item 输入经 nameChange 实时回传），未填时回退「项目N」；
   - 存量导入行（后端回显 fillFlag=0，排在填报行前）：与填报行一样可编辑可删除，
     tab 带「存量」徽标仅作来源标识；保存值带回 pUid/fillFlag 供后端按 pUid
     更新/删除（后端配套改造前，其保存逻辑仍跳过 fillFlag=0 行——存量行的编辑/
     删除暂不落库，但也不会产生重复行；见变更说明 §10）；
   - 面板用 v-show（全部保持挂载），切 tab / 保存校验时表单值不丢、注册不失效；
   - validate 逐项目校验，失败时自动切到第一个有问题的 tab 再抛出（由 form.vue 滚动定位）；
   - getFieldsValue 汇总为 { projects: [...] }；exportRows 按项目分组平铺。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- tab 条：左 tab（显示项目名称），右 添加/删除（查看模式隐藏按钮） -->
    <div class="flex items-center justify-between">
      <div class="flex flex-1 gap-4px overflow-x-auto border-b border-gray-100">
        <div
          v-for="(p, i) in projects"
          :key="p._uid"
          class="flex cursor-pointer items-center gap-4px whitespace-nowrap border-b-2 px-16px py-8px text-14px transition-colors"
          :class="
            i === activeIdx
              ? 'border-[#1677ff] font-500 text-[#1677ff]'
              : 'border-transparent text-gray-600 hover:text-[#1677ff]'
          "
          :title="p.name || `项目${i + 1}`"
          @click="activeIdx = i"
        >
          <span class="max-w-160px truncate">{{ p.name || `项目${i + 1}` }}</span>
          <span
            v-if="p.stock"
            class="inline-flex rd-4px bg-gray-100 px-4px py-1px text-11px font-400 text-gray-500"
            title="存量导入项目"
          >
            存量
          </span>
        </div>
      </div>
      <div v-if="!disabled" class="mb-6px ml-12px flex flex-none gap-8px">
        <a-button type="primary" @click="addProject">
          <span class="inline-flex items-center gap-4px"><span class="i-fluent:add-12-filled"></span> 添加</span>
        </a-button>
        <a-button danger @click="removeProject">删除</a-button>
      </div>
    </div>

    <!-- 各项目面板（v-show 保持挂载：切 tab 不丢值，隐藏 tab 也参与校验；
         PDF 导出中全部展开——截图需覆盖每个项目的完整表单） -->
    <div v-for="(p, i) in projects" v-show="i === activeIdx || pdfExporting" :key="p._uid">
      <SectionProjectItem
        :ref="(el) => setItemRef(p._uid, el)"
        :value="p.data"
        :disabled="disabled"
        @name-change="(v: string) => (p.name = v)"
      />
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionProjectInfo">
  import { ref } from 'vue';
  import type { SectionFormExposed } from './use-section-form';
  import SectionProjectItem from './section-project-item.vue';
  import { pdfExporting } from './pdf-export-state';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 项目包装（_uid 仅作 tab key；stock/name 驱动 tab 展示；data 为项目字段） */
  type ProjectWrap = { _uid: number; stock: boolean; name: string; data: Recordable };

  let uidSeq = 0;
  const nextUid = () => ++uidSeq;

  /** 后端回显口径：fillFlag=0 存量导入行（排前）/ 1 填报行 */
  const isStock = (p: Recordable) => String(p?.fillFlag ?? '') === '0';

  /** 初值：记录里的项目数组（存量行标徽标；名称进 tab 标题）；无则给一个空白填报项目 */
  const projects = ref<ProjectWrap[]>(
    ((props.data?.projects as Recordable[]) ?? []).map((p) => ({
      _uid: nextUid(),
      stock: isStock(p),
      name: String(p?.name ?? ''),
      data: p,
    })),
  );
  if (!projects.value.length) {
    projects.value = [{ _uid: nextUid(), stock: false, name: '', data: {} }];
  }

  const activeIdx = ref(0);

  function addProject() {
    projects.value.push({ _uid: nextUid(), stock: false, name: '', data: {} });
    activeIdx.value = projects.value.length - 1;
  }

  function removeProject() {
    const [removed] = projects.value.splice(activeIdx.value, 1);
    if (removed) {
      itemRefs.delete(removed._uid);
    }
    if (!projects.value.length) {
      projects.value = [{ _uid: nextUid(), stock: false, name: '', data: {} }];
    }
    activeIdx.value = Math.min(activeIdx.value, projects.value.length - 1);
  }

  /** 各项目表单实例（统一接口） */
  const itemRefs = new Map<number, SectionFormExposed | null>();

  function setItemRef(uid: number, el: unknown) {
    itemRefs.set(uid, (el as SectionFormExposed) ?? null);
  }

  defineExpose({
    /** 逐项目校验；失败自动切到第一个有问题的 tab */
    validate: async () => {
      let firstBad = -1;
      for (let i = 0; i < projects.value.length; i++) {
        try {
          await itemRefs.get(projects.value[i]._uid)?.validate();
        } catch {
          if (firstBad < 0) firstBad = i;
        }
      }
      if (firstBad >= 0) {
        activeIdx.value = firstBad;
        throw new Error(`项目${firstBad + 1} 未完善`);
      }
    },
    /**
     * 保存值含全部项目行（存量 + 填报）：存量行带回回显的 pUid/fillFlag，供后端
     * 按 pUid 原位更新；被删除的存量行不在数组中，后端按缺席删除（后端配套改造
     * 见变更说明 §10 —— 未实现前 fillFlag=0 行仍被跳过，编辑/删除暂不落库）
     */
    getFieldsValue: () => ({
      projects: projects.value.map((p) => {
        const value = itemRefs.get(p._uid)?.getFieldsValue() ?? {};
        const identity: Recordable = {};
        if (p.data.pUid != null) identity.pUid = p.data.pUid;
        if (p.data.fillFlag != null) identity.fillFlag = p.data.fillFlag;
        return { ...identity, ...value };
      }),
    }),
    exportRows: (): [string, string][] => {
      const rows: [string, string][] = [];
      projects.value.forEach((p, i) => {
        const inst = itemRefs.get(p._uid);
        rows.push([`${p.name || `项目${i + 1}`}${p.stock ? '（存量）' : ''}：`, '']);
        for (const [label, value] of inst?.exportRows() ?? []) {
          rows.push([`　${label}`, value]);
        }
        rows.push(['', '']);
      });
      return rows;
    },
    setFieldsValueSilently: async () => {},
  } satisfies SectionFormExposed);
</script>
