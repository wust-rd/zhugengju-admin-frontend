/**
 * 市住更局 —— 城市更新专家管理 · 跨页挑选 store（Pinia）
 *
 * 专家/项目/评价数据已全部走后端接口（api/early-stage-planning/ure-*.ts），
 * 本 store 只保留「项目表单 → 去抽取 → 带回专家」的跨页挑选状态
 * （页面间共享，切换页签不丢失）。
 * 风格对齐项目 Pinia store（Options API：state / actions，见 core/store/modules）。
 */

import { defineStore } from 'pinia';

/** 被挑选的专家（新增项目·参与专家行数据，带主键用于提交 expertIds） */
export type PickedExpert = {
  id: string;
  name: string;
  org: string;
  phone: string;
};

/** 跨页挑选状态形状 */
type UrbanPickState = {
  /** 是否处于「去抽取为新增项目挑选专家」的跨页挑选模式 */
  pickMode: boolean;
  /** 在线抽取为新增项目挑好的专家（带回来回填参与专家） */
  pickedExperts: PickedExpert[];
  /** 挑选模式中最近一次确认选用的专家（返回时带回用） */
  pickLatest: PickedExpert[];
  /** 挑选结束后返回的路由（新增项目表单页，编辑态带 ?id=） */
  pickReturn: string;
  /** 去抽取时带入在线抽取的项目信息（项目名称/统筹主体/实施主体） */
  pickInfo: { name: string; coordinator: string; implementOrg: string };
};

export const useUrbanExpertStore = defineStore('urbanExpertPool', {
  state: (): UrbanPickState => ({
    pickMode: false,
    pickedExperts: [],
    pickLatest: [],
    pickReturn: '',
    pickInfo: { name: '', coordinator: '', implementOrg: '' },
  }),

  actions: {
    /** 进入「为新增项目挑选专家」的跨页模式（去抽取前调用，returnRoute 为挑完返回地址，pickInfo 为带入抽取页的项目信息） */
    beginPick(returnRoute: string, pickInfo?: { name: string; coordinator: string; implementOrg: string }) {
      this.pickMode = true;
      this.pickedExperts = [];
      this.pickLatest = [];
      this.pickReturn = returnRoute;
      this.pickInfo = pickInfo ? { ...pickInfo } : { name: '', coordinator: '', implementOrg: '' };
    },

    /** 退出挑选模式 */
    endPick() {
      this.pickMode = false;
    },

    /** 在线抽取把挑好的专家写入（带主键/单位/联系方式），供新增项目回填 */
    setPickedExperts(list: PickedExpert[]) {
      this.pickedExperts = list;
    },

    /** 记录挑选模式中最近一次确认选用的专家（每次确认选用覆盖；返回时带回用） */
    setPickLatest(list: PickedExpert[]) {
      this.pickLatest = list;
    },
  },
});
