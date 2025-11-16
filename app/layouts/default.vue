<style lang="scss">
html,
body,
#__nuxt {
  --uno: size-screen;
}
</style>

<template>
  <ClientOnly>
    <div size-screen flex="~ col" bg-base>
      <LayoutsHeader />
      <div min-h-0 w-full flex flex-1 flex-row>
        <LayoutSider />
        <LayoutMain>
          <slot />
        </LayoutMain>
      </div>
      <LayoutFooter />
    </div>
  </ClientOnly>
</template>

<script lang="ts" setup>
import LayoutFooter from './footer.vue'
import LayoutMain from './main.vue'
import LayoutSider from './sider.vue'
</script>
