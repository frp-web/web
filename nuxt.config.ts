// https://nuxt.com/docs/api/configuration/nuxt-config
// eslint-disable-next-line no-undef
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt'
  ],

  compatibilityDate: '2024-11-01'
})
