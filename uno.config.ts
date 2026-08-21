import { presetAntd } from '@antdv-next/unocss';
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders';
import { defineConfig, presetIcons, presetTypography, presetWind4, transformerDirectives, UserConfig } from 'unocss';
import { presetExtra } from 'unocss-preset-extra';

export default defineConfig({
  inspector: false,
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
    presetWind4(),
    presetTypography(),
    presetExtra(),
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
