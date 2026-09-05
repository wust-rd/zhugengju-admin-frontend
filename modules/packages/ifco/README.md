# @jeesite/ifco 投融建运

市住更局 —— 投融建运业务包（结构对齐 `@jeesite/urban-protection` / `@jeesite/urban-health-check`）。
含大屏展示页（overview，TSX）与后台管理页（progress-fill / progress-statistics，Vue SFC）。

## 目录结构

```
modules/packages/ifco/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/ifco/* → ./*
├── api/ifco/             # 数据/接口层
│   └── progress-fill/    # 项目进展填报/统计共用：指标清单、类目、共享假数据仓库与汇总计算
└── views/ifco/
    ├── overview/         # 大屏展示页（display 应用，TSX）
    ├── progress-fill/    # 项目进展填报页（菜单组件位置 /ifco/progress-fill/list）
    │   ├── list.vue      # 页面主体（工具栏 + 类目 RadioGroup + 转置可编辑表格）
    │   └── export-excel.ts  # Excel 导出（xlsx 多级合并表头 + file-saver 下载）
    └── progress-statistics/ # 项目进展统计页（菜单组件位置 /ifco/progress-statistics/list）
        └── list.vue      # 只读查询：总览(全市) + 各报送单位 RadioGroup + 类目汇总表
```

## 页面要点（项目进展填报 /ifco/progress-fill/list）

- **转置表格**：行 = 指标（`api/ifco/progress-fill` 的 `INDICATORS`，缩进 = 层级 × 4 全角空格），列 = 项目；
  固定左四列：指标名称 / 计量单位 / 代码（留空待用户补填）/ 合计（自动）；
  总览 tab 按类目汇总——简单类目一列，「老旧街区、老旧厂区、城中村等更新改造」拆为三个二级子列（一级表头跨列），总计列在最左（固定第 4 列位）。
- **性能策略**：同一时刻只渲染激活类目的一张表（类目用 RadioGroup 切换而非 Tabs）；
  单元格默认只读文本，点击项目列头「编辑」图标才把该列变为输入控件（同时仅一列），
  避免 20+ 项目列全部常驻 InputNumber 的 DOM 开销。
- **编辑规则**：汇总行（本年实际到位资金 / 国家预算资金 / 中央预算资金 / 社会资本）只读自动计算；
  「城市更新项目总数」不可填写，各项目单元格留空，合计 = 项目列数（count）；
  「新增就业岗位」为合计级录入行——各项目单元格不填值，点指标名称右侧蓝色「编辑」按钮
  弹 Modal 直接录合计值，总览中为各类目录入值的总计（不可编辑）；
  「其中：」参考行可填不计入上级；「其他本年实际到位资金的来源」为文字行。
- **周期与带入**：数据按「年份 × 季度 × 报送单位 × 叶子类目」组织（报送单位默认江岸区，
  总览 tab = 当前单位的分表）；【带入上一季度填写的项目列】带入**当前单位**上一周期的列、
  连同数值、每周期每单位一次；二三四季度带入列不可删，一季度（带入上一年 Q4）的带入列可删。
- **Excel 导出**：`export-excel.ts` 复用项目既有 xlsx(SheetJS 0.18.5，与
  `packages/core/components/Excel` 同源同版本)生成——一级/二级类目作多级合并表头、
  每类目一列小计、总计列在最左、数值千分位；下载统一 file-saver。
  xlsx 社区版不支持字体/填充样式，故无汇总行加粗与冻结窗格。
- 当前为纯 UI 假数据（每周期每单位每叶子类目 20 个示例项目列，A1…G2），后端接入后替换数据层即可。

## 页面要点（项目进展统计 /ifco/progress-statistics/list）

- **只读查询**：筛选条件 = 填报年份 + 填报季度（切换即时生效），无编辑/新增/带入/保存；
  导出按钮保留、功能待做（点击提示建设中）。
- **统计范围 RadioGroup**：总览 + 13 个行政区报送单位。点某单位 = 该单位的分表
  （与填报页选中该单位的总览同构）；总览 = 全部单位合计（全市口径）。
- **表格**：与填报页总览同构——固定左四列（指标名称固定 + 单位/代码）+ 最左总计 +
  7 个简单类目单列 + 嵌套类目拆三个二级子列；count 行 = 范围内各单位项目列数之和，
  total 行（新增就业岗位）= 各单位录入值之和；空值置空。
- **数据共享**：与填报页共享 `progressFillStore`（模块级内存假数据仓库，api 层导出），
  填报页的改动在本页即时可见；后端接入后两页统一替换为接口读写。

## 使用方式

- 包内路径用别名 `@jeesite/ifco/...`（tsconfig paths 生效）；
- 页面组件路径需与后端菜单「组件路径」一致（`views/` 之后的相对路径，如 `ifco/urban/xxx/list`）；
- 大屏页在 `packages/display/router/index.ts` 注册路由（组件指向本包 `views/...`）。
