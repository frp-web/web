<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-center justify-between gap-4>
      <div>
        <h2 text-xl font-semibold>
          {{ t('tunnel.serverTitle') }}
        </h2>
        <p text-secondary mt-1 text-sm>
          {{ t('tunnel.serverDesc') }}
        </p>
      </div>

      <AntButton :loading="refreshing" @click="handleRefresh">
        <template #icon>
          <span i-carbon-refresh />
        </template>
        {{ t('common.refresh') }}
      </AntButton>
    </header>

    <!-- 类型切换 Tabs -->
    <AntTabs v-model:active-key="activeType" @change="handleTypeChange">
      <AntTabPane key="tcp" tab="TCP" />
      <AntTabPane key="udp" tab="UDP" />
      <AntTabPane key="http" tab="HTTP" />
      <AntTabPane key="https" tab="HTTPS" />
      <AntTabPane key="stcp" tab="STCP" />
      <AntTabPane key="xtcp" tab="XTCP" />
    </AntTabs>

    <!-- 代理列表 -->
    <ProxyTable :type="activeType" :refresh-trigger="refreshTrigger" />
  </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const activeType = ref('tcp')
const refreshing = ref(false)
const refreshTrigger = ref(0)

async function handleTypeChange() {
  // 类型切换时自动触发刷新
  refreshTrigger.value++
}

async function handleRefresh() {
  refreshing.value = true
  try {
    refreshTrigger.value++
  }
  finally {
    setTimeout(() => {
      refreshing.value = false
    }, 500)
  }
}
</script>
