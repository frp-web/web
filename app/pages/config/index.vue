<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-start justify-between gap-4>
      <div>
        <h1 text-2xl color-base font-semibold>
          {{ $t('config.title') }}
        </h1>
        <p text-sm color-secondary>
          {{ $t('config.description') }}
        </p>
      </div>
      <AntButton :loading="store.frpLoading" @click="handleReload">
        {{ $t('config.reload') }}
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
import { useConfigStore } from '~/stores/config'

import ConfigTabs from './-components/tabs/index.vue'

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
