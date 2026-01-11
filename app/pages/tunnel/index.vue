<template>
  <section flex="~ col" gap-6>
    <!-- 页面标题和描述 -->
    <header flex="~ wrap" items-center justify-between gap-4>
      <div>
        <h2 text-xl font-semibold>
          {{ configStore.frpMode === 'server' ? t('tunnel.serverTitle') : t('tunnel.title') }}
        </h2>
        <p text-secondary mt-1 text-sm>
          {{ configStore.frpMode === 'server' ? t('tunnel.serverDesc') : t('tunnel.desc') }}
        </p>
      </div>

      <!-- frps 模式下的刷新按钮 -->
      <AntButton v-if="configStore.frpMode === 'server'" :loading="refreshing" @click="handleRefresh">
        <template #icon>
          <span i-carbon-refresh />
        </template>
        {{ t('common.refresh') }}
      </AntButton>
    </header>

    <!-- 隧道管理组件 -->
    <TunnelManager :mode="configStore.frpMode" :refresh-trigger="refreshTrigger" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '~/stores/config'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const configStore = useConfigStore()

// 刷新相关状态
const refreshing = ref(false)
const refreshTrigger = ref(0)

// 刷新 frps 代理列表
async function handleRefresh() {
  refreshing.value = true
  refreshTrigger.value++
  // 等待组件完成刷新
  await new Promise(resolve => setTimeout(resolve, 500))
  refreshing.value = false
}
</script>
