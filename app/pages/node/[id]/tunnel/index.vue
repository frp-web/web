<template>
  <TunnelManager :node-id="nodeId" />
</template>

<script setup lang="ts">
const route = useRoute()
const nodeId = computed(() => route.params.id as string)

definePageMeta({
  layout: 'default'
})
</script>
