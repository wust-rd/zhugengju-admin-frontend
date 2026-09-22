import { ref, watch } from 'vue';
import { defineComponent, Transition } from 'vue';
import type { PropType } from 'vue';
import { Radio, RadioGroup, Select, TextArea, Upload } from 'antdv-next';
import { Button } from '@jeesite/core/components/Button';
import type { ResponsibilityConclusion, ReviewResult } from '@jeesite/ifco/api/ifco/project-library';
import { RESPONSIBILITY_CONCLUSION_OPTIONS, REVIEW_RESULT_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
import './review-block.css';

/** 宽松审查记录（渲染用；具体键集由各步骤的 sections 清单约定——
 *  步骤②材料五键 ProjectReviewEntry / 步骤③实施三键 ImplReviewEntry，结构双向兼容） */
type LooseReviewEntry = {
  results: Record<string, ReviewResult | ''>;
  opinion: string;
  fileList?: string[];
};

type LooseResponsibilityEntry = LooseReviewEntry & { conclusion: ResponsibilityConclusion | '' };

/** 「填报人再次发起」记录行（来自流转日志 RESUBMIT 行） */
type ResubmitLog = { date: string; name: string };

/**
 * ifco —— 在库项目管理 · 审查结果区块（步骤②「策划转储备」/步骤③「储备转实施」末尾 FormGroup 通用）
 *
 * 顶部「填报人再次发起 --- 时间 操作人」记录行（业务口径=表单被重新提交时记录一条，
 * 数据来自后端流转日志 RESUBMIT 行；无记录不显示）。
 * 下分两个审查主体（标题与切换按钮同行，外包浅灰圆角小容器 bg-gray-100 py-2 px-4 rd-2）：
 * - 行业主管部门（RadioGroup 按钮组多机构切换）：内容整体 ml-64px，机构切换时左滑/右滑动画——
 *   「审查要点核对」纯文字小节标题下按 sections 清单逐项结论（普通 radio：符合/不符合/不涉及，
 *   再缩进 ml-60px）+「审查意见」（ml-16px，每机构一条）
 *   +「审查附件」（Upload 多文件不限量 / 查看态只读清单）；
 * - 责任部门（市住更局）：各项仅 符合/不符合（无 不涉及）
 *   +「审查结论」select（pass=通过审查 / reject=退回修改，位于审查意见上方；提交后端推进状态）
 *   +「审查意见」+「审查附件」。
 * sections 的 label 与所属步骤的 FormGroup 分区标题一一对应（步骤②=五材料分区、步骤③=实施三分区）。
 * 文字统一 14px。查看态内容只读、机构可切换查看。
 */
export const ReviewBlock = defineComponent({
  name: 'IfcoProjectLibraryReviewBlock',
  props: {
    /** 审查要点核对清单（键集与 entries/responsibility 的 results 约定一致） */
    sections: { type: Array as PropType<{ key: string; label: string }[]>, required: true },
    /** 各机构审查记录（key=机构名） */
    entries: { type: Object as PropType<Record<string, LooseReviewEntry>>, required: true },
    /** 责任部门（市住更局）审查记录 */
    responsibility: { type: Object as PropType<LooseResponsibilityEntry>, required: true },
    /** 机构清单 */
    orgList: { type: Array as PropType<string[]>, required: true },
    /** 「填报人再次发起」记录行（流转日志 RESUBMIT 行） */
    resubmitLogs: { type: Array as PropType<ResubmitLog[]>, default: () => [] },
    /** 查看态：结论/意见只读（机构仍可切换查看） */
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:entries', 'update:responsibility'],
  setup(props, { emit }) {
    const activeOrg = ref(props.orgList[0] ?? '');

    watch(
      () => props.orgList,
      (list) => {
        if (!list.includes(activeOrg.value)) activeOrg.value = list[0] ?? '';
      },
    );

    /** 内容滑动方向：切到列表右侧机构=左滑，反向=右滑 */
    const slideName = ref<'slide-left' | 'slide-right'>('slide-left');

    watch(activeOrg, (org, old) => {
      const next = props.orgList.indexOf(org);
      const prev = props.orgList.indexOf(old ?? '');
      slideName.value = next >= prev ? 'slide-left' : 'slide-right';
    });

    const resultOptions = REVIEW_RESULT_OPTIONS.map((label) => ({ label, value: label }));
    /** 责任部门各项只评 符合/不符合（无 不涉及） */
    const resultOptionsNoExempt = REVIEW_RESULT_OPTIONS.filter((label) => label !== '不涉及').map((label) => ({
      label,
      value: label,
    }));
    /** 审查结论（后端 pass/reject 值 + 中文 label；提交后推进状态） */
    const conclusionOptions = RESPONSIBILITY_CONCLUSION_OPTIONS.map((item) => ({ label: item.label, value: item.value }));

    function emptyResults(): Record<string, ReviewResult | ''> {
      return Object.fromEntries(props.sections.map(({ key }) => [key, '']));
    }

    const activeEntry = (): LooseReviewEntry =>
      props.entries[activeOrg.value] ?? { results: emptyResults(), opinion: '' };

    function patchEntry(patch: Partial<LooseReviewEntry>) {
      emit('update:entries', {
        ...props.entries,
        [activeOrg.value]: { ...activeEntry(), ...patch },
      });
    }

    function patchResult(section: string, result: ReviewResult | '') {
      patchEntry({ results: { ...activeEntry().results, [section]: result } });
    }

    function patchResponsibility(patch: Partial<LooseResponsibilityEntry>) {
      emit('update:responsibility', { ...props.responsibility, ...patch });
    }

    function patchResponsibilityResult(section: string, result: ReviewResult | '') {
      patchResponsibility({ results: { ...props.responsibility.results, [section]: result } });
    }

    /** 纯文字小节标题（无底色，与区块版式口径一致） */
    const sectionTitle = (text: string) => <div class="px-8px py-4px text-14px font-500 text-gray-800">{text}</div>;

    /** 审查附件区：非查看态 Upload 多文件不限量（before-upload 拦截仅记录文件名），查看态只读清单 */
    const attachmentSection = (names: string[] | undefined, onNames: (names: string[]) => void) => (
      <div>
        {sectionTitle('审查附件')}
        <div class="ml-16px py-8px">
          {props.disabled ? (
            <div class="flex flex-col gap-4px">
              {(names ?? []).map((name, index) => (
                <div key={`${index}-${name}`} class="flex items-center gap-6px text-14px text-gray-800">
                  <span class="i-ant-design:paper-clip-outlined text-14px text-gray-400"></span>
                  {name}
                </div>
              ))}
              {!(names ?? []).length ? <div class="text-14px text-gray-400">未上传文件</div> : null}
            </div>
          ) : (
            <Upload
              multiple
              before-upload={() => false}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              fileList={(names ?? []).map((name, index) => ({ uid: `${index}-${name}`, name }))}
              onChange={(info: Recordable) =>
                onNames(((info?.fileList ?? []) as { name: string }[]).map((file) => file.name))
              }
            >
              <Button preIcon="i-ant-design:upload-outlined" class="rounded-none">
                上传文件
              </Button>
            </Upload>
          )}
        </div>
      </div>
    );

    /** 行业主管部门当前机构内容：审查要点核对（三选项）+ 审查意见 + 审查附件 */
    const orgContent = () => (
      <div class="ml-64px">
        {sectionTitle('审查要点核对')}
        <div class="ml-60px flex flex-col gap-8px py-8px">
          {props.sections.map(({ key, label }) => (
            <div class="flex items-center gap-16px">
              <span class="w-160px shrink-0 text-14px text-gray-600">{label}</span>
              <RadioGroup
                value={activeEntry().results[key]}
                options={resultOptions}
                disabled={props.disabled}
                onUpdate:value={(value?: string | number) => patchResult(key, (value ?? '') as ReviewResult | '')}
              />
            </div>
          ))}
        </div>
        {sectionTitle('审查意见')}
        <div class="ml-16px py-8px">
          <TextArea
            value={activeEntry().opinion}
            rows={2}
            maxlength={200}
            disabled={props.disabled}
            placeholder="请输入审查意见"
            onUpdate:value={(value?: string | number) => patchEntry({ opinion: String(value ?? '') })}
          />
        </div>
        {attachmentSection(activeEntry().fileList, (names) => patchEntry({ fileList: names }))}
      </div>
    );

    /** 责任部门（市住更局）内容：审查要点核对（两选项）+ 审查结论 + 审查意见 + 审查附件 */
    const responsibilityContent = () => (
      <div class="ml-64px">
        {sectionTitle('审查要点核对')}
        <div class="ml-60px flex flex-col gap-8px py-8px">
          {props.sections.map(({ key, label }) => (
            <div class="flex items-center gap-16px">
              <span class="w-160px shrink-0 text-14px text-gray-600">{label}</span>
              <RadioGroup
                value={props.responsibility.results[key]}
                options={resultOptionsNoExempt}
                disabled={props.disabled}
                onUpdate:value={(value?: string | number) =>
                  patchResponsibilityResult(key, (value ?? '') as ReviewResult | '')
                }
              />
            </div>
          ))}
        </div>
        {sectionTitle('审查结论')}
        <div class="ml-16px py-8px">
          <Select
            value={props.responsibility.conclusion}
            options={conclusionOptions}
            disabled={props.disabled}
            allowClear
            placeholder="请选择审查结论"
            style={{ width: '240px' }}
            onUpdate:value={(value) =>
              patchResponsibility({ conclusion: (value ?? '') as ResponsibilityConclusion | '' })
            }
          />
        </div>
        {sectionTitle('审查意见')}
        <div class="ml-16px py-8px">
          <TextArea
            value={props.responsibility.opinion}
            rows={2}
            maxlength={200}
            disabled={props.disabled}
            placeholder="请输入审查意见"
            onUpdate:value={(value?: string | number) => patchResponsibility({ opinion: String(value ?? '') })}
          />
        </div>
        {attachmentSection(props.responsibility.fileList, (names) => patchResponsibility({ fileList: names }))}
      </div>
    );

    /** 主体标题行：标题 + 切换按钮组同行，外包浅灰圆角小容器 */
    const subjectHeader = (title: string, controls: JSX.Element) => (
      <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
        <span class="shrink-0 text-14px font-500 text-gray-800 w-100px">{title}</span>
        {controls}
      </div>
    );

    return () => (
      <div>
        {/* 「填报人再次发起」记录行（流转日志 RESUBMIT 行；无记录不显示） */}
        {props.resubmitLogs.map((log, index) => (
          <div key={`${log.date}-${index}`} class="mb-8px flex items-center gap-6px">
            <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
            <span class="text-14px font-500 text-gray-800">
              填报人再次发起 --- {log.date} {log.name}
            </span>
          </div>
        ))}

        {/* 轮次标题 */}
        <div class="mb-8px flex items-center gap-6px">
          <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
          <span class="text-14px font-500 text-gray-800">第一次审查</span>
        </div>
        {/* 行业主管部门（多机构切换） */}
        {subjectHeader(
          '行业主管部门',
          <RadioGroup
            value={activeOrg.value}
            optionType="button"
            onUpdate:value={(value?: string | number) => (activeOrg.value = String(value ?? ''))}
          >
            {props.orgList.map((org) => (
              <Radio key={org} value={org}>
                {org}
              </Radio>
            ))}
          </RadioGroup>,
        )}
        {/* 机构内容：切换时左滑/右滑（out-in，空间恒定不跳高） */}
        <Transition name={slideName.value} mode="out-in">
          <div key={activeOrg.value}>{orgContent()}</div>
        </Transition>
        {/* 责任部门（市住更局，无切换） */}
        <div class="mt-16px">
          {subjectHeader(
            '责任部门',
            <RadioGroup value="市住更局" optionType="button">
              <Radio value="市住更局">市住更局</Radio>
            </RadioGroup>,
          )}
          {responsibilityContent()}
        </div>
      </div>
    );
  },
});

export default ReviewBlock;
