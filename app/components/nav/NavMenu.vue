<template>
  <AntMenu
    v-model:selected-keys="selectedKeys"
    mode="inline"
    @click="handleClick"
  >
    <slot />
  </AntMenu>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'

const route = useRoute()
const router = useRouter()

const selectedKeys = ref<string[]>([route.path])

// 监听路由变化,自动更新选中状态
watch(() => route.path, (path) => {
  selectedKeys.value = [path]
})

// 处理菜单点击,自动跳转
function handleClick(info: MenuInfo) {
  const key = String(info.key)
  if (key && key !== route.path) {
    router.push(key)
  }
}
</script>
