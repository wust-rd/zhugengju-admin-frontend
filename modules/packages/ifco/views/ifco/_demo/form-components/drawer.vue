<!--
  开发演示 —— packages/core/components/Form/src/components 全部 10 个组件的最简演示抽屉

  覆盖清单（目录内 10 个 .vue）：
   可独立使用（前 8 个，均从 @jeesite/core/components/Form 导出，JeeSiteText 除外需 deep import）：
   ① FormGroup             分组标题（主色竖条+分隔线；传 collapsed 可折叠）
   ② JeeSiteSelect         导出名 Select——字典/API/静态 options 下拉
   ③ JeeSiteTreeSelect     导出名 TreeSelect——平铺列表自动建树（id/pId/name）
   ④ JeeSiteRadioGroup     导出名 RadioGroup——单选组（options 支持字符串数组）
   ⑤ JeeSiteRadioButtonGroup 导出名 RadioButtonGroup——按钮式单选组
   ⑥ JeeSiteCheckboxGroup  导出名 CheckboxGroup——复选组
   ⑦ JeeSiteText           只读文本展示（未从 Form/index.ts 导出，componentMap 注册名 'Text'）
   ⑧ FormExtend            扩展字段表单（自带折叠 FormGroup + 8字符串/4整数/4小数/4日期 + 自定义属性表格）
   只能随 BasicForm 使用（后 2 个，BasicForm 的内部渲染单元，不在 Form/index.ts 导出）：
   ⑨ FormItem              按 schema 逐项渲染控件
   ⑩ FormAction            表单底部 查询/重置/展开收起 按钮区
   —— ⑨⑩ 经本抽屉最后一区的 BasicForm 演示（每个 schema 字段 = 一个 FormItem；底部按钮 = FormAction）
