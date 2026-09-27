<!--
  市住更局 —— 城市更新专家管理 · 项目评估页（独立路由页，已接后端 /a/ure/project/evalForm|saveEval|comprehensive）

  项目评估列表「评估中 → 评估」进入：上方展示项目全部信息（同详情页），下方按角色分区块：
  - 普通专家（图2）：「项目评估」表单（评估结果 通过/不通过 + 评估意见 + 附件），提交保存个人评估（可重复修改）；
  - 组长（图3）：「专家个人意见」组员评估卡片（只读）→「项目评估」本人表单 →「综合评估」表单；
    组员未全部提交时按钮为「保存我的评估」（仅保存个人）；全部提交后「提交」一并保存个人 + 综合评估，
    综合评估提交后项目流转「待评价」。
  规划路由（后端隐藏菜单）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate?id={项目id}
   - 组件位置：early-stage-planning/urban-renewal-expert-management/project-evaluation/evaluate
   - 是否可见：隐藏；上级菜单挂「项目评估」以点亮侧边栏
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
              <Tag v-if="detail.isLeader" color="blue">组长视角</Tag>
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
        <div class="text-16px font-600 text-gray-800">项目信息</div>
        <div class="mt-16px grid grid-cols-3 gap-x-16px gap-y-12px text-14px">
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">行政区</div
            ><div class="mt-4px text-gray-700">{{ detail.adminDistrict }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">片区名称</div
            ><div class="mt-4px text-gray-700">{{ detail.district }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">评估模式</div
            ><div class="mt-4px text-gray-700">{{ detail.reviewMode }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">统筹主体</div
            ><div class="mt-4px text-gray-700">{{ detail.coordinator }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">实施主体</div
            ><div class="mt-4px text-gray-700">{{ detail.implementOrg }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">责任部门</div
            ><div class="mt-4px text-gray-700">{{ detail.dept }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">资金来源</div
            ><div class="mt-4px text-gray-700">{{ detail.fundSource || '—' }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">项目投资估算（亿元）</div
            ><div class="mt-4px text-gray-700">{{ detail.investment || '—' }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">组长</div
            ><div class="mt-4px text-gray-700">{{ detail.leaderName || '—' }}</div></div
          >
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
        <div class="mt-12px flex flex-wrap gap-16px">
          <div
            v-for="expert in detail.experts ?? []"
            :key="expert.id"
            class="rd-8px b-1 b-solid b-gray-100 px-16px py-12px"
            :class="expert.isLeader ? 'border-[#3A8EF6] bg-[#F0F6FF]' : ''"
          >
            <div class="flex items-center gap-8px">
              <span class="text-15px font-500 text-gray-800">{{ expert.name }}</span>
              <span
                v-if="expert.isLeader"
                class="rd-4px px-6px py-2px text-12px text-white"
                style="background: #3a8ef6"
                >组长</span
              >
            </div>
            <div class="mt-2px text-13px text-gray-500">{{ expert.org || '—' }} · {{ expert.phone || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- 非评估中 / 非参与专家：仅展示信息，不显示评估表单 -->
      <div v-if="!canEvaluate" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px text-14px text-gray-500 shadow-sm">
        {{ cannotEvaluateHint }}
      </div>

      <!-- 专家个人意见（仅组长可见，图3 第一区块）：组员已提交的评估卡片（只读） -->
      <div v-if="detail.isLeader" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-12px">
          <div class="text-16px font-600 text-gray-800">专家个人意见</div>
          <span class="text-13px text-gray-400"
            >组员已提交 {{ detail.memberSubmitted ?? 0 }} / {{ detail.memberTotal ?? 0 }} 名</span
          >
        </div>
        <div class="mt-12px grid grid-cols-3 gap-16px">
          <div
            v-for="member in detail.memberEvals ?? []"
            :key="member.expertId"
            class="rd-8px p-16px"
            style="background: #f5f9fd"
          >
            <div class="flex items-center gap-8px">
              <div class="flex size-36px items-center justify-center rd-full bg-cyan-100 text-14px font-500 text-cyan-700">
                {{ (member.name ?? '').slice(0, 1) }}
              </div>
              <span class="text-15px font-500 text-gray-800">{{ member.name }}</span>
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
            v-if="(detail.memberEvals ?? []).length === 0"
            class="col-span-3 rd-8px p-16px text-13px text-gray-400"
            style="background: #f5f9fd"
          >
            组员尚未提交个人评估
          </div>
        </div>
      </div>

      <!-- 项目评估（本人表单，图2 / 图3 中区块） -->
      <div v-if="canEvaluate" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-12px">
          <div class="text-16px font-600 text-gray-800">项目评估</div>
          <span v-if="myForm.savedAt" class="text-13px text-gray-400">（上次提交：{{ myForm.savedAt }}，可修改后重新提交）</span>
        </div>
        <div class="mt-16px flex flex-col gap-16px">
          <div class="flex items-center gap-16px">
            <span class="w-90px shrink-0 text-right text-14px text-gray-600">评估结果 <span class="text-red-500">*</span></span>
            <RadioGroup v-model:value="myForm.evalResult">
              <Radio value="通过">通过</Radio>
              <Radio value="不通过">不通过</Radio>
            </RadioGroup>
          </div>
          <div class="flex items-start gap-16px">
            <span class="w-90px shrink-0 text-right text-14px leading-22px text-gray-600"
              >评估意见 <span class="text-red-500">*</span></span
            >
            <Input.TextArea
              v-model:value="myForm.evalOpinion"
              class="flex-1"
              :rows="4"
              :maxlength="1000"
              placeholder="请输入评估意见"
              show-count
            />
          </div>
          <div class="flex items-start gap-16px">
            <span class="w-90px shrink-0 text-right text-14px leading-22px text-gray-600">附件</span>
            <div class="flex flex-1 flex-col gap-8px">
              <Upload
                :show-upload-list="false"
                :before-upload="(f: File) => beforeUpload(f, myForm.evalAttachments)"
                multiple
                accept=".pdf,.doc,.docx"
              >
                <a-button>
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:upload-outlined"></span> 上传附件
                  </span>
                </a-button>
              </Upload>
              <div v-for="(f, i) in myForm.evalAttachments" :key="i" class="flex items-center gap-8px text-13px text-gray-600">
                <span class="i-ant-design:paper-clip-outlined text-[#3A8EF6]"></span>
                <span class="flex-1 truncate">{{ f }}</span>
                <span
                  class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 hover:text-red-500"
                  @click="myForm.evalAttachments.splice(i, 1)"
                >
                  <span class="i-ant-design:close-outlined"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 综合评估（仅组长，图3 下区块） -->
      <div v-if="detail.isLeader && canEvaluate" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">综合评估</div>
        <div class="mt-4px text-13px text-gray-400"
          >综合评估须在全部组员提交个人评估后进行；提交后项目进入「待评价」，综合结果作为项目最终评估结论。</div
        >
        <div class="mt-16px flex flex-col gap-16px">
          <div class="flex items-center gap-16px">
            <span class="w-110px shrink-0 text-right text-14px text-gray-600"
              >综合评估结果 <span class="text-red-500">*</span></span
            >
            <RadioGroup v-model:value="compForm.evalResult">
              <Radio value="通过">通过</Radio>
              <Radio value="不通过">不通过</Radio>
            </RadioGroup>
          </div>
          <div class="flex items-start gap-16px">
            <span class="w-110px shrink-0 text-right text-14px leading-22px text-gray-600"
              >综合评估意见 <span class="text-red-500">*</span></span
            >
            <Input.TextArea
              v-model:value="compForm.evalOpinion"
              class="flex-1"
              :rows="4"
              :maxlength="1000"
              placeholder="请输入综合评估意见"
              show-count
            />
          </div>
          <div class="flex items-start gap-16px">
            <span class="w-110px shrink-0 text-right text-14px leading-22px text-gray-600">附件</span>
            <div class="flex flex-1 flex-col gap-8px">
              <Upload
                :show-upload-list="false"
                :before-upload="(f: File) => beforeUpload(f, compForm.evalAttachments)"
                multiple
                accept=".pdf,.doc,.docx"
              >
                <a-button>
                  <span class="inline-flex items-center gap-4px">
                    <span class="i-ant-design:upload-outlined"></span> 上传附件
                  </span>
                </a-button>
              </Upload>
              <div v-for="(f, i) in compForm.evalAttachments" :key="i" class="flex items-center gap-8px text-13px text-gray-600">
                <span class="i-ant-design:paper-clip-outlined text-[#3A8EF6]"></span>
                <span class="flex-1 truncate">{{ f }}</span>
                <span
                  class="flex h-20px w-20px shrink-0 cursor-pointer items-center justify-center rd-full text-gray-400 hover:text-red-500"
                  @click="compForm.evalAttachments.splice(i, 1)"
                >
                  <span class="i-ant-design:close-outlined"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div v-if="canEvaluate" class="flex items-center justify-end gap-12px">
        <span v-if="leaderWaitingMembers" class="mr-auto text-13px text-orange-500"
          >还有 {{ waitingCount }} 名组员未提交个人评估，暂不能提交综合评估</span
        >
        <a-button @click="goBack">取消</a-button>
        <a-button v-if="leaderWaitingMembers" :loading="saving" @click="submitMyOnly">保存我的评估</a-button>
        <a-button v-else type="primary" :loading="saving" @click="submitAll">提交</a-button>
      </div>
    </template>

    <div v-else class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-gray-400">加载中…</div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluationEvaluate">
  import { computed, onMounted, reactive, ref, unref } from 'vue';
  import { Input, Radio, RadioGroup, Tag, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ureProjectComprehensive,
    ureProjectEvalForm,
    ureProjectSaveEval,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';
  import type { UreProjectDetail } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';

  const { showMessage } = useMessage();
  const go = useGo();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';

  /** 状态颜色（0待提交=橙，1评估中=蓝，2待评价=紫，3已完成=绿） */
  const STATUS_COLOR: Record<string, string> = {
    '0': 'warning',
    '1': 'processing',
    '2': 'purple',
    '3': 'success',
  };

  /** 路由参数：?id={项目id}（列表行 id） */
  const route = unref(router.currentRoute);
  const projectId = String(route.query.id ?? route.params.id ?? '');

  /** 评估页数据（evalForm 接口：项目信息 + 本人评估 + 组长视角组员意见） */
  const detail = ref<UreProjectDetail | null>(null);
  const loading = ref(true);
  const saving = ref(false);

  /** 本人「项目评估」表单 */
  const myForm = reactive({
    evalResult: undefined as string | undefined,
    evalOpinion: '',
    evalAttachments: [] as string[],
    savedAt: '',
  });

  /** 组长「综合评估」表单 */
  const compForm = reactive({
    evalResult: undefined as string | undefined,
    evalOpinion: '',
    evalAttachments: [] as string[],
  });

  /** 组长：组员是否未全部提交（未交齐时仅能保存个人评估） */
  const leaderWaitingMembers = computed(
    () => !!detail.value?.isLeader && (detail.value?.memberSubmitted ?? 0) < (detail.value?.memberTotal ?? 0),
  );
  const waitingCount = computed(() => (detail.value?.memberTotal ?? 0) - (detail.value?.memberSubmitted ?? 0));

  /** 是否可评估：评估中状态 + 当前用户为参与专家 */
  const canEvaluate = computed(() => !!detail.value && detail.value.statusCode === '1' && detail.value.isParticipant !== false);
  const cannotEvaluateHint = computed(() => {
    if (!detail.value) return '';
    if (detail.value.isParticipant === false) return '您不是本项目参与专家，仅可查看项目信息';
    return `当前项目状态为「${detail.value.status}」，不在评估阶段`;
  });

  onMounted(async () => {
    if (!projectId) {
      showMessage('缺少项目 id 参数');
      return;
    }
    try {
      const data = await ureProjectEvalForm(projectId);
      detail.value = data;
      const mine = data.myEval;
      if (mine) {
        myForm.evalResult = mine.evalResult;
        myForm.evalOpinion = mine.evalOpinion ?? '';
        myForm.evalAttachments = [...(mine.evalAttachments ?? [])];
        myForm.savedAt = mine.evalDate ?? '';
      }
    } catch (e) {
      showMessage((e as Error)?.message || '评估数据加载失败');
    } finally {
      loading.value = false;
    }
  });

  /** 附件假上传：只收文件名（真实上传本期暂缓，与后端约定一致） */
  function beforeUpload(file: File, list: string[]) {
    list.push(file.name);
    return false;
  }

  /** 校验本人评估表单 */
  function validateMy(): boolean {
    if (!myForm.evalResult) {
      showMessage('请选择评估结果');
      return false;
    }
    if (!myForm.evalOpinion.trim()) {
      showMessage('请输入评估意见');
      return false;
    }
    return true;
  }

  /** 组长未交齐组员时：仅保存个人评估 */
  async function submitMyOnly() {
    if (!validateMy() || !detail.value) return;
    saving.value = true;
    try {
      await ureProjectSaveEval(detail.value.id, {
        evalResult: myForm.evalResult!,
        evalOpinion: myForm.evalOpinion.trim(),
        evalAttachments: myForm.evalAttachments,
      });
      showMessage('个人评估已保存，待组员全部提交后可提交综合评估');
      goBack();
    } finally {
      saving.value = false;
    }
  }

  /** 提交：普通专家仅个人评估；组长为个人 + 综合评估（提交后项目 → 待评价） */
  async function submitAll() {
    if (!validateMy() || !detail.value) return;
    if (detail.value.isLeader) {
      if (!compForm.evalResult) {
        showMessage('请选择综合评估结果');
        return;
      }
      if (!compForm.evalOpinion.trim()) {
        showMessage('请输入综合评估意见');
        return;
      }
    }
    saving.value = true;
    try {
      await ureProjectSaveEval(detail.value.id, {
        evalResult: myForm.evalResult!,
        evalOpinion: myForm.evalOpinion.trim(),
        evalAttachments: myForm.evalAttachments,
      });
      if (detail.value.isLeader) {
        await ureProjectComprehensive(detail.value.id, {
          evalResult: compForm.evalResult!,
          evalOpinion: compForm.evalOpinion.trim(),
          evalAttachments: compForm.evalAttachments,
        });
        showMessage('综合评估提交成功，项目进入待评价');
      } else {
        showMessage('评估提交成功');
      }
      goBack();
    } finally {
      saving.value = false;
    }
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>
