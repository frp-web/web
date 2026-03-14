// Nuxt 5 + @nuxtjs/i18n 类型兼容
declare module '#imports' {
  export const $t: (key: string, ...args: any[]) => string
}

declare module '#app' {
  interface NuxtApp {
    $t: (key: string, ...args: any[]) => string
  }
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $t: (key: string, ...args: any[]) => string
  }
}

declare module 'vue' {
  export interface ComponentCustomProperties {
    $t: (key: string, ...args: any[]) => string
  }
}

export {}
