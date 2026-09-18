/**
 * Copyright (c) 2013-Now https://jeesite.com All rights reserved.
 * No deletion without permission, or be held responsible to law.
 * @author ThinkGem
 */
import type { UserConfig, ConfigEnv, Plugin, ProxyOptions } from 'vite';
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

/**
 * 把 vite root(web/)之外的 workspace 源码目录纳入 dev server 监听。
 * 否则新建/删除视图文件时 chokidar 收不到 add/unlink 事件,
 * packages/core/router/helper/routeHelper.ts 里的 import.meta.glob
 * 快照不会失效重建,dynamicImport 匹配不到新组件导致路由 404
 * (Vite 8 的 watch 列表只含 root/configFile/env/publicDir,负向 ignored 不会追加监听)。
 */
function watchWorkspaceDirs(): Plugin {
  return {
    name: 'watch-workspace-dirs',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add([
        path.resolve(import.meta.dirname, '../packages'),
        path.resolve(import.meta.dirname, '../modules'),
      ]);
    },
  };
}

export default defineConfig(async ({ command, mode }: ConfigEnv) => {
  const root = process.cwd();
  const isBuild = command === 'build';
  const viteEnv = wrapperEnv(loadEnv(mode, root));
  const serverOptions = createServerOptions(viteEnv);
  // 数公基 ServiceAdapter 的 DCI 鉴权按 Referer 来源放行：localhost/无来源 200，
  // 局域网 IP 页面来源 401 Not DCIAuthorized。/sgj 前缀由 .env.development.local
  // 的 VITE_PROXY 声明（该三元组封装不支持定制头），此处给转发补"去 Referer"——
  // 与生产 nginx 的 proxy_set_header Referer "" 行为对齐，任何 IP/hostname 访问
  // dev 页面均不再受 Referer 鉴权影响。
  // 注：server.proxy 值类型为 string | ProxyOptions 联合（vite 允许 string 简写），
  // 而 createProxy 产物恒为对象，断言收窄后才能赋值 configure
  const sgjProxy = serverOptions.proxy?.['/sgj'] as ProxyOptions | undefined;
  if (sgjProxy) {
    sgjProxy.configure = (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('referer');
      });
    };
  }
  const config: UserConfig = {
    root,
    base: viteEnv.VITE_PUBLIC_PATH,
    define: await createDefineOptions(),
    plugins: [...createVitePlugins(isBuild, viteEnv), watchWorkspaceDirs()],
    server: {
      ...serverOptions,
      watch: {
        // 与 vite 默认忽略(node_modules/.git 等)合并,减少 workspace 内产物/历史目录的无效事件
        ignored: ['**/dist/**', '**/.history/**'],
      },
    },
    build: createBuildOptions(viteEnv),
    css: createCSSOptions(),
    optimizeDeps: {
      rolldownOptions: {
        external: (source: string) => {
          return /^@jeesite\/.*$/.test(source);
        },
      },
    },
    resolve: {
      alias: [
        // 桥接 npm maplibre-gl → 全局 maplibre-gl-enhance (window.maplibregl)
        // CSS 已在 index.html 中全局加载，此空文件避免构建报错
        {
          find: 'maplibre-gl/dist/maplibre-gl.css',
          replacement: path.resolve(import.meta.dirname, '../packages/vmap/src/maplibre-gl-empty.css'),
        },
        {
          find: 'maplibre-gl',
          replacement: path.resolve(import.meta.dirname, '../packages/vmap/src/maplibre-gl-shim.ts'),
        },
        { find: '@jeesite/web', replacement: path.resolve(import.meta.dirname, './') },
        { find: '@jeesite/display', replacement: path.resolve(import.meta.dirname, '../packages/display') },
        { find: '@jeesite/vmap', replacement: path.resolve(import.meta.dirname, '../packages/vmap') },
      ],
    },
  };
  return config;
});
