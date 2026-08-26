/**
 * Copyright (c) 2013-Now https://jeesite.com All rights reserved.
 * No deletion without permission, or be held responsible to law.
 * @author ThinkGem
 */
import { type PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueSetupExtend from 'vite-plugin-vue-setup-extend';
import vitePluginCertificate from 'vite-plugin-mkcert';
import { appConfigPlugin } from '../config/appConfig';
import { configCompressPlugin } from './compress';
import { configHtmlPlugin } from './html';
import { configLegacyPlugin } from './legacy';
import { configThemePlugin } from '../theme';
import { configUnoCSSPlugin } from './unocss';
import { configMonacoEditorPlugin } from './monacoEditor';
import { configVisualizerPlugin } from './visualizer';
import zipPack from 'vite-plugin-zip-pack';
import Inspector from 'vite-plugin-vue-inspector-ai';

export function createVitePlugins(isBuild: boolean, viteEnv: ViteEnv) {
  const vitePlugins: PluginOption[] = [
    vue(),
    vueJsx(),
    vueSetupExtend(),
    vitePluginCertificate({
      source: 'coding',
    }),
  ];

  // app-config-plugin
  vitePlugins.push(appConfigPlugin(isBuild, viteEnv));

  // UnoCSS-vite-plugin
  vitePlugins.push(configUnoCSSPlugin());

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin(isBuild));

  // vite-plugin-monaco-editor
  vitePlugins.push(configMonacoEditorPlugin());

  // rollup-plugin-visualizer
  vitePlugins.push(configVisualizerPlugin());

  // vite-plugin-theme-vite3
  vitePlugins.push(configThemePlugin(isBuild));

  // rollup-plugin-gzip
  vitePlugins.push(configCompressPlugin(isBuild, viteEnv));

  // @vitejs/plugin-legacy
  vitePlugins.push(configLegacyPlugin(isBuild, viteEnv));

  // vite-plugin-zip-pack
  vitePlugins.push(
    zipPack({
      outDir: './', // 输出目录
      outFileName: 'dist.zip', // 输出文件名
      pathPrefix: 'dist',
    }),
  );

  // vite-plugin-vue-inspector
  vitePlugins.push(
    Inspector({
      enabled: false,
      toggleButtonVisibility: 'active',
      launchEditor: 'code',
    }),
  );

  return vitePlugins;
}

export {
  appConfigPlugin,
  configCompressPlugin,
  configHtmlPlugin,
  configLegacyPlugin,
  configThemePlugin,
  configUnoCSSPlugin,
  configMonacoEditorPlugin,
  configVisualizerPlugin,
};
