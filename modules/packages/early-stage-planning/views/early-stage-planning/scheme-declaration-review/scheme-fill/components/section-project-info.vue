<!--
  填报页区块四：片区项目情况（对齐设计稿）

  片区内项目逐个填报：顶部自绘 tab 条（项目1/项目2…）+ 右侧「添加 / 删除」按钮；
  每个 tab 渲染一个 section-project-item.vue 实例。实现要点：
   - 项目列表 projects = [{ _uid, stock, data }]，tab 以 _uid 为 key（增删不打乱已挂载表单）；
   - 存量导入行（后端回显 fillFlag=0，排在填报行前）：只读展示——tab 带「存量」徽标、
     表单整体禁用、不可删除，保存值不带出（后端保存时本就跳过 fillFlag=0 行，
     不发送可彻底避免 fillFlag 丢失被误当新填报行重复入库）；
   - 面板用 v-show（全部保持挂载），切 tab / 保存校验时表单值不丢、注册不失效；
   - validate 逐项目校验，失败时自动切到第一个有问题的 tab 再抛出（由 form.vue 滚动定位）；
   - getFieldsValue 汇总为 { projects: [...] }（仅填报行）；exportRows 按项目分组平铺（存量行标注）。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- tab 条：左 tab，右 添加/删除（查看模式隐藏按钮；存量 tab 不可删） -->
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
          @click="activeIdx = i"
        >
          项目{{ i + 1 }}
          <span
            v-if="p.stock"
            class="inline-flex rd-4px bg-gray-100 px-4px py-1px text-11px font-400 text-gray-500"
            title="存量导入项目，只读展示"
          >
            存量
          </span>
        </div>
      </div>
      <div v-if="!disabled" class="mb-6px ml-12px flex flex-none gap-8px">
        <a-button type="primary" @click="addProject">
          <span class="inline-flex items-center gap-4px"><span class="i-fluent:add-12-filled"></span> 添加</span>
        </a-button>
        <a-button
          danger
          :disabled="activeStock"
          :title="activeStock ? '存量导入项目不可删除' : undefined"
          @click="removeProject"
        >
          删除
        </a-button>
      </div>
    </div>

    <!-- 各项目面板（v-show 保持挂载：切 tab 不丢值，隐藏 tab 也参与校验） -->
    <div v-for="(p, i) in projects" v-show="i === activeIdx" :key="p._uid" class="flex flex-col gap-8px">
      <!-- 存量行提示：编辑模式下表单禁用，仅展示 -->
      <div v-if="p.stock" class="rd-6px bg-gray-100 px-12px py-6px text-12px text-gray-500">
        存量导入项目，只读展示，保存不落库
      </div>
      <SectionProjectItem :ref="(el) => setItemRef(p._uid, el)" :value="p.data" :disabled="disabled || p.stock" />
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillSectionProjectInfo">
  import { computed, ref } from 'vue';
  import type { SectionFormExposed } from './use-section-form';
  import SectionProjectItem from './section-project-item.vue';

  const props = defineProps<{ data?: Recordable; disabled?: boolean }>();

  /** 项目包装（_uid 仅作 tab key 用，不参与保存；stock=存量导入行只读；data 为项目字段） */
  type ProjectWrap = { _uid: number; stock: boolean; data: Recordable };

  let uidSeq = 0;
  const nextUid = () => ++uidSeq;

  /** 后端回显口径：fillFlag=0 存量导入行（排前）/ 1 填报行 */
  const isStock = (p: Recordable) => String(p?.fillFlag ?? '') === '0';

  /** 初值：记录里的项目数组（存量行标只读）；无则给一个空白填报项目 */
  const projects = ref<ProjectWrap[]>(
    ((props.data?.projects as Recordable[]) ?? []).map((p) => ({ _uid: nextUid(), stock: isStock(p), data: p })),
  );
  if (!projects.value.length) {
    projects.value = [{ _uid: nextUid(), stock: false, data: {} }];
  }

  const activeIdx = ref(0);

  /** 当前激活 tab 是否存量行（存量行不可删除） */
  const activeStock = computed(() => projects.value[activeIdx.value]?.stock ?? false);

  function addProject() {
    projects.value.push({ _uid: nextUid(), stock: false, data: {} });
    activeIdx.value = projects.value.length - 1;
  }

  function removeProject() {
    const [removed] = projects.value.splice(activeIdx.value, 1);
    if (removed) {
      itemRefs.delete(removed._uid);
    }
    if (!projects.value.length) {
      projects.value = [{ _uid: nextUid(), stock: false, data: {} }];
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
    /** 保存值只含填报行（存量行后端跳过，不发送以免 fillFlag 丢失被当新行重复入库） */
    getFieldsValue: () => ({
      projects: projects.value.filter((p) => !p.stock).map((p) => itemRefs.get(p._uid)?.getFieldsValue() ?? {}),
    }),
    exportRows: (): [string, string][] => {
      const rows: [string, string][] = [];
      projects.value.forEach((p, i) => {
        const inst = itemRefs.get(p._uid);
        rows.push([`项目${i + 1}${p.stock ? '（存量）' : ''}：${inst?.getFieldsValue().name || '未填报'}`, '']);
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
