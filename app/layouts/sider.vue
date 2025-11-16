<template>
  <aside border="r-1 solid" w-64 border-base bg-container>
    <ClientOnly>
      <AntMenu v-model:selected-keys="current" :items="items" mode="inline" h-full color-base @click="handleClick" />
    </ClientOnly>
  </aside>
</template>

<script lang="ts" setup>
import type { MenuProps } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()

const current = ref<string[]>([resolveKey(route.path)])

watch(
  () => route.path,
  (path) => {
    current.value = [resolveKey(path)]
  },
  { immediate: true }
)

const items: MenuProps['items'] = [
  {
    key: 'dashboard',
    label: '仪表盘'
  },
  {
    key: 'config',
    label: '配置'
  }
]

const handleClick: MenuProps['onClick'] = ({ key }) => {
  if (key === 'dashboard') {
    router.push('/')
    return
  }
  if (key === 'config') {
    router.push('/config')
  }
}

function resolveKey(path: string) {
  if (path.startsWith('/config')) {
    return 'config'
  }
  return 'dashboard'
}
</script>
