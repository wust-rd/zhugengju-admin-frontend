<!--
  评审查看页追加区块：专家个人意见 / 项目评估 / 综合评估。

  项目评估、综合评估版式对齐 ifco 在库项目「第一次审查」：
  轮次标题（audit 图标）+ 浅灰圆角标题行（结果按钮组）+ 内容 ml-64px（意见 / 附件）。
  组员只渲染项目评估；组长看全部；旁观只读意见列表与综合评估。
-->
<template>
  <div class="flex flex-col gap-16px">
    <!-- 专家个人意见：组长 / 旁观看 -->
    <section v-if="showOpinions" class="bg-white rd-8px px-24px py-20px shadow-sm">
      <div class="mb-16px flex items-center gap-8px">
        <span class="h-16px w-4px rd-2px bg-[#1677ff]"></span>
        <span class="text-16px font-500 text-gray-800">专家个人意见</span>
      </div>
      <div v-if="memberOpinions.length" class="flex flex-col gap-12px">
        <div
          v-for="item in memberOpinions"
          :key="item.id || item.expertId"
          class="relative rd-8px px-16px py-14px"
          style="background: #e8f4ff"
        >
          <div class="pr-48px text-14px text-gray-800">
            <span class="mr-24px">评估专家：{{ item.expertName || '—' }}</span>
            <span class="mr-24px">评估时间：{{ item.reviewDate || '—' }}</span>
            <span>
              评估结果：
              <span :class="item.result === 'pass' ? 'text-[#52c41a]' : 'text-[#ff4d4f]'">
                {{ item.resultLabel || (item.result === 'pass' ? '通过' : '不通过') }}
              </span>
            </span>
          </div>
          <div class="mt-8px text-14px text-gray-700">评估意见：{{ item.opinion || '—' }}</div>
          <div class="mt-6px text-14px">
            附件：
            <template v-if="item.files?.length">
              <a
                v-for="file in item.files"
                :key="file.url || file.name"
                class="mr-12px text-[#1677ff]"
                :href="file.url"
                target="_blank"
                rel="noopener"
              >
                {{ file.name }}
              </a>
            </template>
            <span v-else class="text-gray-400">无</span>
          </div>
          <div
            class="absolute right-16px top-16px flex h-36px w-36px items-center justify-center rd-full bg-[#5B8FF9] text-16px font-500 text-white"
          >
            {{ (item.expertName || '评').slice(0, 1) }}
          </div>
        </div>
      </div>
      <div v-else class="text-14px text-gray-400">暂无专家评估意见</div>
    </section>

    <!-- 项目评估：组员 / 组长填写 -->
    <section v-if="showMemberForm" class="bg-white rd-8px px-24px py-20px shadow-sm">
      <div class="mb-8px flex items-center gap-6px">
        <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
        <span class="text-14px font-500 text-gray-800">项目评估</span>
      </div>
      <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
        <span class="w-100px shrink-0 text-14px font-500 text-gray-800">评估结果</span>
        <RadioGroup v-model:value="member.result" option-type="button" :disabled="disabled">
          <Radio value="pass">通过</Radio>
          <Radio value="reject">不通过</Radio>
        </RadioGroup>
      </div>
      <div class="ml-64px">
        <div class="px-8px py-4px text-14px font-500 text-gray-800">评估意见</div>
        <div class="ml-16px py-8px">
          <Input.TextArea
            v-model:value="member.opinion"
            :rows="2"
            :maxlength="2000"
            :disabled="disabled"
            placeholder="请输入评估意见"
          />
        </div>
        <div class="px-8px py-4px text-14px font-500 text-gray-800">附件</div>
        <div class="ml-16px py-8px">
          <Upload
            v-if="!disabled"
            :show-upload-list="false"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            :before-upload="(file) => beforeUpload(file, 'member')"
          >
            <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
          </Upload>
          <div class="mt-8px flex flex-col gap-4px">
            <div
              v-for="(file, index) in member.files"
              :key="file.url || file.name || String(index)"
              class="flex items-center gap-6px text-14px text-gray-800"
            >
              <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
              <a v-if="file.url" :href="file.url" target="_blank" rel="noopener" class="text-[#1677ff]">{{
                file.name
              }}</a>
              <span v-else>{{ file.name }}</span>
              <span
                v-if="!disabled"
                class="cursor-pointer text-gray-400 hover:text-red-500"
                @click="removeFile('member', index)"
              >
                <span class="i-ant-design:close-outlined text-12px"></span>
              </span>
            </div>
            <div v-if="!member.files.length" class="text-14px text-gray-400">未上传文件</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 综合评估：组长填写；旁观只读 -->
    <section v-if="showSummary" class="bg-white rd-8px px-24px py-20px shadow-sm">
      <div class="mb-8px flex items-center gap-6px">
        <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
        <span class="text-14px font-500 text-gray-800">综合评估</span>
      </div>
      <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
        <span class="w-100px shrink-0 text-14px font-500 text-gray-800">综合评估结果</span>
        <RadioGroup v-model:value="summary.result" option-type="button" :disabled="disabled || !isLeader">
          <Radio value="pass">通过</Radio>
          <Radio value="reject">不通过</Radio>
        </RadioGroup>
      </div>
      <div class="ml-64px">
        <div class="px-8px py-4px text-14px font-500 text-gray-800">综合评估意见</div>
        <div class="ml-16px py-8px">
          <Input.TextArea
            v-model:value="summary.opinion"
            :rows="2"
            :maxlength="2000"
            :disabled="disabled || !isLeader"
            placeholder="请输入综合评估意见"
          />
        </div>
        <div class="px-8px py-4px text-14px font-500 text-gray-800">附件</div>
        <div class="ml-16px py-8px">
          <Upload
            v-if="!disabled && isLeader"
            :show-upload-list="false"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            :before-upload="(file) => beforeUpload(file, 'summary')"
          >
            <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">上传文件</Button>
          </Upload>
          <div class="mt-8px flex flex-col gap-4px">
            <div
              v-for="(file, index) in summary.files"
              :key="file.url || file.name || String(index)"
              class="flex items-center gap-6px text-14px text-gray-800"
            >
              <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
              <a v-if="file.url" :href="file.url" target="_blank" rel="noopener" class="text-[#1677ff]">{{
                file.name
              }}</a>
              <span v-else>{{ file.name }}</span>
              <span
                v-if="!disabled && isLeader"
                class="cursor-pointer text-gray-400 hover:text-red-500"
                @click="removeFile('summary', index)"
              >
                <span class="i-ant-design:close-outlined text-12px"></span>
              </span>
            </div>
            <div v-if="!summary.files.length" class="text-14px text-gray-400">未上传文件</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningReviewManagementReviewPanel">
  import { computed, reactive, watch } from 'vue';
  import { Input, Radio, RadioGroup, Upload } from 'antdv-next';
  import { Button } from '@jeesite/core/components/Button';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { espFileUpload, type EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
  import type {
    EspReviewOpinion,
    EspReviewOpinionItem,
    EspReviewResult,
    EspReviewRole,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/review-management';

  const props = defineProps<{
    role?: EspReviewRole;
    memberOpinions?: EspReviewOpinion[];
    myOpinion?: EspReviewOpinion | null;
    summary?: EspReviewOpinion | null;
    disabled?: boolean;
  }>();

  const { showMessage } = useMessage();

  const isLeader = computed(() => props.role === 'leader');
  const isMember = computed(() => props.role === 'member' || props.role === 'leader');
  const showOpinions = computed(() => props.role === 'leader' || props.role === 'viewer');
  const showMemberForm = computed(() => isMember.value);
  const showSummary = computed(() => props.role === 'leader' || props.role === 'viewer');
  const memberOpinions = computed(() => props.memberOpinions ?? []);

  type FormState = { result: EspReviewResult | ''; opinion: string; files: EspSchemeFile[] };
  const member = reactive<FormState>({ result: '', opinion: '', files: [] });
  const summary = reactive<FormState>({ result: '', opinion: '', files: [] });

  function applyOpinion(target: FormState, source?: EspReviewOpinion | null) {
    target.result = source?.result === 'reject' || source?.result === 'pass' ? source.result : '';
    target.opinion = source?.opinion || '';
    target.files = [...(source?.files ?? [])];
  }

  watch(
    () => [props.myOpinion, props.summary],
    () => {
      applyOpinion(member, props.myOpinion);
      applyOpinion(summary, props.summary);
    },
    { immediate: true },
  );

  function beforeUpload(file: File, kind: 'member' | 'summary') {
    void uploadFile(file, kind);
    return false;
  }

  async function uploadFile(file: File, kind: 'member' | 'summary') {
    try {
      const uploaded = await espFileUpload(file);
      (kind === 'member' ? member : summary).files.push(uploaded);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '上传失败');
    }
  }

  function removeFile(kind: 'member' | 'summary', index: number) {
    (kind === 'member' ? member : summary).files.splice(index, 1);
  }

  function toItem(state: FormState): EspReviewOpinionItem | undefined {
    if (!state.result && !state.opinion.trim()) return undefined;
    return {
      result: state.result,
      opinion: state.opinion.trim(),
      files: [...state.files],
    };
  }

  function buildPayload(): { member?: EspReviewOpinionItem; summary?: EspReviewOpinionItem } {
    return {
      member: isMember.value ? toItem(member) : undefined,
      summary: isLeader.value ? toItem(summary) : undefined,
    };
  }

  defineExpose({ buildPayload });
</script>
