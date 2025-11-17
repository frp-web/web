import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'
import { themeColors } from './app/constants/theme'

const breakpoints = {
  'xs': '320px',
  'sm': '480px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
  '3xl': '1920px'
}

export default defineConfig({
  content: {
    pipeline: {
      include: [
        /app\/.*\.(vue|ts)$/
      ]
    }
  },
  theme: {
    breakpoints
  },
  shortcuts: [
    [/^clickable(-.*)?$/, ([, scale]) => `cursor-pointer transition active:scale${scale || '-95'}`],

    // colors
    {
      // 基础背景色
      'bg-base': `bg-[${themeColors.light.bgBase}] dark:bg-[${themeColors.dark.bgBase}]`,
      'bg-container': `bg-[${themeColors.light.bgContainer}] dark:bg-[${themeColors.dark.bgContainer}]`,
      'bg-elevated': `bg-[${themeColors.light.bgElevated}] dark:bg-[${themeColors.dark.bgElevated}]`,
      // 文字颜色
      'color-base': `text-[${themeColors.light.textPrimary}] dark:text-[${themeColors.dark.textPrimary}]`,
      'color-secondary': `text-[${themeColors.light.textSecondary}] dark:text-[${themeColors.dark.textSecondary}]`,
      'color-tertiary': `text-[${themeColors.light.textTertiary}] dark:text-[${themeColors.dark.textTertiary}]`,
      // 边框颜色
      'border-base': `border-[${themeColors.light.borderBase}] dark:border-[${themeColors.dark.borderBase}]`,
      'border-light': `border-[${themeColors.light.borderLight}] dark:border-[${themeColors.dark.borderLight}]`,
      // 主题色
      'color-primary': `text-[${themeColors.light.primary}] dark:text-[${themeColors.dark.primary}]`,
      'bg-primary': `bg-[${themeColors.light.primary}] dark:bg-[${themeColors.dark.primary}]`,
      'border-primary': `border-[${themeColors.light.primary}] dark:border-[${themeColors.dark.primary}]`,
      'color-secondary-theme': `text-[${themeColors.light.secondary}] dark:text-[${themeColors.dark.secondary}]`,
      'bg-secondary-theme': `bg-[${themeColors.light.secondary}] dark:bg-[${themeColors.dark.secondary}]`,
      // 状态色
      'color-success': `text-[${themeColors.light.success}] dark:text-[${themeColors.dark.success}]`,
      'bg-success': `bg-[${themeColors.light.success}] dark:bg-[${themeColors.dark.success}]`,
      'color-warning': `text-[${themeColors.light.warning}] dark:text-[${themeColors.dark.warning}]`,
      'bg-warning': `bg-[${themeColors.light.warning}] dark:bg-[${themeColors.dark.warning}]`,
      'color-error': `text-[${themeColors.light.error}] dark:text-[${themeColors.dark.error}]`,
      'bg-error': `bg-[${themeColors.light.error}] dark:bg-[${themeColors.dark.error}]`,
      'color-info': `text-[${themeColors.light.info}] dark:text-[${themeColors.dark.info}]`,
      'bg-info': `bg-[${themeColors.light.info}] dark:bg-[${themeColors.dark.info}]`
    },

    ['pr', 'relative'],
    ['pa', 'absolute'],
    ['pf', 'fixed'],
    ['ps', 'sticky'],

    // position layout
    ['pxc', 'pa left-1/2 -translate-x-1/2'],
    ['pyc', 'pa top-1/2 -translate-y-1/2'],
    ['pcc', 'pxc pyc'],

    // flex layout
    ['fcc', 'flex justify-center items-center'],
    ['fccc', 'fcc flex-col'],
    ['fxc', 'flex justify-center'],
    ['fyc', 'flex items-center'],
    ['fs', 'flex justify-start'],
    ['fsc', 'flex justify-start items-center'],
    ['fse', 'flex justify-start items-end'],
    ['fe', 'flex justify-end'],
    ['fec', 'flex justify-end items-center'],
    ['fb', 'flex justify-between'],
    ['fbc', 'flex justify-between items-center'],
    ['fa', 'flex justify-around'],
    ['fac', 'flex justify-around items-center'],
    ['fw', 'flex justify-wrap'],
    ['fwr', 'flex justify-wrap-reverse']
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'height': '1.2em',
        'width': '1.2em',
        'vertical-align': 'text-bottom'
      },
      cdn: 'https://esm.sh/'
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'Inter'
      },
      processors: createLocalFontProcessor()
    })
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup()
  ]
})
