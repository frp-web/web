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
import { AppInitializer } from '~/utils/initializer'

const colorMode = useColorMode()

const theme = computed<ConfigProviderProps['theme']>(() => {
  // colorMode.value 是解析后的真实主题（light/dark）
  // colorMode.preference 是用户选择的偏好（system/light/dark）
  return getAntdTheme(colorMode.value === 'dark') as ConfigProviderProps['theme']
})

const authStore = useAuthStore()

// 应用初始化
onMounted(async () => {
  await AppInitializer.init()
})

// 应用清理
onBeforeUnmount(() => {
  AppInitializer.cleanup()
})
</script>
