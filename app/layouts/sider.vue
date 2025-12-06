<template>
  <aside border="r-1 solid" w-64 border-base bg-container>
    <ClientOnly>
      <NavMenu h-full color-base>
        <NavMenuItem to="/">
          仪表盘
        </NavMenuItem>
        <NavMenuItem v-if="frpMode === 'client'" to="/tunnel">
          隧道管理
        </NavMenuItem>
        <NavMenuItem v-if="frpMode === 'server'" to="/node">
          节点管理
        </NavMenuItem>
        <NavMenuItem to="/config">
          配置
        </NavMenuItem>
      </NavMenu>
    </ClientOnly>
  </aside>
</template>

<script lang="ts" setup>
import { useConfigStore } from '~/stores/config'

const configStore = useConfigStore()

const frpMode = computed(() => configStore.frpMode)
</script>
