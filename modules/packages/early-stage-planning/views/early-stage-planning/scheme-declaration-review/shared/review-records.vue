<!--
  审查记录展示件（scheme-declaration-review 共用）—— 单条时间线，按时间正序（最早在前）

  条目类型（混合后按时间升序排列）：
   1. **联合审查轮次块**（`kind='round'`）：轮次标题 + **每个联合审查单位一个 tab**，
      tab 上直接标「已审查 / 未审查」（未审查红色，主审单位一眼看到谁没审），
      点击 tab 切换显示该单位的审查意见（未提交则提示尚未提交）；
      —— 联审单位视角（viewerUnit）不分 tab：只显示自己那一条记录 +
      **与本轮关联的那一条主审意见**（本轮推送之后、下一轮推送之前的主审意见；
      主审点了通过/退回之后本轮即结束，之后再发起的联合审查与它无关，除非再次被勾选）。
   2. **主审意见卡**（`kind='record'`）：主审单位 / 填报单位视角下，主审历次意见单独成条目。

  排序：全部条目按时间正序（`YYYY-MM-DD HH:mm:ss` 字符串比较即时间先后），
  同一时间点轮次块排在前。左侧竖线 + 圆点区分类型（轮次=灰 / 主审=蓝 / 联审=紫）。

  可见范围（props，业务口径）：
    - showJoint / showMain：显示哪类记录（**填报单位只看主审 → showJoint=false**，
      标题变「片区申报审核结果」；主审/联审 = 两类都看 → 标题「审查记录」）；
    - viewerUnit：联审单位视角 —— 只看自己被指派的轮次、自己那条记录、以及与各轮关联的主审意见。
  数据由调用方传入（后端 schemeReview/form 的 records + rounds，已按查看者角色过滤）。
