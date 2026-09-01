<!--
  市住更局 —— 指标项结果 show 页 / 指标项表(Tabs 第二个页签)

  从 list.vue 拆出:搜索表单(体系信息只读回显)、维度合并列、分页、操作列、抽屉表单均在此。
  列结构:一级维度/二级维度/三级维度/序号/指标项名称/指标单位/指标值/标准值目标值/评估结果(Tag)/预警状态(Tag)/指标来源/数据来源/责任部门/操作;
  一、二级维度合并同值单元格(按页分块计算,组跨页时维度名在下一页重显),
  三级维度可空(指标直接挂二级维度),空值显示空白。
-->
<template>
  <div>
    <BasicTable @register="registerTable" @change="handleTableChange">
      <template #tableTitle>
        <Icon :icon="getTitle.icon" class="m-1 pr-1" />
        <span> {{ getTitle.value }} </span>
      </template>
      <template #toolbar>
        <a-button type="primary" @click="handleForm({ systemCode: systemId, isNewRecord: true })">
          <Icon icon="i-fluent:add-12-filled" /> 新增
        </a-button>
      </template>
      <template #dim1="{ record }">
        {{ record.dim1Label }}
      </template>
      <template #firstColumn="{ record }">
        <a @click="handleForm({ ...record, isNewRecord: false, isView: true })" :title="record.indicatorName">
          {{ record.indicatorName }}
        </a>
      </template>
      <template #evalResult="{ record }">
        <Tag :color="EVAL_RESULT_COLOR[record.evalResult] || 'default'" style="border-radius: 10px">
          {{ record.evalResult || '-' }}
        </Tag>
      </template>
      <template #warningStatus="{ record }">
        <Tag :color="WARNING_STATUS_COLOR[record.warningStatus] || 'default'" style="border-radius: 10px">
          {{ record.warningStatus || '-' }}
        </Tag>
      </template>
    </BasicTable>

    <InputForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsUrbanHealthCheckUrbanIndicatorResultIdIndicatorTable">
  import { ref, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { Icon } from '@jeesite/core/components/Icon';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { FormProps } from '@jeesite/core/components/Form';
  import type { IndicatorResult } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator-result';
  import type { Indicator } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
  import InputForm from './form.vue';

  const props = defineProps({
    system: Object as PropType<IndicatorResult>,
  });

  const { meta, params } = unref(router.currentRoute);
  const getTitle = {
    icon: meta.icon || 'ant-design:book-outlined',
    value: meta.title || '指标项',
  };

  const systemId = (params.id as string) || '';

  /** 评估结果 Tag 颜色 */
  const EVAL_RESULT_COLOR: Record<string, string> = {
    较差: 'error',
    一般: 'warning',
    较好: 'processing',
    很好: 'success',
    无标准: 'default',
  };

  /** 预警状态 Tag 颜色 */
  const WARNING_STATUS_COLOR: Record<string, string> = {
    红色预警: 'error',
    黄色预警: 'warning',
    正常: 'success',
    无: 'default',
  };

  /** 搜索表单(体检年份/体系名称为体系信息回显,只读) */
  const searchForm: FormProps = {
    baseColProps: { md: 8, lg: 6 },
    labelWidth: 120,
    schemas: [
      {
        label: '体检年份',
        field: 'year',
        component: 'Input',
        componentProps: { disabled: true },
        defaultValue: props.system?.year,
      },
      {
        label: '指标体系名称',
        field: 'indicatorName',
        component: 'Input',
        componentProps: { disabled: true },
        defaultValue: props.system?.indicatorName,
      },
    ],
  };

  /**
   * 演示用假数据(后端接入后删除,改用 api 拉取并按 systemCode 过滤)。
   * 一级维度首次出现时附「共 N 项」标注,三级维度可空。
   */
  const MOCK_INDICATORS: Indicator[] = [
    {
      id: '1',
      code: '1',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '房屋结构安全',
      indicatorName: '基础设施隐患排查整治率',
      unit: '%',
      indicatorValue: 96,
      standardValue: 95,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '2',
      code: '2',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '房屋结构安全',
      indicatorName: '城市房屋结构安全评估率',
      unit: '%',
      indicatorValue: 88,
      standardValue: 95,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '3',
      code: '3',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '房屋结构安全',
      indicatorName: '房屋鉴定整治项目数',
      unit: '项',
      indicatorValue: 33,
      standardValue: 30,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '4',
      code: '4',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '屋面安全',
      indicatorName: '屋面整治项目数',
      unit: '项',
      indicatorValue: 36,
      standardValue: 30,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '5',
      code: '5',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '外立面安全',
      indicatorName: '外立面整治项目数',
      unit: '项',
      indicatorValue: 28,
      standardValue: 30,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '6',
      code: '6',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '消防设施安全',
      indicatorName: '消防设施整治项目数',
      unit: '项',
      indicatorValue: 29,
      standardValue: 30,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '7',
      code: '7',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '住房安全',
      dim3: '燃气安全',
      indicatorName: '老旧管网改造长度',
      unit: '公里',
      indicatorValue: 145,
      standardValue: 120,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '8',
      code: '8',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '生态环境',
      indicatorName: '公园绿地服务半径覆盖率',
      unit: '%',
      indicatorValue: 85,
      standardValue: 90,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '9',
      code: '9',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '生态环境',
      indicatorName: '建成区黑臭水体消除率',
      unit: '%',
      indicatorValue: 100,
      standardValue: 100,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '10',
      code: '10',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '园林绿化',
      indicatorName: '城市绿道建设长度',
      unit: '公里',
      indicatorValue: 40,
      standardValue: 50,
      evalResult: '较差',
      warningStatus: '红色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '11',
      code: '11',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '园林绿化',
      indicatorName: '人均公园绿地面积',
      unit: '平方米',
      indicatorValue: 15.2,
      evalResult: '无标准',
      warningStatus: '无',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '12',
      code: '12',
      systemCode: '202601',
      dim1: '好房子',
      dim2: '绿色低碳',
      indicatorName: '新建建筑中绿色建筑占比',
      unit: '%',
      indicatorValue: 95,
      standardValue: 100,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '13',
      code: '13',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '完整社区',
      dim3: '社区服务设施',
      indicatorName: '社区综合服务设施覆盖率',
      unit: '%',
      indicatorValue: 92,
      standardValue: 100,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '14',
      code: '14',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '完整社区',
      dim3: '社区服务设施',
      indicatorName: '物业管理覆盖率',
      unit: '%',
      indicatorValue: 85,
      standardValue: 90,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '15',
      code: '15',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '住房品质',
      indicatorName: '现状住宅成套率',
      unit: '%',
      indicatorValue: 97,
      standardValue: 100,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '16',
      code: '16',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '住房品质',
      indicatorName: '既有住宅加装电梯数',
      unit: '部',
      indicatorValue: 260,
      standardValue: 200,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '17',
      code: '17',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '老旧小区',
      indicatorName: '老旧小区改造小区数',
      unit: '个',
      indicatorValue: 66,
      standardValue: 60,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '18',
      code: '18',
      systemCode: '202601',
      dim1: '好小区',
      dim2: '老旧小区',
      indicatorName: '老旧小区改造楼栋数',
      unit: '栋',
      indicatorValue: 355,
      standardValue: 300,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '19',
      code: '19',
      systemCode: '202601',
      dim1: '好城区',
      dim2: '防洪排涝',
      dim3: '防涝工程',
      indicatorName: '达标堤防比例',
      unit: '%',
      indicatorValue: 92,
      standardValue: 90,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '20',
      code: '20',
      systemCode: '202601',
      dim1: '好城区',
      dim2: '防洪排涝',
      dim3: '防涝工程',
      indicatorName: '易涝点整治数量',
      unit: '处',
      indicatorValue: 38,
      standardValue: 45,
      evalResult: '较差',
      warningStatus: '红色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '21',
      code: '21',
      systemCode: '202601',
      dim1: '好城区',
      dim2: '应急救援',
      indicatorName: '应急避难场所人均面积',
      unit: '平方米',
      indicatorValue: 2.1,
      evalResult: '无标准',
      warningStatus: '无',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '22',
      code: '22',
      systemCode: '202601',
      dim1: '好城区',
      dim2: '基础设施',
      dim3: '生命线工程',
      indicatorName: '城市生命线安全监测覆盖率',
      unit: '%',
      indicatorValue: 65,
      standardValue: 80,
      evalResult: '较差',
      warningStatus: '红色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '23',
      code: '23',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '智慧城市',
      indicatorName: '城市运行管理服务平台覆盖率',
      unit: '%',
      indicatorValue: 105,
      standardValue: 100,
      evalResult: '较好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '24',
      code: '24',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '基层治理',
      indicatorName: '社区网格化管理覆盖率',
      unit: '%',
      indicatorValue: 118,
      standardValue: 100,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '25',
      code: '25',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '城市体检',
      indicatorName: '城市体检问题整改完成率',
      unit: '%',
      indicatorValue: 90,
      standardValue: 95,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '26',
      code: '26',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '历史文化',
      indicatorName: '历史文化街区保护修缮面积',
      unit: '平方米',
      indicatorValue: 6800,
      standardValue: 5000,
      evalResult: '很好',
      warningStatus: '正常',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
    {
      id: '27',
      code: '27',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '城市更新',
      indicatorName: '城市更新项目投资完成率',
      unit: '%',
      indicatorValue: 82,
      standardValue: 100,
      evalResult: '较差',
      warningStatus: '红色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '区级统计',
      responsibleDept: '市住更局',
    },
    {
      id: '28',
      code: '28',
      systemCode: '202601',
      dim1: '专项1：既有建筑改造利用',
      dim2: '城市更新',
      indicatorName: '老城区更新改造面积',
      unit: '万平方米',
      indicatorValue: 66,
      standardValue: 80,
      evalResult: '一般',
      warningStatus: '黄色预警',
      indicatorSource: '武汉市特色指标',
      dataSource: '市级调查-大数据',
      responsibleDept: '各区政府',
    },
  ];

  /** 一级维度按出现次数统计,组内首行附「共 N 项」 */
  const dim1CountMap: Record<string, number> = {};
  MOCK_INDICATORS.forEach((item) => {
    dim1CountMap[item.dim1!] = (dim1CountMap[item.dim1!] || 0) + 1;
  });
  const seenDim1 = new Set<string>();
  const tableData = MOCK_INDICATORS.map((item) => {
    const first = !seenDim1.has(item.dim1!);
    seenDim1.add(item.dim1!);
    return {
      ...item,
      dim1Label: first ? `${item.dim1}(共 ${dim1CountMap[item.dim1!]} 项)` : item.dim1,
    };
  });

  /**
   * 维度列合并:一级维度按 dim1 连续同值合并,二级维度按 dim1+dim2 连续同值合并;
   * 返回每行的 rowSpan,0 表示该单元格并入上一行。
   */
  function calcRowSpans(rows: Recordable[], keys: string[]): number[] {
    const spans: number[] = [];
    let i = 0;
    while (i < rows.length) {
      let j = i;
      while (j + 1 < rows.length && keys.every((k) => rows[j + 1][k] === rows[i][k])) {
        j++;
      }
      const span = j - i + 1;
      spans.push(span);
      for (let k = i + 1; k <= j; k++) {
        spans.push(0);
      }
      i = j + 1;
    }
    return spans;
  }

  /** 默认页大小与 sys/config/list 一致(componentSetting:defaultPageSize 20,可切 10/20/50/80/100) */
  const DEFAULT_PAGE_SIZE = 20;
  const currentPageSize = ref(DEFAULT_PAGE_SIZE);

  /**
   * 分页 + 合并单元格:antd 的 onCell 拿到的行属于「当前页」,
   * 若按全量数据算 rowSpan,跨页的组在后页 span 全为 0,维度列会整列空白;
   * 因此按页分块计算,并以行 id 建索引(与页内下标解耦),
   * 组跨页时在下一页重新起一格,维度名重复显示保证可见。
   * 切换页大小时通过表格 change 事件重算。
   */
  const dim1Map = ref(new Map<string, number>());
  const dim2Map = ref(new Map<string, number>());

  function rebuildPageSpanMaps(pageSize: number) {
    const m1 = new Map<string, number>();
    const m2 = new Map<string, number>();
    for (let start = 0; start < tableData.length; start += pageSize) {
      const pageRows = tableData.slice(start, start + pageSize) as Recordable[];
      const spans1 = calcRowSpans(pageRows, ['dim1']);
      const spans2 = calcRowSpans(pageRows, ['dim1', 'dim2']);
      pageRows.forEach((row, i) => {
        m1.set(row.id, spans1[i]);
        m2.set(row.id, spans2[i]);
      });
    }
    dim1Map.value = m1;
    dim2Map.value = m2;
  }

  rebuildPageSpanMaps(DEFAULT_PAGE_SIZE);

  /** 页大小变化时重算合并(仅翻页不重算) */
  function handleTableChange(pagination: any) {
    const size = pagination?.pageSize;
    if (size && size !== currentPageSize.value) {
      currentPageSize.value = size;
      rebuildPageSpanMaps(size);
    }
  }

  /** 表格列(序号列位于三级维度右侧;一/二级维度合并同值单元格) */
  const tableColumns: BasicColumn[] = [
    {
      title: '一级维度',
      dataIndex: 'dim1',
      width: 140,
      slot: 'dim1',
      onCell: (record: Recordable) => ({ rowSpan: dim1Map.value.get(record.id) ?? 1 }),
    },
    {
      title: '二级维度',
      dataIndex: 'dim2',
      width: 110,
      onCell: (record: Recordable) => ({ rowSpan: dim2Map.value.get(record.id) ?? 1 }),
    },
    { title: '三级维度', dataIndex: 'dim3', width: 130 },
    { title: '序号', dataIndex: 'code', width: 70, align: 'center' },
    { title: '指标项名称', dataIndex: 'indicatorName', slot: 'firstColumn', width: 150 },
    { title: '指标单位', dataIndex: 'unit', width: 80, align: 'center' },
    { title: '指标值', dataIndex: 'indicatorValue', width: 90, align: 'center' },
    { title: '标准值/目标值', dataIndex: 'standardValue', width: 120, align: 'center' },
    { title: '评估结果', dataIndex: 'evalResult', width: 100, align: 'center', slot: 'evalResult' },
    { title: '预警状态', dataIndex: 'warningStatus', width: 100, align: 'center', slot: 'warningStatus' },
    { title: '指标来源', dataIndex: 'indicatorSource', width: 130, align: 'center' },
    { title: '数据来源', dataIndex: 'dataSource', width: 140 },
    { title: '责任部门', dataIndex: 'responsibleDept', width: 110 },
  ];

  /** 操作列(查看始终可;编辑/删除待定) */
  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      {
        label: '查看',
        onClick: () => handleForm({ ...record, isNewRecord: false, isView: true }),
      },
      {
        label: '编辑',
        onClick: () => handleForm({ ...record, isNewRecord: false }),
      },
      {
        label: '删除',
        color: 'error',
        popConfirm: { title: '是否确认删除该指标？', confirm: () => handleDelete(record) },
      },
    ],
  };

  const [registerDrawer, { openDrawer }] = useDrawer();
  const [registerTable] = useTable({
    dataSource: tableData,
    columns: tableColumns,
    actionColumn: actionColumn,
    formConfig: searchForm,
    showTableSetting: true,
    useSearchForm: true,
    // 屏蔽 BasicTable 默认在最左侧追加的「序号」索引列(showIndexColumn 默认 true)
    showIndexColumn: false,
    // 分页器与 sys/config/list 相同:走全局默认(20 条/页,可切 10/20/50/80/100),
    // 切页大小时由 @change 重算维度合并的 rowSpan
    pagination: true,
    canResize: true,
  });

  function handleForm(record: Recordable) {
    openDrawer(true, record);
  }

  /** 删除 */
  function handleDelete(_record: Recordable) {
    // TODO: 后端接入后调用删除接口并刷新列表
  }

  /** 表单保存成功回调（后端接入后在此 reload 列表） */
  function handleSuccess() {
    // TODO: 后端接入后刷新列表
  }
</script>
