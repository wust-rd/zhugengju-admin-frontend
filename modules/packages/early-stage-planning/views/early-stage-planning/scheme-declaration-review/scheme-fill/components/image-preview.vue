<!--
  图片预览弹层（antd Image 预览，填报页各图片上传位共用）

  用法：父级持 previewUrl ref，Upload 缩略卡 @preview 时置为待预览文件的 url，
  组件渲染隐藏本体的 antd Image + 受控 preview 弹层（自带缩放/旋转），关闭时清空。

  ── 关闭预览时「页面抖一下」的成因与最终解法 ──
  antd 预览打开时经 @v-c/portal 的 useScrollLocker 向 head 注入
  `html body { overflow-y: hidden; width: calc(100% - 滚动条宽) }`（防背景滚动）。
  这两条在本项目里只有后者会生效：
    · overflow-y: hidden 被 design/index.less 的 `html, body { overflow: visible !important }`
      压掉（!important 优先于普通声明，与选择器优先级无关）→ 滚动锁其实从未生效；
    · width: calc(100% - 8px) 无竞争者 → 生效，body 被收窄一个滚动条宽
      （本项目 ::-webkit-scrollbar 为 8px，且 html 有 scrollbar-gutter: stable 预留槽位，
      故 isBodyOverflowing() 恒为真），表现为「预览期间整页变窄 8px」。
  而这条样式并非关闭瞬间移除：Portal 的 autoLock = open || animatedVisible，退场动画
  （.ant-image-preview-fade 的 opacity/transform，motionDurationSlow ≈ 0.3s）播完才置 false。
  因此「打开→关闭」过程中 body 宽度只要发生 变窄→复原 两次跳变，就是一次可见抖动。

  解法：不跟摘类时机赛跑，直接用一条永久规则把这条宽度补偿压掉（见文件末尾样式）。
  历史实现曾用「打开挂还原类 + MutationObserver 等锁样式标签消失再摘类」，但那条路既复杂
  又踩了坑：@v-c/util 的 updateCSS 把 key 写在 data-vc-key 属性上、从不给 style 标签设 id，
  按 `style[id^="vc-util-locker-"]` 匹配恒为空 → 等于关闭瞬间就摘类，抖动照旧。
  本项目为这条宽度补偿承担零风险：
    · 滚动锁本就无效（上一条），滚动条不会消失，无需补偿；
    · public.less 的 `html { scrollbar-gutter: stable }` 已保证滚动条显隐不改变内容宽度。
  于是预览开、关、退场动画全程 body 宽度恒为 100%，与任何时机判断无关。
-->
<template>
  <Image
    :src="url"
    :preview="{
      visible: !!url,
      src: url,
      onVisibleChange: (v: boolean) => {
        if (!v) emit('close');
      },
    }"
    class="hidden"
  />
</template>
<script lang="ts" setup>
  import { Image } from 'antdv-next';

  defineProps<{ url?: string }>();
  const emit = defineEmits(['close']);
</script>
<style>
  /* 永久压过 antd 预览层滚动锁注入的 `html body { width: calc(100% - 滚动条宽) }`。
    选择器优先级 + !important 双保险：注入样式出现、存在、消失的任何时刻本规则都生效，
    故不需要在关闭时卡时机摘类，body 宽度全程稳定，不会有抖动窗口 */
  html body {
    width: 100% !important;
  }
</style>
