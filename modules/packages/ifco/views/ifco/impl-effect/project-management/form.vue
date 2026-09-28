<!--
  ifco —— 实施成效评估表单（查看 / 去评估 一体抽屉）

  抽屉标题 = 实施成效评估 · 项目名；顶部只读信息横幅两行（项目编号/行政区 片区
  五改分类 项目归属/责任主体 + 投资估算/实际完成投资/实际完工时间 + 更新对比按钮）。
  三个 FormGroup 分区（主色竖条 + 分隔线标题，与其他表单页一致）：
   ①实施后评估信息填报：评估日期* / 运营主体 / 实施成效说明 / 上传改造前后对比照片
     （按组动态新增/删除，每组改造前/改造后，可无限新增、可不传）；
   ②绩效评估结果：绩效评估结果（请输入）+ 绩效评估材料（多文件上传，可不传）；
   ③四好目标评价：四条浅绿横条，勾选=展开对应块——好房子=达标套数/房屋用途 +
     选择好房子品质升级类型（安全耐久·功能完善·绿色智能·其他 四组复选）+ 添加土
     地证、施工许可等佐证材料（多文件上传）+ 添加位置信息（Modal 内嵌 GeoData-
     Section：上传 shp/dwg 解析占位 + 编辑地图）；好小区=达标数量 + 明细表（空表
     起步无演示数据；添加/编辑走弹窗、删除本地维护、空间位置图层=GeoDataSection
     弹窗、佐证附件=行内多文件上传，均随保存写回行数据；导出为占位）；好社区=
     3×3 字段填报（组成部分/所属社区/设施类型/增加达标数/覆盖半
     径·人口/15分钟可达）；好城区=2×3 字段填报（组成部分/所属城区/增加达标数），
     好社区·好城区不再有明细表；添加社区/城区信息为占位。
  底部按钮：查看=关闭；去评估=取消/暂存（状态留待评估）/ 提交（校验必填，状态转已完成）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-effect 的 EFFECT_ITEMS，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" width="90%" @register="registerDrawer">
    <template #title>
      <span>实施成效评估 · {{ record.projectName }}</span>
    </template>

    <!-- 只读信息横幅（两行 + 更新对比） -->
    <div class="mb-16px rd-4px bg-#e8ecf5 px-16px py-12px text-14px">
      <div class="grid grid-cols-3 text-gray-800">
        <span><span class="text-gray-500">项目编号：</span>{{ record.projectCode }}</span>
        <span>
          {{ record.district }} {{ record.renewalAreaName }} {{ fiveReformLabel(record.fiveReformType ?? '') }}
          {{ projectAffiliationLabel(record.projectAffiliation ?? '') }}
        </span>
        <span><span class="text-gray-500">责任主体：</span>{{ record.responsibleOrg }}</span>
        <span><span class="text-gray-500">投资估算（亿元）：</span>{{ record.investEstimate }}</span>
        <span><span class="text-gray-500">实际完成投资（亿元）：</span>{{ record.actualInvest }}</span>
        <span><span class="text-gray-500">实际完工时间：</span>{{ record.completionDate || '/' }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-24px">
      <!-- ① 实施后评估信息填报 -->
      <FormGroup>实施后评估信息填报</FormGroup>
      <div>
        <div class="grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
          <div class="flex items-center gap-8px">
            <div class="w-140px shrink-0 text-right text-14px text-gray-700">
              <span class="text-#ff4d4f">*</span> 评估日期
            </div>
            <DatePicker
              v-model:value="formState.evaluateDate"
              value-format="YYYY-MM-DD"
              :disabled="isView"
              class="flex-1"
              placeholder="请选择评估日期"
            />
          </div>
          <div class="flex items-center gap-8px">
            <div class="w-140px shrink-0 text-right text-14px text-gray-700">运营主体</div>
            <Input
              v-model:value="formState.operatingOrg"
              :disabled="isView"
              :maxlength="100"
              class="flex-1"
              placeholder="请输入运营主体"
            />
          </div>
          <div class="flex items-start gap-8px md:col-span-2">
            <div class="w-140px shrink-0 pt-4px text-right text-14px text-gray-700">实施成效说明</div>
            <TextArea
              v-model:value="formState.effectDescription"
              :disabled="isView"
              :rows="3"
              :maxlength="500"
              show-count
              class="flex-1"
              placeholder="请输入实施成效说明"
            />
          </div>
        </div>

        <!-- 上传改造前后对比照片（每组一整行：改造前/改造后横排；按组动态新增/删除，可不传） -->
        <div class="mt-16px flex items-start gap-8px">
          <div class="w-140px shrink-0 pt-4px text-right text-14px text-gray-700">上传改造前后对比照片</div>
          <div class="flex-1">
            <div v-if="isView && !photoGroups.length" class="pt-4px text-14px text-gray-400">未上传</div>
            <div class="flex flex-col gap-12px">
              <div
                v-for="(group, index) in photoGroups"
                :key="group.id"
                class="b-1 b-solid b-gray-100 rd-4px px-12px py-8px"
              >
                <div class="flex items-center gap-16px">
                  <div class="min-w-0 flex-1">
                    <div class="mb-4px text-14px text-gray-500">改造前</div>
                    <Upload
                      v-model:file-list="group.before"
                      list-type="picture-card"
                      multiple
                      accept="image/*"
                      :before-upload="() => false"
                      :disabled="isView"
                    >
                      <div v-if="!isView" class="flex flex-col items-center text-#1677ff">
                        <span class="i-ant-design:plus-outlined text-18px"></span>
                        <span class="mt-2px text-14px">上传</span>
                      </div>
                    </Upload>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="mb-4px text-14px text-gray-500">改造后</div>
                    <Upload
                      v-model:file-list="group.after"
                      list-type="picture-card"
                      multiple
                      accept="image/*"
                      :before-upload="() => false"
                      :disabled="isView"
                    >
                      <div v-if="!isView" class="flex flex-col items-center text-#1677ff">
                        <span class="i-ant-design:plus-outlined text-18px"></span>
                        <span class="mt-2px text-14px">上传</span>
                      </div>
                    </Upload>
                  </div>
                  <span
                    v-if="!isView"
                    class="shrink-0 self-center cursor-pointer text-13px text-#ff4d4f"
                    @click="handleRemovePhotoGroup(index)"
                  >
                    删除
                  </span>
                </div>
              </div>
              <button
                v-if="!isView"
                type="button"
                class="flex w-full items-center justify-center gap-4px b-1 b-dashed b-gray-300 rd-4px px-12px py-8px text-14px text-#1677ff"
                @click="handleAddPhotoGroup"
              >
                <span class="i-ant-design:plus-outlined text-14px"></span>
                新增一组
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ② 绩效评估结果 -->
      <FormGroup>绩效评估结果</FormGroup>
      <div>
        <div class="flex items-center gap-8px">
          <div class="w-140px shrink-0 text-right text-14px text-gray-700">绩效评估结果</div>
          <Input
            v-model:value="formState.performanceResult"
            :disabled="isView"
            :maxlength="200"
            class="max-w-480px flex-1"
            placeholder="请输入"
          />
        </div>
        <!-- 绩效评估材料上传（多文件，可不传；本地演示不上传服务器） -->
        <div class="mt-12px flex items-start gap-8px">
          <div class="w-140px shrink-0 pt-4px text-right text-14px text-gray-700">绩效评估材料</div>
          <div class="flex-1">
            <Upload
              v-model:file-list="materialFiles"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              :before-upload="() => false"
              :disabled="isView"
            >
              <Button v-if="!isView" preIcon="i-ant-design:upload-outlined" class="rounded-none"> 上传文件 </Button>
            </Upload>
            <div v-if="isView && !materialFiles.length" class="text-14px text-gray-400">未上传</div>
          </div>
        </div>
      </div>

      <!-- ③ 四好目标评价（四条浅绿横条：勾选=展开对应块） -->
      <FormGroup>四好目标评价</FormGroup>
      <div>
        <div class="text-14px text-gray-700"> 选择完成的四好目标<span class="ml-4px text-#1677ff">（多选）</span> </div>

        <!-- 好房子横条：勾选=展开下方专属内容 -->
        <div class="mt-8px flex items-center gap-8px rd-4px bg-#f0faf3 px-12px py-8px">
          <Checkbox
            :checked="formState.selectedGoals.includes('好房子')"
            :disabled="isView"
            @change="toggleGoal('好房子')"
          />
          <span class="text-14px font-600 text-gray-800">好房子</span>
          <span
            class="ml-auto text-gray-400"
            :class="
              formState.selectedGoals.includes('好房子') ? 'i-ant-design:down-outlined' : 'i-ant-design:right-outlined'
            "
          ></span>
        </div>

        <!-- 1.好房子基本信息 -->
        <div
          v-if="formState.selectedGoals.includes('好房子')"
          class="mt-8px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">1. 好房子基本信息</div>
          <div class="mt-12px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
            <div>
              <div class="mb-4px text-14px text-gray-700">好房子达标套数（套）</div>
              <InputNumber
                v-model:value="formState.goodHouseCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">房屋用途</div>
              <Select
                v-model:value="formState.houseUse"
                :options="houseUseOptions"
                :disabled="isView"
                allow-clear
                class="w-120px"
                placeholder="请选择"
              />
            </div>
          </div>
          <div class="mt-12px text-14px font-600 text-gray-800">2. 选择好房子品质升级类型</div>
          <div class="mt-8px flex flex-col gap-8px">
            <div v-for="(options, group) in QUALITY_UPGRADE_OPTIONS" :key="group" class="flex items-center gap-12px">
              <span class="w-70px shrink-0 text-13px text-gray-500">{{ group }}</span>
              <CheckboxGroup
                v-model:value="formState.qualityUpgrades"
                :options="options.map((name) => ({ label: name, value: name }))"
                :disabled="isView"
              />
            </div>
          </div>
          <div class="mt-12px flex flex-wrap items-center gap-8px">
            <!-- 佐证材料：多文件上传（土地证、施工许可等） -->
            <Upload
              v-model:file-list="houseEvidenceFiles"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              :before-upload="() => false"
              :disabled="isView"
            >
              <Button v-if="!isView" preIcon="i-ant-design:upload-outlined" class="rounded-none">
                添加土地证、施工许可等佐证材料
              </Button>
            </Upload>
            <Button
              v-if="!isView"
              preIcon="i-ant-design:environment-outlined"
              class="rounded-none"
              @click="locationModalOpen = true"
            >
              添加位置信息
            </Button>
            <Button
              v-else
              preIcon="i-ant-design:environment-outlined"
              class="rounded-none"
              @click="locationModalOpen = true"
            >
              查看位置信息
            </Button>
          </div>
        </div>

        <!-- 好小区横条：勾选=展开下方专属内容 -->
        <div class="mt-8px flex items-center gap-8px rd-4px bg-#f0faf3 px-12px py-8px">
          <Checkbox
            :checked="formState.selectedGoals.includes('好小区')"
            :disabled="isView"
            @change="toggleGoal('好小区')"
          />
          <span class="text-14px font-600 text-gray-800">好小区</span>
          <span
            class="ml-auto text-gray-400"
            :class="
              formState.selectedGoals.includes('好小区') ? 'i-ant-design:down-outlined' : 'i-ant-design:right-outlined'
            "
          ></span>
        </div>

        <!-- 2.好小区基本信息（达标数量 + 明细表） -->
        <div
          v-if="formState.selectedGoals.includes('好小区')"
          class="mt-8px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">2. 好小区基本信息</div>
          <div class="mt-12px flex flex-wrap items-end gap-12px">
            <div class="w-280px">
              <div class="mb-4px text-14px text-gray-700">好小区达标数量（个）</div>
              <InputNumber
                v-model:value="formState.goodCommunityCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <template v-if="!isView">
              <a-button type="primary" @click="openCommunityEditor()"> 添加小区 </a-button>
              <a-button @click="handleTodo('导出信息')"> 导出信息 </a-button>
            </template>
          </div>
          <Table
            class="mt-12px"
            size="small"
            bordered
            row-key="name"
            :columns="communityColumns"
            :data-source="communityRows"
            :row-selection="communityRowSelection"
            :scroll="{ x: 1600 }"
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row, index }">
              <template v-if="column.dataIndex === 'index'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.dataIndex === 'geoLayer'">
                <span class="cursor-pointer text-#1677ff" @click="openCommunityGeo(row)">
                  <span class="i-ant-design:paper-clip-outlined mr-2px"></span>
                  {{ row.geoLayerJson ? '已上传' : '上传' }}
                </span>
              </template>
              <template v-else-if="column.dataIndex === 'attachment'">
                <Upload
                  v-if="!isView"
                  :show-upload-list="false"
                  multiple
                  :before-upload="(file) => handleAttachmentUpload(row, file)"
                >
                  <span class="cursor-pointer text-#1677ff">
                    <span class="i-ant-design:paper-clip-outlined mr-2px"></span>
                    {{ row.attachmentFiles?.length ? `已传${row.attachmentFiles.length}个` : '上传' }}
                  </span>
                </Upload>
                <span v-else class="text-gray-500">
                  {{ row.attachmentFiles?.length ? `已传${row.attachmentFiles.length}个` : '—' }}
                </span>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <span class="cursor-pointer text-#1677ff" @click="openCommunityEditor(row)">编辑</span>
                <span class="mx-8px text-gray-300">|</span>
                <span class="cursor-pointer text-#1677ff" @click="handleDeleteCommunityRow(row)"> 删除 </span>
              </template>
            </template>
          </Table>
        </div>

        <!-- 好社区横条：勾选=展开下方专属内容 -->
        <div class="mt-8px flex items-center gap-8px rd-4px bg-#f0faf3 px-12px py-8px">
          <Checkbox
            :checked="formState.selectedGoals.includes('好社区')"
            :disabled="isView"
            @change="toggleGoal('好社区')"
          />
          <span class="text-14px font-600 text-gray-800">好社区</span>
          <span
            class="ml-auto text-gray-400"
            :class="
              formState.selectedGoals.includes('好社区') ? 'i-ant-design:down-outlined' : 'i-ant-design:right-outlined'
            "
          ></span>
        </div>

        <!-- 3.好社区基本信息（字段填报，无明细表） -->
        <div
          v-if="formState.selectedGoals.includes('好社区')"
          class="mt-8px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">3. 好社区基本信息</div>
          <div class="mt-12px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-3">
            <div>
              <div class="mb-4px text-14px text-gray-700">项目成效是否为好社区的组成部分</div>
              <Select
                v-model:value="formState.communityPart"
                :options="yesNoOptions"
                :disabled="isView"
                allow-clear
                placeholder="请选择"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">选择所属社区</div>
              <Select
                v-model:value="formState.belongCommunity"
                :options="belongCommunityOptions"
                :disabled="isView"
                show-search
                option-filter-prop="label"
                allow-clear
                placeholder="搜索社区名称"
              />
            </div>
            <div class="flex items-end">
              <a-button v-if="!isView" type="primary" @click="handleTodo('添加社区信息')"> 添加社区信息 </a-button>
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">选择达标设施类型</div>
              <Select
                v-model:value="formState.facilityTypes"
                :options="facilityTypeOptions"
                :disabled="isView"
                mode="multiple"
                allow-clear
                class="w-full"
                placeholder="请选择"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">增加好房子达标套数（套）</div>
              <InputNumber
                v-model:value="formState.blockAddHouseCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">增加好小区达标数量（个）</div>
              <InputNumber
                v-model:value="formState.blockAddCommunityCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">达标设施覆盖半径（m）</div>
              <InputNumber
                v-model:value="formState.facilityRadius"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">达标设施覆盖人口（人）</div>
              <InputNumber
                v-model:value="formState.facilityPopulation"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">是否15分钟可达</div>
              <Select
                v-model:value="formState.reachable15Min"
                :options="yesNoOptions"
                :disabled="isView"
                allow-clear
                class="w-full"
                placeholder="请选择"
              />
            </div>
          </div>
        </div>

        <!-- 好城区横条：勾选=展开下方专属内容 -->
        <div class="mt-8px flex items-center gap-8px rd-4px bg-#f0faf3 px-12px py-8px">
          <Checkbox
            :checked="formState.selectedGoals.includes('好城区')"
            :disabled="isView"
            @change="toggleGoal('好城区')"
          />
          <span class="text-14px font-600 text-gray-800">好城区</span>
          <span
            class="ml-auto text-gray-400"
            :class="
              formState.selectedGoals.includes('好城区') ? 'i-ant-design:down-outlined' : 'i-ant-design:right-outlined'
            "
          ></span>
        </div>

        <!-- 4.好城区基本信息（字段填报，无明细表） -->
        <div
          v-if="formState.selectedGoals.includes('好城区')"
          class="mt-8px b-1 b-solid b-gray-100 rd-4px px-16px py-12px"
        >
          <div class="text-14px font-600 text-gray-800">4. 好城区基本信息</div>
          <div class="mt-12px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-3">
            <div>
              <div class="mb-4px text-14px text-gray-700">项目成效是否为好城区的组成部分</div>
              <Select
                v-model:value="formState.cityPart"
                :options="yesNoOptions"
                :disabled="isView"
                allow-clear
                class="w-full"
                placeholder="请选择"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">选择所属城区</div>
              <Select
                v-model:value="formState.belongCityDistrict"
                :options="belongCityDistrictOptions"
                :disabled="isView"
                show-search
                option-filter-prop="label"
                allow-clear
                class="w-full"
                placeholder="搜索城区名称"
              />
            </div>
            <div class="flex items-end">
              <a-button v-if="!isView" type="primary" @click="handleTodo('添加城区信息')"> 添加城区信息 </a-button>
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">增加好房子达标数（套）</div>
              <InputNumber
                v-model:value="formState.cityAddHouseCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">增加好小区达标数量（个）</div>
              <InputNumber
                v-model:value="formState.cityAddCommunityCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
            <div>
              <div class="mb-4px text-14px text-gray-700">增加好社区达标数量（个）</div>
              <InputNumber
                v-model:value="formState.cityAddBlockCount"
                :min="0"
                :disabled="isView"
                class="w-full"
                placeholder="请输入"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 位置信息弹窗（好房子）：内嵌地理数据区块（上传 shp/dwg 解析 + 编辑地图，解析接口暂为占位） -->
    <Modal v-model:open="locationModalOpen" title="位置信息" centered :footer="null" width="760">
      <GeoDataSection
        v-model:geo-json="houseLocationGeoJson"
        v-model:file-name="houseLocationFileName"
        :parse-file="parseGeoFile"
        :geometry-types="['polygon']"
        :disabled="isView"
      />
    </Modal>

    <!-- 添加/编辑小区弹窗（确定写回本地明细行；空表起步无演示数据） -->
    <Modal
      v-model:open="communityEditorOpen"
      :title="communityEditorIndex < 0 ? '添加小区' : '编辑小区'"
      centered
      width="640"
      ok-text="确定"
      cancel-text="取消"
      @ok="confirmCommunityEditor"
    >
      <div class="grid grid-cols-1 gap-x-24px gap-y-12px pt-8px md:grid-cols-2">
        <div>
          <div class="mb-4px text-14px text-gray-700"><span class="text-#ff4d4f">*</span> 小区名称</div>
          <Input v-model:value="communityEditor.name" :maxlength="50" placeholder="请输入小区名称" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">小区地址</div>
          <Input v-model:value="communityEditor.address" :maxlength="100" placeholder="请输入小区地址" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">总栋数（栋）</div>
          <InputNumber v-model:value="communityEditor.buildingCount" :min="0" class="w-full" placeholder="请输入" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">总套数（套）</div>
          <InputNumber v-model:value="communityEditor.householdCount" :min="0" class="w-full" placeholder="请输入" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">建筑面积（万平方米）</div>
          <InputNumber v-model:value="communityEditor.buildingArea" :min="0" class="w-full" placeholder="请输入" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">物业公司</div>
          <Input v-model:value="communityEditor.propertyCompany" :maxlength="100" placeholder="请输入物业公司" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">业委会信息</div>
          <Input v-model:value="communityEditor.ownersCommittee" :maxlength="50" placeholder="如：已成立" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">物业费标准（元/㎡）</div>
          <InputNumber v-model:value="communityEditor.propertyFee" :min="0" class="w-full" placeholder="请输入" />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">配套设施覆盖率（%）</div>
          <InputNumber
            v-model:value="communityEditor.facilityCoverage"
            :min="0"
            :max="100"
            class="w-full"
            placeholder="请输入"
          />
        </div>
        <div>
          <div class="mb-4px text-14px text-gray-700">安全达标指数</div>
          <InputNumber v-model:value="communityEditor.safetyIndex" :min="0" class="w-full" placeholder="请输入" />
        </div>
      </div>
    </Modal>

    <!-- 空间位置图层弹窗（小区行）：内嵌地理数据区块，确定即写回行数据 -->
    <Modal v-model:open="communityGeoModalOpen" title="空间位置图层" centered :footer="null" width="760">
      <GeoDataSection
        :geo-json="communityGeoRow?.geoLayerJson"
        :file-name="communityGeoFileName"
        :parse-file="parseGeoFile"
        :geometry-types="['polygon']"
        :disabled="isView"
        @update:geo-json="(geoJson) => communityGeoRow && (communityGeoRow.geoLayerJson = geoJson)"
        @update:file-name="(name) => (communityGeoFileName = name)"
      />
    </Modal>

    <!-- 底部按钮：查看=关闭；去评估=取消/暂存/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('暂存')"> 暂存 </a-button>
        <a-button type="primary" @click="handleSave('提交')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplEffectProjectManagementForm">
  import { computed, reactive, ref } from 'vue';
  import {
    Checkbox,
    CheckboxGroup,
    DatePicker,
    Input,
    InputNumber,
    Modal,
    Select,
    Table,
    TextArea,
    Upload,
  } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { Button } from '@jeesite/core/components/Button';
  import { FormGroup } from '@jeesite/core/components/Form';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { GeoDataSection } from '@jeesite/shared/components/geo-data-section';
  import {
    BELONG_CITY_DISTRICT_OPTIONS,
    BELONG_COMMUNITY_OPTIONS,
    EFFECT_ITEMS,
    FACILITY_TYPE_OPTIONS,
    HOUSE_USE_OPTIONS,
    QUALITY_UPGRADE_OPTIONS,
    YES_NO_OPTIONS,
    fiveReformLabel,
    parseGeoFile,
    projectAffiliationLabel,
    type EffectItem,
    type FourGoodGoal,
    type FourGoodUnitRow,
    type HouseUse,
    type YesNo,
  } from '@jeesite/ifco/api/ifco/impl-effect';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<EffectItem>>({});

  // ── 表单状态（抽屉打开时按行数据整体重建） ──────────────────────────
  const formState = reactive({
    evaluateDate: '',
    operatingOrg: '',
    effectDescription: '',
    performanceResult: '',
    selectedGoals: [] as FourGoodGoal[],
    // 好房子
    goodHouseCount: undefined as number | undefined,
    houseUse: undefined as HouseUse | undefined,
    qualityUpgrades: [] as string[],
    // 好小区
    goodCommunityCount: undefined as number | undefined,
    // 好社区（字段填报）
    communityPart: undefined as YesNo | undefined,
    belongCommunity: undefined as string | undefined,
    facilityTypes: [] as string[],
    blockAddHouseCount: undefined as number | undefined,
    blockAddCommunityCount: undefined as number | undefined,
    facilityRadius: undefined as number | undefined,
    facilityPopulation: undefined as number | undefined,
    reachable15Min: undefined as YesNo | undefined,
    // 好城区（字段填报）
    cityPart: undefined as YesNo | undefined,
    belongCityDistrict: undefined as string | undefined,
    cityAddHouseCount: undefined as number | undefined,
    cityAddCommunityCount: undefined as number | undefined,
    cityAddBlockCount: undefined as number | undefined,
  });

  /** 好房子佐证材料（土地证、施工许可等；多文件，本地演示不上传服务器） */
  const houseEvidenceFiles = ref<UploadFile[]>([]);

  /** 好房子位置信息（GeoJSON；源文件名仅会话内展示，后端不存储） */
  const houseLocationGeoJson = ref<string | undefined>();
  const houseLocationFileName = ref<string | undefined>();
  const locationModalOpen = ref(false);

  /** 勾选/取消四好目标（勾选即展开对应块） */
  function toggleGoal(goal: FourGoodGoal) {
    const index = formState.selectedGoals.indexOf(goal);
    if (index >= 0) {
      formState.selectedGoals.splice(index, 1);
    } else {
      formState.selectedGoals.push(goal);
    }
  }

  /** 对比照片缩略图（假数据文件名给灰底占位） */
  const PHOTO_THUMB =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="#eef1f5"/><text x="48" y="54" font-size="13" text-anchor="middle" fill="#9aa3af">照片</text></svg>',
    );

  /** 对比照片组（改造前/改造后；用户按组动态新增，可无限新增、可不传） */
  const photoGroups = ref<{ id: number; before: UploadFile[]; after: UploadFile[] }[]>([]);
  let photoGroupSeq = 0;

  /** 绩效评估材料（多文件，本地演示不上传服务器） */
  const materialFiles = ref<UploadFile[]>([]);

  function toFileList(names: string[], side: string, groupIndex: number): UploadFile[] {
    return names.map((name, index) => ({
      uid: `g${groupIndex}-${side}-${index}`,
      name,
      status: 'done',
      thumbUrl: PHOTO_THUMB,
    }));
  }

  function handleAddPhotoGroup() {
    photoGroups.value.push({ id: ++photoGroupSeq, before: [], after: [] });
  }

  function handleRemovePhotoGroup(index: number) {
    photoGroups.value.splice(index, 1);
  }

  // ── 好小区明细行（空表起步；添加/编辑/删除/行内上传均本地真实维护） ──
  const communityRows = ref<FourGoodUnitRow[]>([]);

  /** 表格勾选行（仅本地演示，无批量操作） */
  const selectedCommunityKeys = ref<(string | number)[]>([]);
  const communityRowSelection = computed(() =>
    isView.value
      ? undefined
      : {
          selectedRowKeys: selectedCommunityKeys.value,
          onChange: (keys: (string | number)[]) => (selectedCommunityKeys.value = keys),
        },
  );

  /** 好小区明细表列（查看态隐藏操作列与复选框列） */
  const communityColumns = computed<Recordable[]>(() => {
    const columns: Recordable[] = [
      { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
      { title: '小区名称', dataIndex: 'name', width: 140 },
      { title: '小区地址', dataIndex: 'address', width: 170 },
      { title: '总栋数（栋）', dataIndex: 'buildingCount', width: 90, align: 'right' },
      { title: '总套数（套）', dataIndex: 'householdCount', width: 90, align: 'right' },
      { title: '建筑面积（万平方米）', dataIndex: 'buildingArea', width: 130, align: 'right' },
      { title: '物业公司', dataIndex: 'propertyCompany', width: 150 },
      { title: '业委会信息', dataIndex: 'ownersCommittee', width: 90 },
      { title: '物业费标准（元/㎡）', dataIndex: 'propertyFee', width: 130, align: 'right' },
      { title: '配套设施覆盖率', dataIndex: 'facilityCoverage', width: 120, align: 'right' },
      { title: '安全达标指数', dataIndex: 'safetyIndex', width: 100, align: 'right' },
      { title: '空间位置图层', dataIndex: 'geoLayer', width: 100 },
      { title: '佐证附件', dataIndex: 'attachment', width: 90 },
    ];
    if (!isView.value) {
      columns.push({ title: '操作', dataIndex: 'action', width: 100 });
    }
    return columns;
  });

  /** 添加/编辑小区弹窗（communityEditorIndex=-1 为新增） */
  const communityEditorOpen = ref(false);
  const communityEditorIndex = ref(-1);
  const communityEditor = reactive({
    name: '',
    address: '',
    buildingCount: undefined as number | undefined,
    householdCount: undefined as number | undefined,
    buildingArea: undefined as number | undefined,
    propertyCompany: '',
    ownersCommittee: '',
    propertyFee: undefined as number | undefined,
    facilityCoverage: undefined as number | undefined,
    safetyIndex: undefined as number | undefined,
  });

  function openCommunityEditor(row?: FourGoodUnitRow) {
    communityEditorIndex.value = row ? communityRows.value.indexOf(row) : -1;
    communityEditor.name = row?.name ?? '';
    communityEditor.address = row?.address ?? '';
    communityEditor.buildingCount = row?.buildingCount;
    communityEditor.householdCount = row?.householdCount;
    communityEditor.buildingArea = row?.buildingArea;
    communityEditor.propertyCompany = row?.propertyCompany ?? '';
    communityEditor.ownersCommittee = row?.ownersCommittee ?? '';
    communityEditor.propertyFee = row?.propertyFee;
    communityEditor.facilityCoverage = row?.facilityCoverage;
    communityEditor.safetyIndex = row?.safetyIndex;
    communityEditorOpen.value = true;
  }

  /** 确定：小区名称必填，编辑写回原行 / 新增 push（空间位置与附件不进弹窗） */
  function confirmCommunityEditor() {
    if (!communityEditor.name.trim()) {
      showMessage('请输入小区名称');
      return;
    }
    const edited = { ...communityEditor };
    if (communityEditorIndex.value >= 0) {
      Object.assign(communityRows.value[communityEditorIndex.value], edited);
    } else {
      communityRows.value.push({ ...edited, geoLayerJson: undefined, attachmentFiles: [] });
    }
    communityEditorOpen.value = false;
  }

  /** 行内佐证附件上传（多文件，本地收集文件名；before-upload 返回 false 阻止自动上传） */
  function handleAttachmentUpload(row: FourGoodUnitRow, file: File) {
    row.attachmentFiles = [...(row.attachmentFiles ?? []), file.name];
    return false;
  }

  /** 行内空间位置图层弹窗（GeoDataSection 上传/编辑/查看，写回行数据） */
  const communityGeoModalOpen = ref(false);
  const communityGeoRow = ref<FourGoodUnitRow | null>(null);
  const communityGeoFileName = ref<string | undefined>();

  function openCommunityGeo(row: FourGoodUnitRow) {
    communityGeoRow.value = row;
    communityGeoFileName.value = undefined;
    communityGeoModalOpen.value = true;
  }

  /** 明细行删除（仅本地） */
  function handleDeleteCommunityRow(row: FourGoodUnitRow) {
    const index = communityRows.value.indexOf(row);
    if (index >= 0) communityRows.value.splice(index, 1);
  }

  const houseUseOptions = HOUSE_USE_OPTIONS.map((name) => ({ label: name, value: name }));
  const yesNoOptions = YES_NO_OPTIONS.map((name) => ({ label: name, value: name }));
  const belongCommunityOptions = BELONG_COMMUNITY_OPTIONS.map((name) => ({ label: name, value: name }));
  const belongCityDistrictOptions = BELONG_CITY_DISTRICT_OPTIONS.map((name) => ({ label: name, value: name }));
  const facilityTypeOptions = FACILITY_TYPE_OPTIONS.map((name) => ({ label: name, value: name }));

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<EffectItem>;

    formState.evaluateDate = record.value.evaluateDate ?? '';
    formState.operatingOrg = record.value.operatingOrg ?? '';
    formState.effectDescription = record.value.effectDescription ?? '';
    formState.performanceResult = record.value.performanceResult ?? '';
    formState.selectedGoals = [...(record.value.selectedGoals ?? [])];
    formState.goodHouseCount = record.value.goodHouseCount;
    formState.houseUse = record.value.houseUse;
    formState.qualityUpgrades = [...(record.value.qualityUpgrades ?? [])];
    formState.goodCommunityCount = record.value.goodCommunityCount;
    formState.communityPart = record.value.communityPart;
    formState.belongCommunity = record.value.belongCommunity;
    formState.facilityTypes = [...(record.value.facilityTypes ?? [])];
    formState.blockAddHouseCount = record.value.blockAddHouseCount;
    formState.blockAddCommunityCount = record.value.blockAddCommunityCount;
    formState.facilityRadius = record.value.facilityRadius;
    formState.facilityPopulation = record.value.facilityPopulation;
    formState.reachable15Min = record.value.reachable15Min;
    formState.cityPart = record.value.cityPart;
    formState.belongCityDistrict = record.value.belongCityDistrict;
    formState.cityAddHouseCount = record.value.cityAddHouseCount;
    formState.cityAddCommunityCount = record.value.cityAddCommunityCount;
    formState.cityAddBlockCount = record.value.cityAddBlockCount;

    // 只回显有照片的分组（待评估行的空分组不占位），用户可随时新增一组
    photoGroups.value = (record.value.comparePhotos ?? [])
      .filter((group) => group.before.length > 0 || group.after.length > 0)
      .map((group, index) => ({
        id: ++photoGroupSeq,
        before: toFileList(group.before, 'before', index),
        after: toFileList(group.after, 'after', index),
      }));
    materialFiles.value = toFileList(record.value.performanceMaterials ?? [], 'material', 0);
    houseEvidenceFiles.value = toFileList(record.value.houseEvidenceFiles ?? [], 'evidence', 0);
    houseLocationGeoJson.value = record.value.houseLocationGeoJson;
    houseLocationFileName.value = undefined;
    locationModalOpen.value = false;
    selectedCommunityKeys.value = [];

    communityRows.value = (record.value.communityRows ?? []).map((row) => ({ ...row }));

    setDrawerProps({ loading: false });
  });

  /** 暂存 / 提交：提交校验必填（评估日期/四好目标；对比照片与材料可不传），暂存不校验 */
  function handleSave(mode: '暂存' | '提交') {
    if (mode === '提交') {
      if (!formState.evaluateDate) {
        showMessage('请选择评估日期');
        return;
      }
      if (!formState.selectedGoals.length) {
        showMessage('请选择完成的四好目标');
        return;
      }
    }
    const target = EFFECT_ITEMS.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.evaluateDate = formState.evaluateDate;
      target.operatingOrg = formState.operatingOrg;
      target.effectDescription = formState.effectDescription;
      target.performanceResult = formState.performanceResult;
      target.selectedGoals = [...formState.selectedGoals];
      target.goodHouseCount = formState.goodHouseCount;
      target.houseUse = formState.houseUse;
      target.qualityUpgrades = [...formState.qualityUpgrades];
      target.houseEvidenceFiles = houseEvidenceFiles.value.map((file) => file.name);
      target.houseLocationGeoJson = houseLocationGeoJson.value;
      target.goodCommunityCount = formState.goodCommunityCount;
      target.communityRows = communityRows.value.map((row) => ({ ...row }));
      target.communityPart = formState.communityPart;
      target.belongCommunity = formState.belongCommunity;
      target.facilityTypes = [...formState.facilityTypes];
      target.blockAddHouseCount = formState.blockAddHouseCount;
      target.blockAddCommunityCount = formState.blockAddCommunityCount;
      target.facilityRadius = formState.facilityRadius;
      target.facilityPopulation = formState.facilityPopulation;
      target.reachable15Min = formState.reachable15Min;
      target.cityPart = formState.cityPart;
      target.belongCityDistrict = formState.belongCityDistrict;
      target.cityAddHouseCount = formState.cityAddHouseCount;
      target.cityAddCommunityCount = formState.cityAddCommunityCount;
      target.cityAddBlockCount = formState.cityAddBlockCount;
      target.comparePhotos = photoGroups.value.map((group) => ({
        before: group.before.map((file) => file.name),
        after: group.after.map((file) => file.name),
      }));
      target.performanceMaterials = materialFiles.value.map((file) => file.name);
      target.evaluateStatus = mode === '提交' ? '已完成' : '待评估';
    }
    showMessage(mode === '暂存' ? '暂存成功（状态保持待评估）' : '提交成功，成效评估已完成');
    closeDrawer();
    emit('success', target);
  }

  /** 占位操作（TODO：随材料上传/图层/导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
