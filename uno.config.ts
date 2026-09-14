import { defineConfig, UserConfig, presetTypography, presetIcons, transformerDirectives } from 'unocss';
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders';
import { presetWind3 } from '@unocss/preset-wind3';
import { presetAntd } from '@antdv-next/unocss';

export default defineConfig({
  inspector: false,
  // presetWind3 不自带 Tailwind 的 border 重置（presetWind4 才有），而 b / border / b-<color> 系列
  // 只声明 border-width 或 border-color，浏览器 border-style 初始值为 none → 边框全部画不出来。
  // 这里补上重置（等价于 presetWind4 / Tailwind v4 的 `border: 0 solid`），工具类的边框样式即可生效。
  preflights: [
    {
      getCSS: () => '*,::before,::after,::backdrop{border:0 solid}',
    },
  ],
  rules: [
    // 优设标题黑：对应 custom/font.less 的 @font-face，用于大屏标题
    ['font-youshe', { 'font-family': '"YouSheBiaoTiHei", "PingFang SC", "Microsoft YaHei", sans-serif' }],
    // 鸿蒙字体：对应 custom/harmony-os.less 的分片 @font-face
    ['font-harmony', { 'font-family': '"HarmonyOS", sans-serif' }],
    // Subway Ticker Grid 地铁信息牌点阵：对应 custom/subway.less 的 @font-face，用于数字/时间显示
    ['font-subway', { 'font-family': '"SubwayTickerGrid", sans-serif' }],
    // Chakra Petch：Figma 大屏西文字体，对应 custom/chakra-petch.less 的 @font-face，用于胶囊缩写/西文文本
    ['font-chakra', { 'font-family': '"Chakra Petch", "PingFang SC", "Microsoft YaHei", sans-serif' }],
  ],
  content: {
    pipeline: {
      include: ['**/*.vue', '**/*.tsx', '**/*.ts'],
      exclude: ['.git', '.idea', '.turbo', 'node_modules', 'public'],
    },
  },
  presets: [
    presetAntd(),
    presetWind3(),
    presetTypography(),
    presetIcons({
      cdn: 'https://esm.sh/',
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
      collections: {
        svg: FileSystemIconLoader(__dirname + '/packages/assets/icons'),
      },
    }),
  ],
  transformers: [transformerDirectives()],
} as UserConfig);
