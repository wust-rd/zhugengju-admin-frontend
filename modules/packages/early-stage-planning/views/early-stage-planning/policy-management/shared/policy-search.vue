<!--
  市住更局 —— 政策检索 完整实现(语义关联度匹配 / 关键字查询 共用)

  布局对齐项目既有页面范式:
   - PageWrapper #sidebar:查询历史(语义=匹配历史)/我的收藏/政策订阅 三张侧栏卡片
     (原型 match.html / search.html 的侧栏内容,localStorage 本地保存,与原型同 key,收藏订阅两页共享);
   - 右侧上方检索区 Card(语义模式带提示文案 + 多行文本输入,关键字模式为单行输入),
     下方为标准 BasicTable(formConfig 搜索表单:层级/类型/领域/区域/发布日期区间/排序;
     标题列下方展示命中片段并按查询词高亮;语义模式带相似度列);
   - 查看详情走 shared/detail-drawer.vue(Description 元数据 + 版本变更记录 + 关联政策)。
  检索走 kd_server /api/v1/search/snippets(语义 top_k 12,关键字 top_k 24,
  仅含已提交入库、未废止的政策;空关键词 = 查看全部已入库政策,语义模式必须输入)。
  按「区级/市级共用抽象」约定:本文件持完整实现,semantic-matching/index.vue 与
  keyword-search.vue 为薄壳,以静态 prop 传入 mode(keep-alive name 由薄壳持有)。
  接口层见 @jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy。
