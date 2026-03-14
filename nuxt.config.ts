import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import component from 'unplugin-vue-components/vite'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// 判断是否为开发环境
const isDev = process.env.NODE_ENV !== 'production'

export default defineNuxtConfig({
  // Nuxt 5 兼容模式
  future: {
    compatibilityVersion: 5
  },

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

  // @nuxtjs/color-mode 配置
  colorMode: {
    classSuffix: '',
    preference: 'light'
  },

  i18n: {
    defaultLocale: 'zh-CN',
    locales: [
      { code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'en-US', name: 'English', file: 'en-US.json' }
    ]
  },

  imports: {
    dirs: [
      'app/composables/**'
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
        '@vueuse/core',
        '@vueuse/nuxt'
      ],
      exclude: ['@nuxtjs/i18n', 'vue-router']
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
          '**/i18n/locales/**', // 翻译文件不需要热更新
          '**/.frp-web/**' // FRP 工作目录不需要监听
        ]
      },
      // 增加 HMR 覆盖率限制
      hmr: {
        overlay: false
      }
    },
    // 构建优化
    build: {
      minify: 'esbuild',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('ant-design-vue'))
              return 'antd'
            if (id.includes('@antv/g2'))
              return 'charts'
            if (id.includes('monaco-editor'))
              return 'editor'
          }
        }
      }
    },
    // 预构建优化（Vite 8 准备: esbuild -> oxc）
    esbuild: {
      target: 'esnext'
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
    // Nuxt 5: callHook 不总是返回 Promise（性能优化）
    asyncCallHook: false
  },

  compatibilityDate: '2024-11-01',
  devtools: { enabled: isDev },

  // 开发环境性能优化
  ...(isDev && {
    // 开发时禁用源码生成以加快启动
    sourcemap: {
      server: false,
      client: false
    },
    // 开发时减少构建开销
    nitro: {
      experimental: {
        openAPI: false
      }
    }
  }),

  // 性能优化
  features: {
    // 禁用 inline 样式以提高 SSR 性能
    inlineStyles: false
  }
})
