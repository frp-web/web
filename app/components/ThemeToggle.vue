<template>
  <AntDropdown placement="bottomRight">
    <span cursor-pointer color-secondary transition hover:color-base>
      <span v-if="currentMode === 'system'" i-carbon-screen />
      <span v-else-if="currentMode === 'light'" i-carbon-sun />
      <span v-else i-carbon-moon />
    </span>
    <template #overlay>
      <AntMenu :selected-keys="[currentMode]" @click="handleClick">
        <AntMenuItem key="system">
          <span flex="~ items-center gap-2">
            <span i-carbon-screen />
            跟随系统
          </span>
        </AntMenuItem>
        <AntMenuItem key="light">
          <span flex="~ items-center gap-2">
            <span i-carbon-sun />
            浅色
          </span>
        </AntMenuItem>
        <AntMenuItem key="dark">
          <span flex="~ items-center gap-2">
            <span i-carbon-moon />
            深色
          </span>
        </AntMenuItem>
      </AntMenu>
    </template>
  </AntDropdown>
</template>

<script setup lang="ts">
import type { MenuProps } from 'ant-design-vue'
import type { ColorMode } from '~/utils/color-mode'

const colorMode = useColorMode()
const currentMode = computed(() => colorMode.preference)

const handleClick: MenuProps['onClick'] = ({ key }) => {
  colorMode.preference = key as ColorMode

  // 保存到服务端
  if (import.meta.client) {
    $fetch('/api/config/app', {
      method: 'PUT',
      body: {
        theme: key
      }
    }).catch((error) => {
      console.error('Failed to save theme preference:', error)
    })
  }
}
</script>