-->
<template>
  <PageWrapper :sidebarWidth="230">
    <template #sidebar>
      <!-- 查询历史 -->
      <Card size="small" class="mb-3">
        <template #title>{{ semantic ? '匹配历史' : '查询历史' }}</template>
        <div v-for="item in history" :key="item.q" class="mb-2 last:mb-0">
          <a class="text-13px" :title="item.q" @click="useHistory(item.q)">{{ shortHist(item.q) }}</a>
          <div class="text-xs text-gray-400">{{ item.t }}</div>
        </div>
        <div v-if="!history.length" class="text-xs text-gray-400">暂无</div>
      </Card>

      <!-- 我的收藏 -->
      <Card size="small" class="mb-3" title="我的收藏">
        <div v-for="item in favs" :key="item.code" class="mb-2 text-13px last:mb-0">
          <a :title="item.title" @click="openDetail({ code: item.code, title: item.title })">
            {{ shortHist(item.title) }}
          </a>
          <button
            type="button"
            class="float-right cursor-pointer border-0 bg-transparent p-0 text-xs text-blue-600"
            @click="removeFav(item.code)"
          >
            取消
          </button>
        </div>
        <div v-if="!favs.length" class="text-xs text-gray-400">暂无收藏</div>
      </Card>

      <!-- 政策订阅 -->
      <Card size="small" title="政策订阅">
        <div class="flex gap-1.5">
          <Input v-model:value="subInput" size="small" placeholder="关键词或领域" @pressEnter="addSub" />
          <a-button type="primary" size="small" @click="addSub"> 订阅 </a-button>
        </div>
        <div class="mt-2">
          <div v-for="item in subs" :key="item" class="mb-1.5 text-13px last:mb-0">
            <button
              type="button"
              class="float-right cursor-pointer border-0 bg-transparent p-0 text-xs text-blue-600"
              @click="removeSub(item)"
            >
              取消
            </button>
            {{ item }}
          </div>
          <div v-if="!subs.length" class="text-xs text-gray-400">演示本地保存，不发通知</div>
        </div>
      </Card>
    </template>

    <!-- 检索区 -->
    <Card size="small" class="mb-3">
      <p v-if="semantic" class="mb-2 text-xs text-gray-400">
        根据项目情况做语义匹配，不必使用政策原文用词。结果按向量余弦相似度排序，仅含已提交入库、未废止的政策。
      </p>
      <div>
        <TextArea
          v-if="semantic"
          v-model:value="query"
          :rows="3"
          placeholder="描述项目情况或政策需求，例如：某老旧小区拟实施征收补偿，需要匹配现行有效的城市更新政策依据。"
          @keydown.ctrl.enter.prevent="run"
          @keydown.meta.enter.prevent="run"
        />
        <Input
          v-else
          v-model:value="query"
          placeholder="输入关键词，例如：城市更新 征收补偿"
          @pressEnter="run"
        />
        <div class="mt-2 flex items-center gap-3">
          <a-button type="primary" @click="run">
            {{ semantic ? '匹配' : '搜索' }}
          </a-button>
          <span class="text-13px text-gray-400">{{ countText }}</span>
        </div>
      </div>
    </Card>

    <BasicTable @register="registerTable">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <!-- 注:插槽名不可用 title(会撞 antd Table 的表标题插槽,record 为 undefined 导致渲染报错) -->
      <template #policyTitle="{ record }">
        <a @click="openDetail(record)">
          <template v-for="(seg, i) in segments(record.title || '', terms)" :key="i">
            <mark v-if="seg.hit" class="bg-yellow-200 px-0">{{ seg.text }}</mark>
            <template v-else>{{ seg.text }}</template>
          </template>
        </a>
        <div v-if="record.snippet" class="text-12px leading-5 text-gray-400">
          <template v-for="(seg, i) in segments(record.snippet.slice(0, 160), terms)" :key="i">
            <mark v-if="seg.hit" class="bg-yellow-200 px-0 text-gray-500">{{ seg.text }}</mark>
            <template v-else>{{ seg.text }}</template>
          </template>
        </div>
      </template>
      <template #timeStatus="{ record }">
        <Tag :color="TIME_STATUS_COLOR[record.timeStatus] || 'default'" style="border-radius: 10px">
          {{ record.timeStatusLabel || '-' }}
        </Tag>
      </template>
      <template v-if="semantic" #matchScore="{ record }">
        <div v-if="record.matchScore != null" class="flex items-center gap-2">
          <Progress
            :percent="Math.round(record.matchScore)"
            :show-format="false"
            size="small"
            class="mb-0 w-70px"
          />
          <span class="text-xs text-gray-500">{{ record.matchScore.toFixed(1) }}%</span>
        </div>
        <span v-else>-</span>
      </template>
    </BasicTable>

    <DetailDrawer @register="registerDrawer" />
  </PageWrapper>
