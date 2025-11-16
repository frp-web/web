<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-start justify-between gap-4>
      <div>
        <h1 text-2xl color-base font-semibold>
          配置中心
        </h1>
        <p text-sm color-secondary>
          统一管理 FRP 配置与界面参数
        </p>
      </div>
      <AntButton :loading="store.frpLoading" @click="handleReload">
        重新获取
      </AntButton>
    </header>

    <AntSpin :spinning="spinning">
      <div rounded-lg bg-container p-4 shadow-sm>
        <ConfigTabs />
      </div>
    </AntSpin>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ConfigTabs from '~/components/config/tabs/index.vue'
import { useConfigStore } from '~/stores/config'

definePageMeta({
  layout: 'default'
})

const store = useConfigStore()

await useAsyncData('config/bootstrap', async () => {
  try {
    await Promise.all([
      store.fetchFrpConfig(),
      store.fetchAppSettings()
    ])
    return null
  }
  catch {
    // individual actions already set their error state
    return null
  }
})

const spinning = computed(() => store.frpLoading)

async function handleReload() {
  await Promise.all([
    store.fetchFrpConfig(),
    store.fetchAppSettings()
  ])
}
</script>
