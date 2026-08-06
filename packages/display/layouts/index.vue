<template>
  <div class="flex min-h-screen flex-col bg-gray-50">
    <!-- 顶部导航：独立于后台 DefaultLayout -->
    <header class="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <RouterLink to="/display/home" class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-base font-bold text-white">
            D
          </div>
          <span class="text-lg font-semibold text-gray-800">演示应用</span>
        </RouterLink>

        <nav class="hidden items-center gap-1 md:flex">
          <RouterLink to="/display/home">
            <a-button type="link">首页</a-button>
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2">
          <a-button type="primary" @click="goAdmin">管理后台</a-button>
        </div>
      </div>
    </header>

    <!-- 主体内容区 -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- 页脚 -->
    <footer class="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-400">
      JeeSite 演示应用 · /display 独立布局
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

/** 进入后台登录页（后台业务保持 /a 前缀原样） */
function goAdmin() {
  router.push('/login');
}
</script>
