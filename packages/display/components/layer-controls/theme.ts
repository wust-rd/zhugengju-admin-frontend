/** 面板局部主题：Switch / Divider / Checkbox 统一青蓝；ConfigProvider 作用域内生效，不改全局 */
export const PANEL_THEME: any = {
  components: {
    Switch: {
      colorPrimary: '#00b8d4',
      // hover / active 不加深：与主色一致，避免悬停增色
      colorPrimaryHover: '#00b8d4',
      colorPrimaryActive: '#00b8d4',
      // 关闭（未选中）轨道背景改浅灰；hover 用同色，悬停不变色
      colorTextQuaternary: 'rgba(255, 255, 255, 0.3)',
      colorTextTertiary: 'rgba(255, 255, 255, 0.3)',
      trackMinWidthSM: 30,
      trackHeightSM: 16,
      handleSizeSM: 12,
      trackPadding: 2,
    },
    Divider: {
      // 深色面板上的分割线颜色（默认 colorSplit 近黑不可见）
      colorSplit: 'rgba(255, 255, 255, 0.12)',
    },
    Checkbox: {
      // 方形复选框：选中/半选用青蓝，未选中边框浅灰（深色面板可见）
      colorPrimary: '#00b8d4',
      // hover 不加深/不加色：选中 hover 与选中色一致
      colorPrimaryHover: '#00b8d4',
      colorBorder: 'rgba(255, 255, 255, 0.25)',
    },
  },
};
