<template>
  <AntMenuItem :key="to">
    <slot />
  </AntMenuItem>
</template>

<script lang="ts" setup>
defineProps<{
  to: string
}>()
</script>
