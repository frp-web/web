<template>
  <AMenu v-model:selected-keys="current" :items="items" w-64 />
</template>

<script lang="ts" setup>
import type { MenuProps } from 'ant-design-vue'

const current = ref<string[]>(['dashboard'])

const items: MenuProps['items'] = [
  {
    key: 'dashboard',
    label: '仪表盘'
  }
]
</script>
