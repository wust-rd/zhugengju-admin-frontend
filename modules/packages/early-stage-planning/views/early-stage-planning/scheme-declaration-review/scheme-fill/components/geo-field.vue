<!--
  地理数据字段（WKT 存储口径的 GeoDataSection 包装，范围线/矢量图斑共用）

  后端 scopeLine / mapSpot 存「WKT 字符串」（MULTIPOLYGON 文本，与
  geometry 列存量格式一致），GeoDataSection 地图渲染/编辑用 GeoJSON
  —— 本组件负责双向换算，对区块暴露 v-model:value（WKT 字符串）：
   - 回显：value → wktToGeoJson 还原 GeoJSON 渲染；
   - 上传：仅接受 .dwg（POST /a/esp/schemeFill/parseVector）。上传按钮 hover
     弹出源坐标系选择（武汉2000【默认】/ WGS84），按钮文案实时显示当前坐标，
     解析时以 type 参数传后端（返回 wkt/bbox 始终为 WGS84）；
   - 上传/编辑产生的 GeoJSON → geoJsonToWkt 序列化为 MULTIPOLYGON 回写 value。
  无面要素（未上传/未绘制）时 value 为 undefined；源文件名仅会话内展示，后端不存储。
-->
<template>
  <GeoDataSection
    v-model:geo-json="geoJsonText"
    v-model:file-name="fileName"
    :parse-file="parseFile"
    accept=".dwg"
    upload-text="上传 dwg 文件"
    :geometry-types="['polygon']"
    :disabled="disabled"
  >
    <template #uploadButton="{ parsing, selectFile }">
      <Dropdown
        :trigger="['hover']"
        :menu="{ items: coordMenuItems, onClick: (info) => onCoordClick(info, selectFile) }"
      >
        <!-- 按钮仅作 hover 入口，点击不触发任何操作（由菜单项决定坐标并打开文件选择） -->
        <Button
          preIcon="i-ant-design:upload-outlined"
          class="rounded-none"
          :loading="parsing"
          title="悬停选择源坐标系后上传"
          @click.prevent
        >
          上传 dwg 文件
        </Button>
      </Dropdown>
    </template>
  </GeoDataSection>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeFillGeoField">
  import { computed, h, ref, watch } from 'vue';
  import { Dropdown } from 'antdv-next';
  import { Button } from '@jeesite/core/components/Button';
  import { GeoDataSection } from '@jeesite/shared/components/geo-data-section';
  import {
    geoJsonToWkt,
    schemeFillParseVector,
    wktToGeoJson,
    type EspCoordType,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

  const props = defineProps<{ value?: string | null; disabled?: boolean }>();
  const emit = defineEmits(['update:value']);

  /** 源坐标系选项（type 入参；武汉2000 为默认） */
  const COORD_OPTIONS: { value: EspCoordType; label: string }[] = [
    { value: 'CGCS_WH_2000', label: '武汉2000' },
    { value: 'WGS84', label: 'WGS84' },
  ];

  /** 当前选中的源坐标系（默认武汉2000；上传解析时作为 type 参数传后端） */
  const coordType = ref<EspCoordType>('CGCS_WH_2000');
  const coordLabel = computed(() => COORD_OPTIONS.find((o) => o.value === coordType.value)?.label ?? '');

  /** hover 菜单项：当前坐标系前打勾 */
  const coordMenuItems = computed(() =>
    COORD_OPTIONS.map((opt) => ({
      key: opt.value,
      label:
        coordType.value === opt.value
          ? h('span', { class: 'inline-flex items-center gap-4px' }, [
              // h('span', { class: 'i-ant-design:check-outlined' }),
              opt.label,
            ])
          : opt.label,
    })),
  );

  /** 点击坐标菜单项：记录本次上传的源坐标系（按钮文案同步），并立即打开文件选择框 */
  function onCoordClick({ key }: { key: string | number }, selectFile: () => void) {
    coordType.value = key as EspCoordType;
    selectFile();
  }

  /** 展示层 GeoJSON（GeoDataSection 消费；初值由存储 WKT 还原） */
  const geoJsonText = ref<string | undefined>(wktToGeoJson(props.value));
  /** 上传源文件名（仅会话内展示） */
  const fileName = ref<string | undefined>();

  /** 展示层 GeoJSON 变化（上传解析/编辑回传）→ 序列化存储 WKT 回写 */
  watch(geoJsonText, (geoJson) => {
    emit('update:value', geoJsonToWkt(geoJson));
  });

  /** 上传解析：以当前选中的源坐标系传 type；还原 GeoJSON 供地图展示与编辑（存储值经上方 watch 统一回写） */
  async function parseFile(file: File): Promise<string> {
    const parsed = await schemeFillParseVector(file, coordType.value);
    const geoJson = wktToGeoJson(parsed.wkt);
    if (!geoJson) {
      throw new Error('矢量解析结果无法识别');
    }
    return geoJson;
  }
</script>
