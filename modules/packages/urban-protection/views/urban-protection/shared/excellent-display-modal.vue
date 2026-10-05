<!--
  市住更局 —— 名城保护 · 优保建筑外网展示弹框（优保建筑管理「查看」）

  对齐老系统 youbaoPic.html「武汉市在册优秀历史建筑」展示页：
  页内标题 / 建筑名横幅 / 照片轮播区 / 基本信息 / 介绍。
  照片三表无字段，轮播区暂为占位（左右箭头点击提示暂无照片）；
  基本信息=JBXX、介绍=JS，空值显示老系统占位文案（/ 与 sorry 文案）。
  打开时序：使用方 openModal(false, { id, jzOldName, jzNowName }) 只传数据不掀开，
  本组件详情查询完成后再 setModalProps({ open: true })。
-->
<template>
  <!-- force-render：内容随页面挂载（同抽屉约定），避免首次打开懒挂载空白 -->
  <BasicModal v-bind="$attrs" :width="900" :footer="null" force-render @register="registerModal">
    <div class="display-page">
      <h3 class="page-heading">武汉市在册优秀历史建筑</h3>
      <div class="name-banner">{{ buildingName }}</div>
      <div class="photo-area">
        <button type="button" class="photo-arrow" title="上一张" @click="arrowTip">&#8249;</button>
        <div class="photo-box">暂无建筑照片（文件存储待接入）</div>
        <button type="button" class="photo-arrow" title="下一张" @click="arrowTip">&#8250;</button>
      </div>
      <div class="info-block">
        <div class="info-label">基本信息：</div>
        <div class="info-content">{{ detail?.jbxx || '/' }}</div>
      </div>
      <div class="info-block">
        <div class="info-label">介绍：</div>
        <div class="info-content">{{ detail?.js || '(::>_<:: sorry~暂时还没有介绍信息！)' }}</div>
      </div>
    </div>
  </BasicModal>
</template>
<script lang="ts" setup name="ViewsUrbanProtectionSharedExcellentDisplayModal">
  import { ref } from 'vue';
  import { BasicModal, useModalInner } from '@jeesite/core/components/Modal';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { fetchExcellentDetail, ExcellentRow } from '@jeesite/urban-protection/api/urban-protection/excellent';

  const { createMessage } = useMessage();

  const buildingName = ref('');
  const detail = ref<ExcellentRow>();

  /** 先查询后掀开：避免弹框内空白闪烁 */
  const [registerModal, { setModalProps }] = useModalInner(async (data: Recordable) => {
    setModalProps({ open: false });
    buildingName.value = String(data.jzOldName || data.jzNowName || '');
    const id = String(data.id ?? '');
    detail.value = id ? await fetchExcellentDetail(id) : undefined;
    setModalProps({ open: true });
  });

  /** 照片三表无字段，轮播箭头暂为占位提示 */
  function arrowTip() {
    createMessage.info('暂无建筑照片');
  }
</script>
<style scoped>
  .page-heading {
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 500;
  }
  .name-banner {
    padding: 10px 16px;
    border-radius: 8px;
    background: #4b57b9;
    color: #fff;
    font-size: 18px;
    text-align: center;
  }
  .photo-area {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 24px;
  }
  .photo-arrow {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: #13a8c4;
    color: #fff;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
  }
  .photo-box {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 240px;
    border: 1px solid #e5e5e5;
    background: #fafafa;
    color: #999;
  }
  .info-block {
    margin-top: 24px;
  }
  .info-label {
    font-weight: bold;
  }
  .info-content {
    padding-left: 24px;
    white-space: pre-wrap;
    line-height: 1.8;
  }
</style>
