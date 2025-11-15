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
    '@nuxtjs/color-mode'
  ],

  css: [
    '@unocss/reset/tailwind-compat.css'
  ],

  colorMode: {
    classSuffix: '',
    preference: 'light'
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
