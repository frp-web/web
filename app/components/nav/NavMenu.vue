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

// 根据当前路由路径匹配菜单项
function getSelectedKey(path: string): string {
  // 定义路由前缀映射
  const routeMap: Record<string, string> = {
    '/node': '/node',
    '/proxy': '/proxy',
    '/tunnel': '/tunnel',
    '/config': '/config'
  }

  // 检查是否匹配任何前缀
  for (const [prefix, menuKey] of Object.entries(routeMap)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return menuKey
    }
  }

  // 默认返回根路径或当前路径
  return path === '/' ? '/' : path
}

const selectedKeys = ref<string[]>([getSelectedKey(route.path)])

// 监听路由变化,自动更新选中状态
watch(() => route.path, (path) => {
  selectedKeys.value = [getSelectedKey(path)]
})

// 处理菜单点击,自动跳转
function handleClick(info: MenuInfo) {
  const key = String(info.key)
  if (key && key !== route.path) {
    router.push(key)
  }
}
</script>
