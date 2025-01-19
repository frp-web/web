<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <div flex="~ col">
      <Header />
      <div flex>
        <Sider />
        <main>
          <NuxtPage />
        </main>
      </div>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import Header from '~/app/layout/Header.vue'
import Sider from '~/app/layout/Sider.vue'

useHead({
  title: 'FRP Web'
})
</script>
