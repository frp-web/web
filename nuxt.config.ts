import { fileURLToPath } from 'node:url'
import lodashImports from 'lodash-imports'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import component from 'unplugin-vue-components/vite'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const lodash = lodashImports({ hasFrom: true })

export default defineNuxtConfig({
  app: {
    head: {
      title: 'FRP Web',
      link: [
        {
          rel: 'icon',
          type: 'image/vnd.microsoft.icon',
          href: '/favicon.ico'
        }
      ]
    }
  },

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n'
  ],

  css: [
    '@unocss/reset/tailwind-compat.css'
  ],

  colorMode: {
    classSuffix: '',
    preference: 'light'
  },

  i18n: {
    locales: [
      {
        code: 'zh-CN',
        name: '简体中文',
        file: 'zh-CN.json'
      },
      {
        code: 'en-US',
        name: 'English',
        file: 'en-US.json'
      }
    ],
    langDir: '../i18n/locales',
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix'
  },

  imports: {
    dirs: [
      'app/composables/**'
    ],
    imports: [
      ...lodash.imports
    ]
  },

  vite: {
    plugins: [
      component({
        dts: r('./.nuxt/lib-components.d.ts'),
        resolvers: [
          AntDesignVueResolver({
            importStyle: false, // 开发环境不导入样式，使用 CSS
            prefix: 'Ant'
          })
        ]
      })
    ],
    // 优化 Vite 配置
    optimizeDeps: {
      include: [
        'ant-design-vue',
        'dayjs',
        'pinia',
        'vue',
        'vue-router'
      ],
      exclude: ['@nuxtjs/i18n']
    },
    // 开发服务器配置
    server: {
      watch: {
        // 减少文件监听，提升性能
        ignored: [
          '**/.git/**',
          '**/node_modules/**',
          '**/.nuxt/**',
          '**/dist/**',
          '**/i18n/locales/**' // 翻译文件不需要热更新
        ]
      }
    }
  },

  typescript: {
    tsConfig: {
      include: [
        './lib-components.d.ts'
      ]
    }
  },

  // 构建优化
  build: {
    analyze: false // 生产环境可以设置为 true 分析包大小
  },

  // 实验性功能
  experimental: {
    // 启用 Vite 5 的优化
    typedPages: false
  },

  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})
