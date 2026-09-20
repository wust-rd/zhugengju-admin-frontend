/*
  下拉选项字典共享（scheme-declaration-review 模块共用）

  GET /a/esp/schemeFill/dictOptions（后端 2026-09-20 新增）：
   - 行政区 districts：GIS 边界表 DISTRICT_BOUNDARYS.name 去重；
   - 功能定位 funcTypes：jeesite 字典 area_func_type 的 dictValue（下拉显示编码本身）。
  模块级缓存：首个使用方触发一次拉取，填报列表/表单、审查列表共享结果；
  接口失败（如字典未配置返回 400）回退内置清单并在控制台提示，页面不空窗——
  选项 ref 初值即兜底清单，成功后整体替换。
  注意：各消费方 schema 为静态对象，选项须以函数形式 componentProps 引用
  computed（依赖 FormItem 的 getComponentsProps computed 才能随后端结果联动）。
*/
import { computed, ref } from 'vue';
import { schemeFillDictOptions } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

/** 兜底清单（接口失败时保持可用；对齐原硬编码值） */
const FALLBACK_DISTRICTS = ['汉阳区', '江岸区', '江汉区', '硚口区', '武昌区', '青山区', '洪山区'];
const FALLBACK_FUNC_TYPES = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD', 'POD', '其他'];

const districts = ref<string[]>(FALLBACK_DISTRICTS);
const funcTypes = ref<string[]>(FALLBACK_FUNC_TYPES);

/** 已发起的拉取（模块级单次；失败不重试，用兜底清单） */
let loading: Promise<void> | null = null;

function loadDict() {
  loading = schemeFillDictOptions()
    .then((dict) => {
      if (dict?.districts?.length) districts.value = dict.districts;
      if (dict?.funcTypes?.length) funcTypes.value = dict.funcTypes;
    })
    .catch((error) => {
      console.warn('[scheme-dict] 字典接口拉取失败，使用内置选项兜底：', error);
    });
  return loading;
}

/**
 * 行政区 / 功能定位选项（label=value，直接喂 Select options）
 *
 * 首次调用即触发字典拉取；返回的 computed 随后端结果自动刷新。
 */
export function useSchemeDict() {
  loading ??= loadDict();
  const districtOptions = computed(() => districts.value.map((d) => ({ label: d, value: d })));
  const funcTypeOptions = computed(() => funcTypes.value.map((f) => ({ label: f, value: f })));
  return { districtOptions, funcTypeOptions };
}
