<style lang="scss">
html,
body,
#__nuxt,
#nuxt-app {
  --uno: size-screen;
}
</style>

<template>
  <div id="nuxt-app" of-x-hidden of-y-auto flex="~ col" dark="bg-dark">
    <NuxtRouteAnnouncer />
    <LayoutHeader shrink-0>
      <template #header>
        <slot name="header" />
      </template>
    </LayoutHeader>
    <div flex-1 flex="~ row" of-x-hidden>
      <LayoutSider />
      <LayoutMain />
    </div>
    <LayoutFooter />
  </div>
</template>

<script lang="ts" setup>
import LayoutFooter from './footer.vue'
import LayoutHeader from './header.vue'
import LayoutMain from './main.vue'
import LayoutSider from './sider.vue'
</script>
