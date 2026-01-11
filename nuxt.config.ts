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
            importStyle: 'less',
            prefix: 'Ant'
          })
        ]
      })
    ]
  },

  typescript: {
    tsConfig: {
      include: [
        './lib-components.d.ts'
      ]
    }
  },

  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})
