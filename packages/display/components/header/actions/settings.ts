import { reactive, watch } from 'vue';

/**
 * display header 轻量设置（可持久化到 localStorage）。
 *
 * 供 useDisplaySettings 的消费方读写，同时被 Header/相关组件读取以实现真实、可见的效果。
 */

const STORAGE_KEY = 'display-header-settings';

interface DisplaySettings {
  /** 顶部高光光带（header 右侧底部渐隐高光） */
  headerGlow: boolean;
  /** 背景动效 */
  bgMotion: boolean;
}

const defaults: DisplaySettings = {
  headerGlow: true,
  bgMotion: true,
};

function load(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as DisplaySettings) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

const state = reactive<DisplaySettings>(load());

watch(state, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true });

export function useDisplaySettings(): DisplaySettings {
  return state;
}
