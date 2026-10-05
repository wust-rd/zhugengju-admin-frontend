/**
 * 策划库入库抽屉 · 提交快照（fake-data）
 *
 * 用途：流程测试的表单值回放底稿。抽屉提交时控制台打印表单值
 * （`[策划库入库] xx 表单值` 下方跟一段可整块复制的 JSON），手动粘贴到
 * 下方 FAKE_FORM_SNAPSHOT.values 即完成固化，供流程测试/造数脚本引用。
 *
 * 注意：values 是表单原始值（JeeSite 多选字段为逗号串契约，组装前形态）。
 */
export type FakeFormSnapshot = {
  /** 快照时间（ISO） */
  capturedAt: string;
  /** 提交场景：暂存 / 提交 / 申请转库 */
  scene: string;
  /** 表单原始值（字段名=表单键） */
  values: Record<string, unknown>;
};

/** 最近一次成功提交的表单快照（空 = 尚未捕获） */
export const FAKE_FORM_SNAPSHOT: FakeFormSnapshot = {
  capturedAt: '',
  scene: '',
  values: {
    pUid: null,
    base: {
      projectName: '测试A',
      projectApprovalCode: 'aaa',
      district: '江岸区',
      projectAffiliation: 'market',
      areaName: '一元片',
      areaUid: 'PQ001',
      batch: '第一批',
      functionOrientations: '产业导向',
      fiveReformType: '既有建筑改造',
      fiveReformSubType: '危旧房改造',
      sixBringTypes: '带建设,带保护,带开发',
      constructionSite: 'bbb',
      mainConstructionContent: 'c',
      investEstimate: 10,
      fundSources: '中央预算资金-中央预算内投资,省级预算资金,市级及以下预算资金—市级',
      fundSituationRemark: 'e',
      industryDepts: [
        { code: 'SFGW', name: '市发改委' },
        { code: 'SJXJ', name: '市经信局' },
      ],
      responsibleDept: { code: 'JAQ', name: 'JAQ' },
      coordinateOrg: 'f',
      implementOrg: 'g',
      reportOrg: { refType: 'user', code: '测试a公司', name: '测试a公司' },
      reportPerson: '张三',
      reportPhone: '1234',
      remarks: 'd',
    },
    reviewFiles: {
      approvalFilingFiles: null,
      complyTsp: '',
      involvePlanAdj: '',
      tspFiles: null,
      implPlanFiles: null,
      involveCultural: '',
      involveEia: '',
      otherArgFiles: null,
      geoJson: null,
      geoFileName: null,
    },
    impl: {
      conditionReady: '',
      planStartDate: '',
      planEndDate: '',
      involvePlanAdj: '',
      passedCommitteeReview: '',
      planAdjustmentFiles: null,
      fundChannelSettled: '',
      fundProofFiles: null,
    },
  },
};
