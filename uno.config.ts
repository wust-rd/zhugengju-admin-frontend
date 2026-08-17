import { presetAntd } from '@antdv-next/unocss';
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders';
import { defineConfig, presetIcons, presetTypography, presetWind4, transformerDirectives, UserConfig } from 'unocss';
import { presetExtra } from 'unocss-preset-extra';

export default defineConfig({
  inspector: false,
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