-->
<template>
  <!--
  get-container="body"：antdv-next@1.5.0 的 @v-c/portal 在「干净页面上直接打开抽屉」时，
  容器 append 会排进一个从未激活过的祖先 Portal 的队列而死锁（DOM 渲染了但游离在文档外，
  现象=点击无反应）。显式指定 body 容器即绕过该队列，直接 Teleport 挂载。
  -->
  <BasicDrawer
    v-bind="$attrs"
    width="760px"
    title="Form/src/components 组件演示"
    get-container="body"
    @register="registerDrawer"
  >
    <div class="flex flex-col gap-24px">
      <!-- ① FormGroup -->
      <FormGroup>① FormGroup —— 分组标题</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          import { FormGroup } from '@jeesite/core/components/Form'；不传 collapsed 即固定分组，传入后标题可点击折叠
        </div>
        <FormGroup>不可折叠分组（最简用法）</FormGroup>
        <div class="pl-16px text-14px text-gray-600">分组内容……</div>
        <FormGroup class="mt-16px" :collapsed="fgCollapsed" @collapsed="(value: boolean) => (fgCollapsed = value)">
          可折叠分组（collapsed + @collapsed）
        </FormGroup>
        <div v-show="!fgCollapsed" class="pl-16px text-14px text-gray-600">点击上方标题可收起 / 展开</div>
      </div>

      <!-- ② JeeSiteSelect -->
      <FormGroup>② Select（JeeSiteSelect）—— 下拉选择</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          支持静态 options / dictType 字典 / api 接口拉取；不传初始值且无 allow-clear 时会默认选中第一项
        </div>
        <Select
          v-model:value="selectVal"
          class="max-w-320px"
          :options="selectOptions"
          allow-clear
          placeholder="请选择"
        />
        <div class="mt-4px text-13px text-gray-500">当前值：{{ selectVal ?? '—' }}</div>
      </div>

      <!-- ③ JeeSiteTreeSelect -->
      <FormGroup>③ TreeSelect（JeeSiteTreeSelect）—— 树选择</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          默认 treeDataSimpleMode：treeData 传 id / pId / name 平铺列表，组件内自动建树（字段名用 id、name）
        </div>
        <TreeSelect
          v-model:value="treeVal"
          class="max-w-320px"
          :tree-data="treeData"
          allow-clear
          placeholder="请选择节点"
        />
        <div class="mt-4px text-13px text-gray-500">当前值：{{ treeVal ?? '—' }}</div>
      </div>

      <!-- ④ JeeSiteRadioGroup -->
      <FormGroup>④ RadioGroup（JeeSiteRadioGroup）—— 单选组</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500"
          >options 最简传字符串数组（也支持 { label, value } 对象数组 / dictType）</div
        >
        <RadioGroup v-model:value="radioVal" :options="['是', '否']" />
        <div class="mt-4px text-13px text-gray-500">当前值：{{ radioVal ?? '—' }}</div>
      </div>

      <!-- ⑤ JeeSiteRadioButtonGroup -->
      <FormGroup>⑤ RadioButtonGroup（JeeSiteRadioButtonGroup）—— 按钮式单选组</FormGroup>
      <div>
        <RadioButtonGroup v-model:value="radioBtnVal" :options="['方案A', '方案B', '方案C']" />
        <div class="mt-4px text-13px text-gray-500">当前值：{{ radioBtnVal ?? '—' }}</div>
      </div>

      <!-- ⑥ JeeSiteCheckboxGroup -->
      <FormGroup>⑥ CheckboxGroup（JeeSiteCheckboxGroup）—— 复选组</FormGroup>
      <div>
        <CheckboxGroup v-model:value="checkboxVal" :options="['选项1', '选项2', '选项3']" />
        <div class="mt-4px text-13px text-gray-500">当前值：{{ checkboxVal }}</div>
      </div>

      <!-- ⑦ JeeSiteText -->
      <FormGroup>⑦ JeeSiteText —— 只读文本展示</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          未从 Form/index.ts 导出（deep import）；schema 里的注册名是 'Text'；还支持 dictType 显示字典标签、isHtml 渲染
          HTML
        </div>
        <JeeSiteText value="纯文本展示（value 属性）" />
        <JeeSiteText class="mt-4px" is-html value='<span style="color: #1677ff">HTML 展示（isHtml）</span>' />
      </div>

      <!-- ⑧ FormExtend -->
      <FormGroup>⑧ FormExtend —— 扩展字段表单</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          自带可折叠 FormGroup + 8 字符串 / 4 整数 / 4 小数 / 4 日期 + 自定义属性可编辑表格；嵌业务表单尾部经 ref 调
          setFieldsValue / validate
        </div>
        <FormExtend :collapsed="false" />
      </div>

      <!-- ⑨⑩ FormItem / FormAction -->
      <FormGroup>⑨ FormItem / ⑩ FormAction —— BasicForm 内部组件</FormGroup>
      <div>
        <div class="mb-8px text-13px text-gray-500">
          两者不在 Form/index.ts 导出、不能独立使用：FormItem 按 schema 逐项渲染控件，FormAction
          渲染底部查询/重置按钮区。下例 BasicForm 中每个字段即一个 FormItem，底部按钮即 FormAction
        </div>
        <BasicForm @register="registerDemoForm" />
      </div>
    </div>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoDemoFormComponentsDrawer">
  import { ref } from 'vue';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import {
    BasicForm,
    CheckboxGroup,
    FormExtend,
    FormGroup,
    RadioGroup,
    RadioButtonGroup,
    Select,
    TreeSelect,
    useForm,
  } from '@jeesite/core/components/Form';
  import JeeSiteText from '@jeesite/core/components/Form/src/components/JeeSiteText.vue';

  const [registerDrawer] = useDrawerInner();

  // ── ① FormGroup 折叠演示状态 ─────────────────────────────────────────
  const fgCollapsed = ref(false);

  // ── ② JeeSiteSelect：静态 options（另有 dictType / api 两种来源） ────
  const selectVal = ref<string>();
  const selectOptions = [
    { label: '选项一', value: '1' },
    { label: '选项二', value: '2' },
    { label: '选项三（禁用）', value: '3', disabled: true },
  ];

  // ── ③ JeeSiteTreeSelect：simpleMode 平铺列表（id/pId/name 建树） ────
  const treeVal = ref<string>();
  const treeData = [
    { id: '1', pId: '0', name: '节点一' },
    { id: '1-1', pId: '1', name: '节点一-1' },
    { id: '1-2', pId: '1', name: '节点一-2' },
    { id: '2', pId: '0', name: '节点二' },
  ];

  // ── ④⑤⑥ 单选 / 按钮单选 / 复选（options 字符串数组最简形态） ────────
  const radioVal = ref<string>('是');
  const radioBtnVal = ref<string>('方案A');
  const checkboxVal = ref<string[]>(['选项1']);

  // ── ⑨⑩ BasicForm：FormItem（schema 渲染）+ FormAction（底部按钮） ────
  const [registerDemoForm] = useForm({
    labelWidth: 140,
    schemas: [
      { label: '文本框', field: 'demoInput', component: 'Input', componentProps: { placeholder: '一个 FormItem' } },
      {
        label: '只读文本',
        field: 'demoText',
        component: 'Text',
        defaultValue: 'JeeSiteText（component: "Text"）',
      },
      {
        label: '下拉选择',
        field: 'demoSelect',
        component: 'Select',
        componentProps: { options: selectOptions, allowClear: true, placeholder: '请选择' },
      },
    ],
    baseColProps: { md: 24, lg: 24 },
    showActionButtonGroup: true,
  });
</script>
