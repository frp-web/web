<template>
  <AntConfigProvider :theme="theme">
    <div v-show="!authStore.isInitialized" absolute inset-0 z-50 fcc bg-base>
      <div i-line-md-loading-loop size-8 color-primary />
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </AntConfigProvider>
</template>

<script lang="ts" setup>
import type { ConfigProviderProps } from 'ant-design-vue'
import { getAntdTheme } from '~/constants/theme'
import { ColorMode } from '~/utils/color-mode'

const colorMode = useColorMode()

const theme = computed<ConfigProviderProps['theme']>(() => {
  // colorMode.value 是解析后的真实主题（light/dark）
  // colorMode.preference 是用户选择的偏好（system/light/dark）
  const isDark = colorMode.value === ColorMode.Dark
  return getAntdTheme(isDark) as ConfigProviderProps['theme']
})

const authStore = useAuthStore()

if (import.meta.client) {
  onBeforeMount(async () => {
    await authStore.checkAuth()

    // 读取并设置主题
    try {
      const appConfig = await $fetch('/api/config/app')
      if (appConfig.theme) {
        colorMode.preference = appConfig.theme
      }
    }
    catch (error) {
      console.error('Failed to load app config:', error)
    }

    authStore.isInitialized = true
  })
}
</script>
