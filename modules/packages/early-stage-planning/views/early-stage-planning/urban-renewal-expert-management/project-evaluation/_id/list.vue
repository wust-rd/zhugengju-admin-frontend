<!--
  市住更局 —— 城市更新专家管理 · 项目评估 详情页（二级页面，已接后端 /a/ure/project/detail|evals）

  从项目评估列表「查看」进入，整页展示项目全部信息。
  规划路由（RESTful，后端隐藏菜单）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/project-evaluation/{id}（{id}=记录编码 code）
   - 组件位置：early-stage-planning/urban-renewal-expert-management/project-evaluation/_id/list
   - 是否可见：隐藏；上级菜单挂「项目评估」以点亮侧边栏
  页面结构：头部卡（项目名称/状态/返回）→ 基本信息 → 主要项目内容 → 评估材料 → 参与专家（含组长标记）
  → 评估情况（组长/创建人/运维可见：专家个人评估卡片 + 综合评估结论，接 evals 接口）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <template v-if="detail">
      <!-- 头部卡 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-16px">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-12px">
              <span class="text-22px font-600 text-gray-900">{{ detail.name }}</span>
              <Tag :color="STATUS_COLOR[detail.statusCode] || 'default'">{{ detail.status }}</Tag>
            </div>
            <div class="mt-6px flex items-center gap-16px text-13px text-gray-500">
              <span>{{ detail.adminDistrict }} · {{ detail.district }}</span>
              <span>项目编号：{{ detail.code }}</span>
              <span>开始时间：{{ detail.startDate }}</span>
            </div>
          </div>
          <a-button @click="goBack">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:arrow-left-outlined"></span> 返回列表
            </span>
          </a-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">基本信息</div>
        <div class="mt-16px grid grid-cols-3 gap-x-16px gap-y-12px text-14px">
          <div class="min-w-0">
            <div class="text-12px text-gray-400">行政区</div>
            <div class="mt-4px text-gray-700">{{ detail.adminDistrict }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">片区名称</div>
            <div class="mt-4px text-gray-700">{{ detail.district }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">评估模式</div>
            <div class="mt-4px text-gray-700">{{ detail.reviewMode }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">统筹主体</div>
            <div class="mt-4px text-gray-700">{{ detail.coordinator }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">实施主体</div>
            <div class="mt-4px text-gray-700">{{ detail.implementOrg }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">责任部门</div>
            <div class="mt-4px text-gray-700">{{ detail.dept }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">资金来源</div>
            <div class="mt-4px text-gray-700">{{ detail.fundSource || '—' }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">项目投资估算（亿元）</div>
            <div class="mt-4px text-gray-700">{{ detail.investment || '—' }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">组长</div>
            <div class="mt-4px text-gray-700">{{ detail.leaderName || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- 主要项目内容 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">主要项目内容</div>
        <p class="mt-12px whitespace-pre-wrap text-14px leading-26px text-gray-700">{{ detail.content || '—' }}</p>
      </div>

      <!-- 评估材料 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">评估材料（{{ (detail.materials ?? []).length }}）</div>
        <div class="mt-12px space-y-10px">
          <div
            v-for="(m, i) in detail.materials ?? []"
            :key="i"
            class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-12px"
          >
            <span class="i-ant-design:file-text-outlined text-18px text-[#3A8EF6]"></span>
            <span class="flex-1 truncate text-14px text-gray-700" :title="m">{{ m }}</span>
          </div>
          <div v-if="(detail.materials ?? []).length === 0" class="text-13px text-gray-400">无评估材料</div>
        </div>
      </div>

      <!-- 参与专家 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">参与专家（{{ (detail.experts ?? []).length }} 名）</div>
        <div class="mt-12px grid grid-cols-3 gap-16px">
          <div
            v-for="expert in detail.experts ?? []"
            :key="expert.id"
            class="rd-8px b-1 b-solid b-gray-100 p-16px"
            :class="expert.isLeader ? 'border-[#3A8EF6] bg-[#F0F6FF]' : ''"
          >
            <div class="flex items-center gap-10px">
              <div
                class="size-40px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-16px font-500"
              >
                {{ expert.name.slice(0, 1) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-6px">
                  <span class="text-15px font-500 text-gray-800">{{ expert.name }}</span>
                  <span
                    v-if="expert.isLeader"
                    class="rd-4px px-6px py-2px text-12px text-white"
                    style="background: #3a8ef6"
                    >组长</span
                  >
                </div>
                <div class="mt-4px truncate text-13px text-gray-500">{{ expert.org || '—' }}</div>
                <div class="mt-2px text-13px text-gray-500">{{ expert.phone || '—' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 评估情况（组长/创建人/运维可见：个人评估卡片 + 综合评估） -->
      <div v-if="evalsData" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">评估情况</div>

        <!-- 专家个人评估卡片 -->
        <div class="mt-12px grid grid-cols-3 gap-16px">
          <div
            v-for="member in evalsData.memberEvals ?? []"
            :key="member.expertId"
            class="rd-8px p-16px"
            style="background: #f5f9fd"
          >
            <div class="flex items-center gap-8px">
              <div class="flex size-36px items-center justify-center rd-full bg-cyan-100 text-14px font-500 text-cyan-700">
                {{ (member.name ?? '').slice(0, 1) }}
              </div>
              <span class="text-15px font-500 text-gray-800">{{ member.name }}</span>
              <span v-if="member.isLeader" class="rd-4px px-6px py-2px text-12px text-white" style="background: #3a8ef6"
                >组长</span
              >
              <Tag class="ml-auto" :color="member.evalResult === '通过' ? 'success' : 'error'">{{
                member.evalResult
              }}</Tag>
            </div>
            <div class="mt-4px text-12px text-gray-400">评估时间：{{ member.evalDate || '—' }}</div>
            <div class="mt-8px line-clamp-3 whitespace-pre-wrap text-13px leading-22px text-gray-600">{{
              member.evalOpinion || '—'
            }}</div>
            <div v-if="(member.evalAttachments ?? []).length" class="mt-8px flex flex-col gap-4px">
              <span
                v-for="(f, fi) in member.evalAttachments"
                :key="fi"
                class="flex items-center gap-6px truncate text-12px text-[#3A8EF6]"
              >
                <span class="i-ant-design:paper-clip-outlined"></span>{{ f }}
              </span>
            </div>
          </div>
          <div
            v-if="(evalsData.memberEvals ?? []).length === 0"
            class="col-span-3 rd-8px p-16px text-13px text-gray-400"
            style="background: #f5f9fd"
          >
            暂无专家个人评估
          </div>
        </div>

        <!-- 综合评估结论 -->
        <div v-if="evalsData.comprehensive" class="mt-16px rd-8px b-1 b-solid b-[#BBD8F5] bg-[#F0F6FF] p-16px">
          <div class="flex items-center gap-8px">
            <span class="text-15px font-600 text-gray-800">综合评估（组长）</span>
            <Tag :color="evalsData.comprehensive.evalResult === '通过' ? 'success' : 'error'">{{
              evalsData.comprehensive.evalResult
            }}</Tag>
          </div>
          <div class="mt-8px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{
            evalsData.comprehensive.evalOpinion || '—'
          }}</div>
          <div v-if="(evalsData.comprehensive.evalAttachments ?? []).length" class="mt-8px flex flex-wrap gap-12px">
            <span
              v-for="(f, fi) in evalsData.comprehensive.evalAttachments"
              :key="fi"
              class="flex items-center gap-6px text-12px text-[#3A8EF6]"
            >
              <span class="i-ant-design:paper-clip-outlined"></span>{{ f }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex h-300px items-center justify-center text-14px text-gray-400">
      {{ loading ? '加载中…' : '未找到该项目' }}
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectDetail">
  import { onMounted, ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { ureProjectDetail, ureProjectEvals } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import type { UreProjectDetail, UreProjectEvals } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';

  const go = useGo();
  const { showMessage } = useMessage();

  /** 状态颜色（0待提交=橙，1评估中=蓝，2待评价=紫，3已完成=绿） */
  const STATUS_COLOR: Record<string, string> = {
    '0': 'warning',
    '1': 'processing',
    '2': 'purple',
    '3': 'success',
  };

  const { params, query } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}：路由参数名与占位符一致；{id} 为记录编码 code
  const projectCode = String((params.id ?? params.code ?? query.code) ?? '');

  const detail = ref<UreProjectDetail | null>(null);
  const evalsData = ref<UreProjectEvals | null>(null);
  const loading = ref(true);

  onMounted(async () => {
    if (!projectCode) {
      loading.value = false;
      return;
    }
    try {
      detail.value = await ureProjectDetail(projectCode);
    } catch (e) {
      showMessage((e as Error)?.message || '项目加载失败');
    } finally {
      loading.value = false;
    }
    // 评估情况：仅组长/创建人/运维可见（普通组员 403 业务提示，静默忽略）
    if (detail.value) {
      try {
        evalsData.value = await ureProjectEvals(projectCode);
      } catch (e) {
        evalsData.value = null;
      }
    }
  });

  function goBack() {
    go('/early-stage-planning/urban-renewal-expert-management/project-evaluation/index');
  }
</script>
