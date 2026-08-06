<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-12">
    <!-- Hero 区 -->
    <section class="flex flex-col items-center py-16 text-center">
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl font-bold text-white shadow-lg">
        D
      </div>
      <h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">JeeSite 演示应用</h1>
      <p class="mb-8 max-w-2xl text-lg text-gray-500">
        独立的 /display 前端应用，拥有独立的布局与路由体系，与后台管理（/a）完全解耦。
      </p>
      <div class="flex items-center gap-3">
        <a-button type="primary" size="large" @click="goAdmin">进入管理后台</a-button>
      </div>
    </section>

    <!-- 特性卡片 -->
    <section class="grid gap-6 py-10 md:grid-cols-3">
      <div v-for="item in features" :key="item.title" class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-3 text-2xl">{{ item.icon }}</div>
        <h3 class="mb-2 text-lg font-semibold text-gray-800">{{ item.title }}</h3>
        <p class="text-sm leading-relaxed text-gray-500">{{ item.desc }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const features = [
  {
    icon: '🧩',
    title: '独立布局',
    desc: '/display 使用专属 layout，不依赖后台侧边栏与登录态，可自由定制页面风格。',
  },
  {
    icon: '🚀',
    title: '路由解耦',
    desc: '静态注册、组件懒加载，与后台动态菜单路由互不影响，无需登录即可访问。',
  },
  {
    icon: '🛠',
    title: '复用基建',
    desc: '可复用 @jeesite/core 的组件、hooks 与主题体系，保持项目整体一致。',
  },
];

function goAdmin() {
  router.push('/login');
}
</script>
