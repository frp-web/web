<template>
  <aside border="r-1 solid" w-64 border-base bg-container>
    <ClientOnly>
      <NavMenu h-full color-base>
        <NavMenuItem to="/">
          {{ $t('nav.dashboard') }}
        </NavMenuItem>
        <NavMenuItem v-if="frpMode === 'server'" to="/node">
          {{ $t('nav.node') }}
        </NavMenuItem>
        <NavMenuItem v-if="frpMode === 'server'" to="/proxy">
          {{ $t('nav.proxy') }}
        </NavMenuItem>
        <NavMenuItem v-else to="/tunnel">
          {{ $t('nav.tunnel') }}
        </NavMenuItem>
        <NavMenuItem to="/config">
          {{ $t('nav.config') }}
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
