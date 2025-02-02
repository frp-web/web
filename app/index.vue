<style lang="scss">
html,
body,
#__nuxt,
#nuxt-app {
  --uno: size-screen;
}
</style>

<template>
  <div id="nuxt-app">
    <AConfigProvider :theme>
      <NuxtLayout>
        <template #header>
          <LayoutsHeader />
        </template>
      </NuxtLayout>
    </AConfigProvider>
  </div>
</template>

<script lang="ts" setup>
import type { ConfigProviderProps } from 'ant-design-vue'
import { ColorMode } from '~/enums/color-mode'

const colorMode = useColorMode()

colorMode.value = ColorMode.Light

const theme: ConfigProviderProps['theme'] = {
  token: {
    colorPrimary: '#6040ec'
  }
}

useHead({
  title: 'FRP Web',
  link: [
    {
      rel: 'icon',
      type: 'image/vnd.microsoft.icon',
      href: '/favicon.ico'
    }
  ]
})
</script>