</template>
<script lang="ts" setup>
  import { computed, onMounted, ref, unref } from 'vue';
  import { Card, Input, Progress, Tag, TextArea } from 'antdv-next';
  import { saveAs } from 'file-saver';
  import { router } from '@jeesite/core/router';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { Policy } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import {
    TIME_STATUS_COLOR,
    fetchAreaTags,
    fetchDicts,
    policyFileUrl,
    searchSnippets,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/policy-management/policy';
  import { extractTerms, segments } from './highlight';
  import DetailDrawer from './detail-drawer.vue';

  /** 检索模式:semantic=语义关联度匹配,keyword=关键字查询(由薄壳以静态 prop 传入) */
  const props = defineProps<{ mode: 'semantic' | 'keyword' }>();

  const { showMessage } = useMessage();
  const { meta } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || (props.mode === 'semantic' ? '语义关联度匹配' : '关键字查询'),
  };

  const semantic = computed(() => props.mode === 'semantic');

  /** 检索输入 */
  const query = ref('');
  const countText = ref(semantic.value ? '输入项目描述后点击匹配' : '输入关键词后点击搜索（留空可查看全部已入库政策）');

  /** 命中词(标题/摘要高亮) */
  const terms = computed(() => extractTerms(query.value, semantic.value));

  /** 筛选下拉选项(字典接口拉取) */
  const levelOptions = ref<{ label: string; value: string }[]>([]);
  const typeOptions = ref<{ label: string; value: string }[]>([]);
  const areaOptions = ref<{ label: string; value: string }[]>([]);
  const areaTagOptions = ref<{ label: string; value: string }[]>([]);

  /** 搜索表单(排序选项随模式变化) */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 90,
    schemas: [
      { label: '政策层级', field: 'level', component: 'Select', componentProps: () => ({ options: levelOptions.value, allowClear: true }) },
      { label: '政策类型', field: 'type', component: 'Select', componentProps: () => ({ options: typeOptions.value, allowClear: true }) },
      { label: '业务领域', field: 'area', component: 'Select', componentProps: () => ({ options: areaOptions.value, allowClear: true }) },
      { label: '适用区域', field: 'areaTag', component: 'Select', componentProps: () => ({ options: areaTagOptions.value, allowClear: true }) },
      {
        label: '发布日期',
        field: 'dateRange',
        component: 'RangePicker',
        componentProps: { valueFormat: 'YYYY-MM-DD' },
      },
      {
        label: '排序',
        field: 'sort',
        component: 'Select',
        componentProps: {
          options: semantic.value
            ? [
                { label: '按匹配度', value: 'relevance' },
                { label: '按日期', value: 'date' },
              ]
            : [
                { label: '按相关性', value: 'relevance' },
                { label: '按日期', value: 'date' },
              ],
          allowClear: true,
        },
      },
    ],
  };

  /** 表格列(语义模式多一列相似度) */
  const tableColumns: BasicColumn[] = [
    { title: '标题', dataIndex: 'title', width: 320, align: 'left', slot: 'policyTitle' },
    { title: '文号', dataIndex: 'docNo', width: 150 },
    { title: '政策层级', dataIndex: 'policyLevelLabel', width: 90, align: 'center' },
    { title: '政策类型', dataIndex: 'policyTypeLabel', width: 100, align: 'center' },
    { title: '业务领域', dataIndex: 'businessAreaLabel', width: 100, align: 'center' },
    { title: '发布日期', dataIndex: 'publishDate', width: 110, align: 'center' },
    { title: '发布单位', dataIndex: 'sourceOrg', width: 180 },
    { title: '时效状态', dataIndex: 'timeStatus', width: 100, align: 'center', slot: 'timeStatus' },
    ...(semantic.value
      ? [{ title: '相似度', dataIndex: 'matchScore', width: 130, align: 'center' as const, slot: 'matchScore' }]
      : []),
  ];

  /** 操作列 */
  const actionColumn: BasicColumn = {
    width: 210,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => openDetail(record),
      },
      {
        label: '预览',
        onClick: () => handlePreview(record),
      },
      {
        label: '下载',
        onClick: () => handleDownload(record),
      },
      {
        label: isFav(record.code) ? '已收藏' : '收藏',
        onClick: () => {
          toggleFav(record as Policy);
          reload();
        },
      },
    ],
  };

  /** 列表接口:检索词 + 搜索表单 → kd_server /search/snippets(语义模式必须先输入) */
  async function tableApi(params: any) {
    if (semantic.value && !query.value.trim()) {
      return { list: [], count: 0 };
    }
    const [dateFrom, dateTo] = params.dateRange || [];
    const data = await searchSnippets({
      query: query.value.trim(),
      mode: props.mode,
      topK: semantic.value ? 12 : 24,
      policyLevel: params.level,
      policyType: params.type,
      businessArea: params.area,
      areaTag: params.areaTag,
      dateFrom,
      dateTo,
      sort: params.sort || 'relevance',
    });
    countText.value = semantic.value
      ? `匹配到 ${data.total} 条相关政策`
      : `找到 ${data.total} 条相关结果`;
    return { list: data.items.map((item) => item.policy), count: data.total };
  }

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable, { reload }] = useTable({
    api: tableApi,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    showIndexColumn: false,
    immediate: false,
    pagination: true,
    canResize: true,
  });

  /** 检索:记录历史后刷新表格 */
  function run() {
    if (semantic.value && !query.value.trim()) {
      showMessage('请先输入项目情况或政策需求');
      return;
    }
    pushHistory(query.value.trim());
    reload();
  }

  function useHistory(text: string) {
    query.value = text;
    run();
  }

  function openDetail(record: Recordable) {
    openDrawer(true, { policy: record, terms: terms.value });
  }

  /** 文件预览(新标签页打开) */
  function handlePreview(record: Recordable) {
    if (!record.fileId) {
      showMessage('没有文件');
      return;
    }
    window.open(policyFileUrl(record.fileId, true), '_blank');
  }

  /** 文件下载(file-saver:fetch → blob → saveAs) */
  async function handleDownload(record: Recordable) {
    if (!record.fileId) {
      showMessage('没有文件');
      return;
    }
    const res = await fetch(policyFileUrl(record.fileId));
    saveAs(await res.blob(), record.fileName || '政策文件');
  }

  /** localStorage 读写(与原型同 key;收藏/订阅两页共享) */
  const HISTORY_KEY = semantic.value ? 'kb_policy_match_history' : 'kb_policy_search_history';
  const FAV_KEY = 'kb_policy_favs';
  const SUB_KEY = 'kb_policy_subs';

  function loadJson<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch {
      return fallback;
    }
  }
  function saveJson(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 忽略本地存储异常(隐私模式等),功能退化为会话内状态
    }
  }

  /** 历史/收藏/订阅 */
  interface HistoryItem {
    q: string;
    t: string;
  }
  interface FavItem {
    code: string;
    title: string;
  }
  const history = ref<HistoryItem[]>(loadJson<HistoryItem[]>(HISTORY_KEY, []));
  const favs = ref<FavItem[]>(loadJson<FavItem[]>(FAV_KEY, []));
  const subs = ref<string[]>(loadJson<string[]>(SUB_KEY, []));
  const subInput = ref('');

  function shortHist(text: string) {
    return text.length > 36 ? `${text.slice(0, 36)}…` : text;
  }

  function pushHistory(text: string) {
    if (!text) return;
    history.value = [{ q: text, t: dateUtil().format('YYYY-MM-DD HH:mm') }, ...history.value.filter((item) => item.q !== text)].slice(0, 10);
    saveJson(HISTORY_KEY, history.value);
  }

  function isFav(code?: string) {
    return !!code && favs.value.some((item) => item.code === code);
  }

  function toggleFav(policy: Policy) {
    if (!policy.code) return;
    if (isFav(policy.code)) {
      favs.value = favs.value.filter((fav) => fav.code !== policy.code);
    } else {
      favs.value = [{ code: policy.code, title: policy.title || '未命名政策' }, ...favs.value].slice(0, 20);
    }
    saveJson(FAV_KEY, favs.value);
  }

  function removeFav(code: string) {
    favs.value = favs.value.filter((item) => item.code !== code);
    saveJson(FAV_KEY, favs.value);
  }

  function addSub() {
    const text = subInput.value.trim();
    if (!text) return;
    if (!subs.value.includes(text)) subs.value = [text, ...subs.value].slice(0, 10);
    subInput.value = '';
    saveJson(SUB_KEY, subs.value);
  }

  function removeSub(text: string) {
    subs.value = subs.value.filter((item) => item !== text);
    saveJson(SUB_KEY, subs.value);
  }

  onMounted(async () => {
    // 字典/区域下拉(初始不检索,保持空态提示,点「搜索/匹配」后才出结果)
    const dicts = await fetchDicts();
    levelOptions.value = dicts.policy_level || [];
    typeOptions.value = dicts.policy_type || [];
    areaOptions.value = dicts.business_area || [];
    areaTagOptions.value = (await fetchAreaTags()).map((tag) => ({ label: tag, value: tag }));
  });
</script>
