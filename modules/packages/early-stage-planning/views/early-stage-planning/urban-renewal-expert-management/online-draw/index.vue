<!--
  市住更局 —— 城市更新专家管理 · 在线抽取（已接后端 /a/ure/draw/*）

  按条件从城市更新专家库随机抽取专家：上方抽取器（项目名称/实施主体/统筹主体 + 专业领域多选 + 抽取人数 + 抽取/重置），
  下方抽取结果卡片（「确认选用」与单卡「随机更换」「指定人员」）；随机逻辑在后端（excludeIds 排除当前批次）。
  点击确认选用生成一条抽取记录（后端落库并把专家置「已入选」）；右侧「查看详情」查看记录与抽取的专家。
  挑选模式：从新增项目「去抽取」进入，返回时把最近一次确认选用的专家带回表单。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px p-16px">
    <!-- 挑选模式提示：从新增项目「去抽取」进入；右上角「返回」带回中间专家卡片 -->
    <div
      v-if="store.pickMode"
      class="flex items-center gap-12px rd-8px bg-[#EAF3FF] px-16px py-10px text-13px text-[#1C6BC2]"
    >
      <span class="flex-1"
        >当前为新增项目挑选参与专家：每次「确认选用」生成一条抽取记录；点右上角「返回」把最近一次确认选用的专家带回新增项目表单（从未确认选用则不带回）。</span
      >
      <a-button size="small" type="primary" @click="handleBack">
        <span class="inline-flex items-center gap-4px">
          <span class="i-ant-design:arrow-left-outlined"></span> 返回
        </span>
      </a-button>
    </div>
    <!-- 抽取器 -->
    <div class="rd-10px p-16px" style="background-color: rgba(15, 23, 42, 0.02)">
      <div
        class="flex rd-12px flex-wrap items-center gap-x-24px gap-y-12px bg-white p-8px"
        style="box-shadow: 0 16px 36px -20px rgba(76, 132, 192, 0.12)"
      >
        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4 px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">项目名称</span>
          <Input v-model:value="query.name" placeholder="请输入项目名称" class="w-200px rd-8px" :bordered="false" />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4 px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">实施主体</span>
          <Input
            v-model:value="query.implementOrg"
            placeholder="请输入实施主体"
            class="w-200px rd-8px"
            :bordered="false"
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4 px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">统筹主体</span>
          <Input
            v-model:value="query.coordinator"
            placeholder="请输入统筹主体"
            class="w-200px rd-8px"
            :bordered="false"
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px b-1 b-solid b-black/4 rd-8px px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">专业领域</span>
          <Select
            v-model:value="query.fields"
            :options="fieldOptions"
            placeholder="请选择（多选）"
            mode="multiple"
            class="w-220px rd-8px"
            allowClear
            showSearch
            :bordered="false"
            :max-tag-count="'responsive'"
          />
        </div>

        <div class="flex items-center gap-12px">
          <span class="text-14px text-gray-600">抽取人数</span>
          <InputNumber v-model:value="query.count" :min="3" :max="7" class="w-90px" />
        </div>

        <div class="ml-auto flex items-center gap-12px">
          <a-button @click="handleReset" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 重置
            </span>
          </a-button>
          <a-button type="primary" :loading="drawing" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px"> <span class="i-ri:search-2-line"></span> 抽取 </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 抽取结果 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:team-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">抽取结果</span>
        <span v-if="lastPoolSize !== null" class="text-13px text-gray-400">（候选池 {{ lastPoolSize }} 人）</span>

        <div class="ml-auto flex items-center gap-12px">
          <a-button type="primary" :disabled="results.length === 0" :loading="confirming" @click="handleConfirm" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:check-outlined"></span> 确认选用
            </span>
          </a-button>
        </div>
      </div>

      <div class="mt-16px flex h-300px items-stretch gap-16px overflow-x-auto bg-[#519bd40a] rd-8px p-12px">
        <template v-if="results.length > 0">
          <div
            v-for="expert in results"
            :key="expert.id"
            class="relative rd-12px p-20px shadow-sm transition-shadow hover:shadow-md w-500px h-218px shrink-0 bg-white overflow-hidden"
          >
            <!-- 头部：头像 + 姓名 + 职称徽标（黄色勾 + 浅黄底）+ 专业标签（浅蓝底）+ 单位 -->
            <div class="flex gap-16px h-58px items-center">
              <div
                class="size-48px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-18px font-500"
              >
                {{ expert.name.slice(0, 1) }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="text-16px font-500 text-gray-800">{{ expert.name }}</div>

                <div class="flex items-center gap-6px overflow-hidden">
                  <!-- 职称：勾图标 + 浅黄底徽标 -->
                  <div
                    class="inline-flex shrink-0 items-center gap-2px rd-4px px-6px py-2px text-12px text-amber-500"
                    :style="{ background: '#FDF3E0' }"
                  >
                    <div class="i-ant-design:check-circle-filled"></div>
                    {{ expert.title }}
                  </div>

                  <!-- 专业领域：浅蓝底标签 -->
                  <div
                    class="inline-flex shrink-0 items-center rd-4px px-6px py-2px text-12px text-gray-800"
                    :style="{ background: '#EFF6FF' }"
                  >
                    {{ expert.field }}
                  </div>
                  <!-- 单位名称 -->
                  <div class="min-w-0 flex-1 truncate text-13px text-gray-800">{{ expert.org }}</div>
                </div>
              </div>
            </div>

            <!-- 履历摘要：浅色底块 -->
            <div class="mt-12px rd-8px p-10px" :style="{ background: '#F5F9FD' }">
              <div class="line-clamp-2 text-14px leading-22px text-gray-600">
                {{ expert.career }}
                <a class="whitespace-nowrap font-500 text-cyan-600" @click="openExpertDetail(expert)">... 更多信息 ></a>
              </div>
            </div>

            <!-- 底部：电话 + 单卡操作（浅蓝底按钮） -->
            <div class="mt-12px flex items-center justify-between">
              <span class="flex items-center gap-6px text-13px text-gray-700">
                <span class="i-ant-design:phone-outlined"></span>
                {{ expert.phone }}
              </span>
              <div class="flex items-center gap-8px">
                <a-button
                  @click="replaceOne(expert)"
                  class="rd-8px"
                  :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
                >
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:redo-outlined"></span> 随机更换
                  </span>
                </a-button>
                <a-button
                  type="primary"
                  @click="openAssign(expert)"
                  class="rd-8px"
                  :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
                >
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:user-add-outlined"></span> 指定人员
                  </span>
                </a-button>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="flex w-full items-center justify-center text-14px text-gray-400">
          请设置抽取条件后点击「抽取」
        </div>
      </div>
    </div>

    <!-- 抽取记录 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:file-text-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">抽取记录</span>
      </div>

      <BasicTable @register="registerTable" :showIndexColumn="false" class="px-16px pb-16px">
        <template #expert0="{ record }">{{ record.expertNames?.[0] || '-' }}</template>
        <template #expert1="{ record }">{{ record.expertNames?.[1] || '-' }}</template>
        <template #expert2="{ record }">{{ record.expertNames?.[2] || '-' }}</template>
        <template #expert3="{ record }">{{ record.expertNames?.[3] || '-' }}</template>
        <template #expert4="{ record }">{{ record.expertNames?.[4] || '-' }}</template>
        <template #expert5="{ record }">{{ record.expertNames?.[5] || '-' }}</template>
        <template #expert6="{ record }">{{ record.expertNames?.[6] || '-' }}</template>
        <template #operation="{ record }">
          <a-button type="link" @click="showRecordDetail(record)">查看详情</a-button>
        </template>
      </BasicTable>
    </div>

    <!-- 抽取记录详情 Modal -->
    <Modal
      v-model:open="detailModal.open"
      :title="`抽取记录详情 - ${detailModal.record?.projectName ?? ''}`"
      width="760px"
      centered
      :footer="null"
    >
      <div v-if="detailModal.record" class="mt-8px flex flex-col gap-12px">
        <div class="grid grid-cols-3 gap-x-16px gap-y-10px text-15px text-gray-700">
          <div class="min-w-0">
            <div class="text-14px text-gray-400">抽取时间</div>
            <div class="mt-2px truncate">{{ detailModal.record.drawDate }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-14px text-gray-400">抽取人数</div>
            <div class="mt-2px truncate">{{ detailModal.record.drawCount }} 人</div>
          </div>
          <div class="min-w-0">
            <div class="text-14px text-gray-400">实施主体</div>
            <div class="mt-2px truncate">{{ detailModal.record.implementOrg || '-' }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-14px text-gray-400">统筹主体</div>
            <div class="mt-2px truncate">{{ detailModal.record.coordinator || '-' }}</div>
          </div>
          <div class="col-span-2 min-w-0">
            <div class="text-14px text-gray-400">抽取领域</div>
            <div class="mt-2px truncate">{{ detailModal.record.drawFields || '不限' }}</div>
          </div>
        </div>

        <!-- 抽取的专家（tab 切换查看） -->
        <div class="border-t border-gray-100 pt-10px">
          <div class="text-14px text-gray-400"
            >抽取的专家（{{ (detailModal.record.experts ?? []).length }} 名，点击姓名切换）</div
          >

          <Tabs class="mt-8px">
            <Tabs.TabPane v-for="expert in detailModal.record.experts ?? []" :key="expert.id" :tab="expert.name">
              <div class="pt-4px">
                <!-- 职称/领域徽标 -->
                <div class="flex items-center gap-8px">
                  <span class="rd-4px px-6px py-2px text-14px text-amber-500" :style="{ background: '#FDF3E0' }">{{
                    expert.title
                  }}</span>
                  <span class="rd-4px px-6px py-2px text-14px text-gray-800" :style="{ background: '#EFF6FF' }">{{
                    expert.field
                  }}</span>
                </div>

                <!-- 信息栅格 -->
                <div class="mt-12px grid grid-cols-3 gap-x-16px gap-y-8px text-15px">
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">性别</div
                    ><div class="mt-2px text-gray-700">{{ expert.gender }}</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">年龄</div
                    ><div class="mt-2px text-gray-700">{{ expert.age }} 岁</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">联系电话</div
                    ><div class="mt-2px text-gray-700">{{ expert.phone }}</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">单位名称</div
                    ><div class="mt-2px text-gray-700">{{ expert.org }}</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">单位性质</div
                    ><div class="mt-2px text-gray-700">{{ expert.orgType }}</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">入库时间</div
                    ><div class="mt-2px text-gray-700">{{ expert.joinDate }}</div></div
                  >
                  <div class="min-w-0"
                    ><div class="text-14px text-gray-400">是否已入选</div
                    ><div class="mt-2px text-gray-700">{{ expert.selected ? '是' : '否' }}</div></div
                  >
                </div>

                <!-- 主要经历 -->
                <div class="mt-10px border-t border-gray-100 pt-8px">
                  <div class="text-14px text-gray-400">主要经历</div>
                  <div class="mt-4px whitespace-pre-wrap text-15px leading-24px text-gray-700">{{ expert.career }}</div>
                </div>

                <!-- 过往评审经历 -->
                <div class="mt-10px border-t border-gray-100 pt-8px">
                  <div class="text-14px text-gray-400">过往评审经历</div>
                  <div class="mt-4px whitespace-pre-wrap text-15px leading-24px text-gray-700">{{
                    expert.reviewExperience
                  }}</div>
                </div>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    </Modal>

    <!-- 指定人员 Modal：姓名关键词搜索 + 专业领域筛选（后端分页接口），单选一名专家 -->
    <Modal
      v-model:open="assignModal.open"
      title="指定人员"
      width="760px"
      centered
      ok-text="确定"
      cancel-text="取消"
      :ok-button-props="{ disabled: !assignModal.selectedId }"
      @ok="confirmAssign"
    >
      <div class="flex flex-col gap-12px py-4px">
        <div class="flex items-center gap-12px">
          <Input
            v-model:value="assignModal.keyword"
            class="flex-1"
            placeholder="输入专家姓名进行搜索"
            allowClear
          >
            <template #prefix><span class="i-ant-design:search-outlined text-gray-400"></span></template>
          </Input>
          <Select
            v-model:value="assignModal.field"
            :options="fieldOptions"
            placeholder="专业领域（全部）"
            allowClear
            class="w-200px"
          />
        </div>

        <div class="overflow-y-auto rd-8px b-1 b-solid b-black/6 p-6px" style="max-height: 360px">
          <template v-if="assignCandidates.length > 0">
            <div
              v-for="expert in assignCandidates"
              :key="expert.id"
              class="flex cursor-pointer items-center gap-12px rd-8px b-1 b-solid px-12px py-10px transition-colors"
              :class="
                assignModal.selectedId === expert.id ? 'b-[#519BD4] bg-[#f0f7fd]' : 'b-transparent hover:bg-[#f5f9fd]'
              "
              @click="assignModal.selectedId = expert.id"
            >
              <span
                class="flex size-18px shrink-0 items-center justify-center rd-full b-2 b-solid transition-colors"
                :class="assignModal.selectedId === expert.id ? 'b-[#519BD4]' : 'b-gray-300'"
              >
                <span v-if="assignModal.selectedId === expert.id" class="size-10px rd-full bg-[#519BD4]"></span>
              </span>

              <div
                class="flex size-36px shrink-0 items-center justify-center rd-full bg-cyan-100 text-14px font-500 text-cyan-700"
              >
                {{ expert.name.slice(0, 1) }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-6px">
                  <span class="text-14px font-500 text-gray-800">{{ expert.name }}</span>
                  <span class="rd-4px px-6px py-2px text-12px text-amber-500" :style="{ background: '#FDF3E0' }">{{
                    expert.title
                  }}</span>
                  <span class="rd-4px px-6px py-2px text-12px text-gray-800" :style="{ background: '#EFF6FF' }">{{
                    expert.field
                  }}</span>
                </div>
                <div class="mt-2px truncate text-12px text-gray-500">{{ expert.org }}</div>
              </div>

              <span class="flex shrink-0 items-center gap-4px text-13px text-gray-600">
                <span class="i-ant-design:phone-outlined"></span>{{ expert.phone }}
              </span>
            </div>
          </template>
          <a-empty v-else class="py-24px" :image-style="{ height: '48px' }" description="未找到匹配的专家" />
        </div>
      </div>
    </Modal>

    <!-- 专家详情 Modal（履历摘要「更多信息」） -->
    <Modal
      v-model:open="expertModal.open"
      :title="`专家详情 - ${expertModal.expert?.name ?? ''}`"
      width="720px"
      centered
      :footer="null"
    >
      <div v-if="expertModal.expert" class="mt-8px flex flex-col gap-12px">
        <div class="grid grid-cols-3 gap-x-16px gap-y-10px text-13px text-gray-700">
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">姓名</div
            ><div class="mt-2px truncate">{{ expertModal.expert.name }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">性别</div
            ><div class="mt-2px truncate">{{ expertModal.expert.gender }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">年龄</div
            ><div class="mt-2px truncate">{{ expertModal.expert.age }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">职称</div
            ><div class="mt-2px truncate">{{ expertModal.expert.title }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">专业领域</div
            ><div class="mt-2px truncate">{{ expertModal.expert.field }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">联系电话</div
            ><div class="mt-2px truncate">{{ expertModal.expert.phone }}</div></div
          >
          <div class="col-span-2 min-w-0"
            ><div class="text-12px text-gray-400">单位名称</div
            ><div class="mt-2px truncate">{{ expertModal.expert.org }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">单位性质</div
            ><div class="mt-2px truncate">{{ expertModal.expert.orgType }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">入库时间</div
            ><div class="mt-2px truncate">{{ expertModal.expert.joinDate }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">是否已入选</div
            ><div class="mt-2px truncate">{{ expertModal.expert.selected ? '是' : '否' }}</div></div
          >
        </div>

        <div class="border-t border-gray-100 pt-10px">
          <div class="text-12px text-gray-400">主要经历</div>
          <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{
            expertModal.expert.career
          }}</div>
        </div>

        <div class="border-t border-gray-100 pt-10px">
          <div class="text-12px text-gray-400">过往评审经历</div>
          <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{
            expertModal.expert.reviewExperience
          }}</div>
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertOnlineDraw">
  import { onMounted, reactive, ref, watch } from 'vue';
  import { Input, InputNumber, message, Modal, Select, Tabs } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import {
    ureDictOptions,
    ureExpertPage,
    type UreExpert,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import {
    ureDrawConfirm,
    ureDrawDraw,
    ureDrawRecord,
    ureDrawRecords,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-draw';
  import type { UreDrawRecord } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-draw';
  import { useUrbanExpertStore } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  // ── 字典（专业领域） ─────────────────────────────────────────────

  /** 专业领域选项（字典接口加载） */
  const fieldList = ref<string[]>([]);
  const fieldOptions = ref<{ label: string; value: string }[]>([]);

  onMounted(async () => {
    try {
      const dict = await ureDictOptions();
      fieldList.value = dict.fields ?? [];
      fieldOptions.value = fieldList.value.map((f) => ({ label: f, value: f }));
      if (query.fields.length === 0) {
        query.fields = [...fieldList.value];
      }
    } catch (e) {
      // 字典加载失败不阻塞页面，抽取时传空领域=不限
    }
  });

  /** 抽取条件 */
  const query = reactive({
    name: '',
    implementOrg: '',
    coordinator: '',
    fields: [] as string[],
    count: 3,
  });

  /** 挑选模式开启时，自动带入新增项目表单的项目名称/实施主体/统筹主体（watch+immediate，组件挂载前/后都能生效） */
  watch(
    () => store.pickMode,
    (v) => {
      if (v) {
        query.name = store.pickInfo.name;
        query.implementOrg = store.pickInfo.implementOrg;
        query.coordinator = store.pickInfo.coordinator;
      }
    },
    { immediate: true },
  );

  /** 抽取结果 */
  const results = ref<UreExpert[]>([]);
  const drawing = ref(false);
  const confirming = ref(false);
  /** 最近一次抽取的候选池人数（提示用） */
  const lastPoolSize = ref<number | null>(null);

  // ── 抽取记录表格 ─────────────────────────────────────────────────

  /** 专家1~专家7 列（不足数量显示 -） */
  const expertColumns: BasicColumn[] = Array.from({ length: 7 }, (_, i) => ({
    title: `专家${i + 1}`,
    dataIndex: 'expertNames',
    width: 84,
    align: 'center',
    slot: `expert${i}`,
  }));

  /** 抽取记录列表列 */
  const recordColumns: BasicColumn[] = [
    { title: '项目名称', dataIndex: 'projectName', width: 180, ellipsis: true },
    { title: '实施主体', dataIndex: 'implementOrg', width: 130, ellipsis: true },
    { title: '统筹主体', dataIndex: 'coordinator', width: 130, ellipsis: true },
    { title: '抽取领域', dataIndex: 'drawFields', width: 200, ellipsis: true },
    { title: '抽取数量', dataIndex: 'drawCount', width: 80, align: 'center' },
    ...expertColumns,
    { title: '操作', dataIndex: 'operation', width: 90, slot: 'operation' },
  ];

  const [registerTable, { reload }] = useTable({
    api: ureDrawRecords,
    columns: recordColumns,
    showTableSetting: false,
    showIndexColumn: false,
    pagination: { pageSize: 5, showSizeChanger: false, showTotal: (t: number) => `共 ${t} 条` },
    canResize: false,
    immediate: true,
  });

  /** 抽取记录详情 Modal */
  const detailModal = reactive({
    open: false,
    record: null as UreDrawRecord | null,
  });

  async function showRecordDetail(record: UreDrawRecord) {
    detailModal.open = true;
    detailModal.record = { ...record };
    try {
      detailModal.record = await ureDrawRecord(record.id);
    } catch (e) {
      // 详情加载失败保留列表行数据
    }
  }

  /** 专家详情 Modal 状态（履历摘要「更多信息」） */
  const expertModal = reactive({
    open: false,
    expert: null as UreExpert | null,
  });

  // ── 指定人员 ─────────────────────────────────────────────────────

  /** 指定人员 Modal 状态 */
  const assignModal = reactive({
    open: false,
    current: null as UreExpert | null,
    keyword: '',
    field: undefined as string | undefined,
    selectedId: null as string | null,
  });

  /** 指定人员候选列表（后端按姓名搜索，前端过滤领域与已在结果卡片上的专家） */
  const assignCandidates = ref<UreExpert[]>([]);
  let assignSearchTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => [assignModal.keyword, assignModal.field, assignModal.open],
    () => {
      if (!assignModal.open) return;
      if (assignSearchTimer) clearTimeout(assignSearchTimer);
      assignSearchTimer = setTimeout(searchAssignCandidates, 300);
    },
  );

  async function searchAssignCandidates() {
    const kw = assignModal.keyword.trim();
    try {
      const page = await ureExpertPage({ name: kw || undefined, pageNo: 1, pageSize: 50 });
      const usedIds = results.value.filter((e) => e.id !== assignModal.current?.id).map((e) => e.id);
      assignCandidates.value = page.list.filter((e) => {
        if (usedIds.includes(e.id)) return false;
        if (assignModal.field && e.field !== assignModal.field) return false;
        return true;
      });
    } catch (e) {
      assignCandidates.value = [];
    }
  }

  /** 打开专家详情 Modal（卡片履历摘要「更多信息」） */
  function openExpertDetail(expert: UreExpert) {
    expertModal.expert = expert;
    expertModal.open = true;
  }

  /** 打开指定人员 Modal（记录当前卡片专家并加载候选） */
  function openAssign(expert: UreExpert) {
    assignModal.current = expert;
    assignModal.keyword = '';
    assignModal.field = undefined;
    assignModal.selectedId = null;
    assignModal.open = true;
    searchAssignCandidates();
  }

  /** 指定人员：把选中的专家替换到该卡片 */
  function confirmAssign() {
    const matched = assignCandidates.value.find((e) => e.id === assignModal.selectedId);
    if (!matched) {
      message.warning('请先选择一名专家');
      return;
    }
    results.value = results.value.map((e) => (e.id === assignModal.current?.id ? matched : e));
    assignedIds.add(matched.id);
    assignModal.open = false;
  }

  // ── 抽取 / 更换 / 确认选用 ───────────────────────────────────────

  /** 抽取 / 整批随机更换：后端随机（excludeIds 排除当前批次，同批不重复） */
  async function doDraw(count: number, extraExcludeIds: string[] = []): Promise<UreExpert[]> {
    const fields = query.fields.length ? query.fields : [...fieldList.value];
    const excludeIds = [...results.value.map((e) => e.id), ...extraExcludeIds];
    const data = await ureDrawDraw({
      fields,
      count,
      excludeIds,
      projectName: query.name.trim() || undefined,
      implementOrg: query.implementOrg.trim() || undefined,
      coordinator: query.coordinator.trim() || undefined,
    });
    lastPoolSize.value = data.poolSize;
    return data.list;
  }

  async function handleDraw() {
    // 抽取配置未填写完整不允许抽取
    if (!query.name.trim()) {
      message.warning('请先填写项目名称');
      return;
    }
    if (!query.implementOrg.trim()) {
      message.warning('请先填写实施主体');
      return;
    }
    if (!query.coordinator.trim()) {
      message.warning('请先填写统筹主体');
      return;
    }
    if (query.fields.length === 0) {
      message.warning('请至少选择一个专业领域');
      return;
    }
    drawing.value = true;
    try {
      results.value = await doDraw(query.count);
      assignedIds.clear();
      if (results.value.length === 0) {
        message.warning('没有符合条件的专家可供抽取');
      }
    } finally {
      drawing.value = false;
    }
  }

  /** 单卡随机更换：换另一位专家，其余不动 */
  async function replaceOne(expert: UreExpert) {
    const [replacement] = await doDraw(1, [expert.id]);
    if (!replacement) {
      message.warning('没有更多符合条件的专家可供更换');
      return;
    }
    results.value = results.value.map((e) => (e.id === expert.id ? replacement : e));
  }

  /** 确认选用：后端落抽取记录并把专家置「已入选」；任何进入方式都生成记录；挑选模式不自动跳回 */
  async function handleConfirm() {
    if (results.value.length === 0) {
      showMessage('请先抽取');
      return;
    }
    confirming.value = true;
    try {
      await ureDrawConfirm({
        expertIds: results.value.map((e) => e.id),
        fields: query.fields.length ? query.fields : [...fieldList.value],
        projectName: query.name.trim() || undefined,
        implementOrg: query.implementOrg.trim() || undefined,
        coordinator: query.coordinator.trim() || undefined,
        assignFlag: results.value.some((e) => assignedIds.has(e.id)),
      });
      reload();
      if (store.pickMode) {
        store.setPickLatest(results.value.map((e) => ({ id: e.id, name: e.name, org: e.org, phone: e.phone })));
        showMessage(`已生成抽取记录（${results.value.length} 名专家），点右上角「返回」带回最新一次的专家`);
        return;
      }
      showMessage(`已确认选用 ${results.value.length} 名专家，已生成抽取记录`);
    } finally {
      confirming.value = false;
    }
  }

  /** 被指定人员替换过的专家 id（确认选用记录 assignFlag 用；整批重新抽取时清空） */
  const assignedIds = new Set<string>();

  /** 挑选模式「返回」：带回最近一次确认选用（最新一条记录）的专家；从未确认选用则不带回 */
  function handleBack() {
    if (store.pickLatest.length > 0) {
      store.setPickedExperts(store.pickLatest);
    }
    const back = store.pickReturn || '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';
    store.endPick();
    // 路由未注册（账号未授权对应菜单）时退回列表，避免静默无反应
    if (!router.resolve(back).matched.length) {
      go('/early-stage-planning/urban-renewal-expert-management/project-evaluation/index');
      return;
    }
    go(back);
  }

  /** 重置 */
  function handleReset() {
    query.name = '';
    query.implementOrg = '';
    query.coordinator = '';
    query.fields = [...fieldList.value];
    query.count = 3;
    results.value = [];
    lastPoolSize.value = null;
  }
</script>

<style>
  /* antdv Button 的内置 border-radius（默认 6px）优先级高于 UnoCSS 的 .rd-8px，
     用更高特异性 + !important 兜底，确保按钮圆角按 rd-8px（8px）生效。 */
  .ant-btn.rd-8px {
    border-radius: 8px !important;
  }
</style>
