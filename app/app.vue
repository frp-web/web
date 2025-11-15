<template>
  <AntConfigProvider :theme="theme">
    <NuxtLayout>
      <template #header>
        <LayoutsHeader />
      </template>
    </NuxtLayout>
  </AntConfigProvider>
</template>

<script lang="ts" setup>
import type { ConfigProviderProps } from 'ant-design-vue'
import { ColorMode } from '~/utils/color-mode'

const colorMode = useColorMode()
colorMode.preference = ColorMode.Light

const theme: ConfigProviderProps['theme'] = {
  token: {
    colorPrimary: '#6040ec'
  }
}
</script>