-->
<template>
  <div class="flex flex-col gap-12px">
    <div class="text-15px font-600 text-gray-800">{{ title }}</div>

    <div v-if="!items.length" class="rd-6px bg-[#f7f9fc] px-12px py-10px text-12px text-gray-400"> 暂无审查记录。 </div>

    <!-- 时间线：左侧竖线 + 圆点，条目按时间正序 -->
    <div v-else class="flex flex-col gap-16px border-0 border-l-1px border-l-solid border-[#e5e7eb] pl-16px">
      <div v-for="(item, index) in items" :key="index" class="relative">
        <!-- 时间轴圆点（轮次=灰 / 主审=蓝 / 联审=紫） -->
        <span
          class="absolute left-[-20px] top-4px h-8px w-8px rd-full border-2px border-white"
          :style="{ background: dotColor(item) }"
        ></span>

        <!-- 轮次块：本轮的联审单位 tab + 选中单位的意见 -->
        <div v-if="item.kind === 'round'" class="flex flex-col gap-10px">
          <div class="flex flex-wrap items-center gap-8px text-13px text-gray-600">
            <span class="font-500">第{{ roundText(item.round) }}次联合审查单位：</span>
            <span v-if="viewerUnit" class="text-12px text-gray-400">
              （贵单位：{{ item.records.length ? '已提交' : '未提交' }}）
            </span>
            <span v-else class="text-12px text-gray-400">（已提交 {{ item.submitted }}/{{ item.total }}）</span>
            <span class="text-12px text-gray-400">{{ item.time }}</span>
          </div>

          <!-- 主审/填报单位视角：一个单位一个 tab，tab 上标已审查/未审查 -->
          <template v-if="!viewerUnit">
            <div class="flex flex-wrap items-center gap-8px">
              <div
                v-for="unit in item.units"
                :key="unit.code"
                class="flex cursor-pointer items-center gap-4px rd-4px border-1px border-solid px-10px py-5px text-13px transition-colors"
                :class="
                  activeCode(item) === unit.code
                    ? 'border-[#3A8EF6] bg-[#eef4fb] font-500 text-[#1677ff]'
                    : 'border-[#e5e7eb] bg-white text-gray-600 hover:border-[#9cc4f5]'
                "
                @click="activeUnit[item.round] = unit.code"
              >
                <span>{{ unit.name }}</span>
                <span class="text-12px" :class="recordOf(item, unit) ? 'text-[#52c41a]' : 'text-[#f5222d]'">
                  {{ recordOf(item, unit) ? '已审查' : '未审查' }}
                </span>
              </div>
            </div>
            <!-- 选中单位的意见 / 未提交提示 -->
            <RecordCard v-if="selectedRecord(item)" :record="selectedRecord(item)" />
            <div v-else class="rd-6px bg-[#f7f9fc] px-12px py-10px text-12px text-gray-400">
              该单位尚未提交审查意见。
            </div>
          </template>

          <!-- 联审单位视角：自己那条记录 + 与本轮关联的主审意见 -->
          <template v-else>
            <RecordCard v-if="item.records.length" :record="item.records[0]" />
            <div v-else class="rd-6px bg-[#f7f9fc] px-12px py-10px text-12px text-gray-400">
              贵单位本轮未提交审查意见。
            </div>
            <div v-if="item.mainAfter" class="flex flex-col">
              <div class="mb-4px text-12px text-gray-400">本轮关联的主审单位意见：</div>
              <RecordCard :record="item.mainAfter" />
            </div>
          </template>
        </div>

        <!-- 主审意见卡（主审 / 填报单位视角） -->
        <RecordCard v-else :record="item.record" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationReviewRecords">
  import { computed, reactive } from 'vue';
  import RecordCard from './review-record-card.vue';
  import { roundText } from './review-constants';
  import type {
    EspJointRound,
    EspReviewRecord,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';

  const props = withDefaults(
    defineProps<{
      /** 审查记录（后端已按查看者角色过滤；主审=全部、填报=仅主审、联审=本部门+关联主审） */
      records?: EspReviewRecord[];
      /** 联合审查轮次（各轮指派单位 + 推送时间） */
      rounds?: EspJointRound[];
      /** 显示联合审查意见（填报单位只看主审 → 传 false） */
      showJoint?: boolean;
      /** 显示主审意见 */
      showMain?: boolean;
      /** 联审单位名称：按「只看自己那条 + 轮次关联主审意见」的紧凑形态展示；不传=全量形态 */
      viewerUnit?: string;
    }>(),
    { records: () => [], rounds: () => [], showJoint: true, showMain: true, viewerUnit: undefined },
  );

  /** 时间线条目：轮次块 / 主审意见卡 */
  type RoundItem = {
    kind: 'round';
    time: string;
    round: number;
    units: EspJointRound['units'];
    /** 可见的联审记录（主审视角=本轮全部；联审视角=自己那条） */
    records: EspReviewRecord[];
    submitted: number;
    total: number;
    /** 与本轮关联的主审意见（联审单位视角用：本轮推送之后、下一轮推送之前的那一条） */
    mainAfter?: EspReviewRecord;
  };
  type TimelineItem = RoundItem | { kind: 'record'; time: string; record: EspReviewRecord };

  /** 联审单位视角：只保留它被指派的轮次；主审/填报单位视角：全部轮次 */
  const rounds = computed(() => {
    if (!props.viewerUnit) return props.rounds;
    return props.rounds.filter((item) => item.units.some((unit) => unit.name === props.viewerUnit));
  });

  /** 时间线条目：轮次块 + 主审意见卡，按时间正序（同时间轮次块在前） */
  const items = computed<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];
    const allRecords = props.records;
    const allRounds = props.rounds;
    // 主审记录正序（接口按提交顺序返回，倒序取最新在前的语义由展示端处理）
    const mainsAsc = allRecords.filter((record) => record.role === 'main');
    if (props.showJoint) {
      for (const round of rounds.value) {
        const records = allRecords.filter(
          (record) =>
            record.role === 'joint' &&
            record.round === round.round &&
            (!props.viewerUnit || record.unitName === props.viewerUnit),
        );
        // 本轮关联的主审意见＝本轮推送之后、下一轮推送之前的那一条（联审单位视角才给）
        let mainAfter: EspReviewRecord | undefined;
        if (props.viewerUnit) {
          const roundIndex = allRounds.findIndex((item) => item.round === round.round);
          const nextTime = allRounds[roundIndex + 1]?.pushTime;
          mainAfter = mainsAsc.find(
            (record) => record.reviewTime >= (round.pushTime ?? '') && (!nextTime || record.reviewTime < nextTime),
          );
        }
        list.push({
          kind: 'round',
          time: round.pushTime ?? '',
          round: round.round,
          units: round.units,
          records,
          submitted: records.length,
          total: round.units.length,
          mainAfter,
        });
      }
    }
    // 联审单位视角：主审意见已并入轮次块，不再单列
    if (props.showMain && !props.viewerUnit) {
      for (const record of mainsAsc) {
        list.push({ kind: 'record', time: record.reviewTime, record });
      }
    }
    return list.sort((a, b) => (a.time === b.time ? (a.kind === 'round' ? -1 : 1) : a.time < b.time ? -1 : 1));
  });

  /** 板块标题：两类都看=审查记录；只看主审=片区申报审核结果；只看联审=联合审查结果 */
  const title = computed(() => {
    if (props.showJoint && props.showMain) return '审查记录';
    return props.showMain ? '片区申报审核结果' : '联合审查结果';
  });

  // ---------------- 轮次 tab（主审/填报单位视角） ----------------

  /** 各轮次当前选中的单位 code（点击 tab 写入） */
  const activeUnit = reactive<Record<number, string>>({});

  /** 选中 code：用户点过就用点过的；否则默认落到「第一个已提交的单位」，没有则第一个单位 */
  function activeCode(item: RoundItem): string {
    const saved = activeUnit[item.round];
    if (saved && item.units.some((unit) => unit.code === saved)) return saved;
    const firstSubmitted = item.units.find((unit) => recordOf(item, unit));
    return (firstSubmitted ?? item.units[0])?.code ?? '';
  }

  /** 某单位在本轮的记录（未提交则 undefined） */
  function recordOf(item: RoundItem, unit: { name: string }): EspReviewRecord | undefined {
    return item.records.find((record) => record.unitName === unit.name);
  }

  /** 当前 tab 对应的记录 */
  function selectedRecord(item: RoundItem): EspReviewRecord | undefined {
    const unit = item.units.find((u) => u.code === activeCode(item));
    return unit ? recordOf(item, unit) : undefined;
  }

  function dotColor(item: TimelineItem): string {
    if (item.kind === 'round') return '#c9d3e0';
    return item.record.role === 'main' ? '#1677ff' : '#722ed1';
  }
</script>
