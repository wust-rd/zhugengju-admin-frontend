/**
 * Copyright (c) 2013-Now https://jeesite.com All rights reserved.
 * No deletion without permission, or be held responsible to law.
 * @author ThinkGem
 */
import type { UserConfig, ConfigEnv } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import {
  createBuildOptions,
  createCSSOptions,
  createDefineOptions,
  createServerOptions,
  createVitePlugins,
  wrapperEnv,
} from '@jeesite/vite';

export default defineConfig(async ({ command, mode }: ConfigEnv) => {
  const root = process.cwd();
  const isBuild = command === 'build';
  const viteEnv = wrapperEnv(loadEnv(mode, root));
  const config: UserConfig = {
    root,
    base: viteEnv.VITE_PUBLIC_PATH,
    define: await createDefineOptions(),
    plugins: createVitePlugins(isBuild, viteEnv),
    server: createServerOptions(viteEnv),
    build: createBuildOptions(viteEnv),
    css: createCSSOptions(),
    resolve: {
      alias: [
        // 桥接 npm maplibre-gl → 全局 maplibre-gl-enhance (window.maplibregl)
        // CSS 已在 index.html 中全局加载，此空文件避免构建报错
        { find: 'maplibre-gl/dist/maplibre-gl.css', replacement: path.resolve(__dirname, '../packages/core/utils/maplibre-gl-empty.css') },
        { find: 'maplibre-gl', replacement: path.resolve(__dirname, '../packages/core/utils/maplibre-gl-shim.ts') },
        { find: '@jeesite/web', replacement: path.resolve(__dirname, './') },
      ],
    },
  };
  return config;
});
