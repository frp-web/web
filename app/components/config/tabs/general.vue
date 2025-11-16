<template>
  <div flex="~ col gap-4">
    <section rounded-lg bg-container divide-y>
      <div flex="~ col gap-3 md:row" p="4" md="items-center justify-between">
        <div>
          <p text="base" font="medium">
            FRP 版本
          </p>
          <p text-sm color-secondary>
            <template v-if="store.frpPackage.version">
              当前版本：{{ store.frpPackage.version }}
              <span v-if="store.frpPackage.updatedAt">
                ，更新于 {{ updatedTimeLabel }}
              </span>
            </template>
            <template v-else>
              尚未下载 FRP，点击右侧按钮获取最新版本
            </template>
          </p>
        </div>
        <AntButton type="primary" :loading="store.frpPackageLoading" @click="handleFrpPackage">
          {{ actionLabel }}
        </AntButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '~/stores/config'

const store = useConfigStore()

const formatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

const updatedTimeLabel = computed(() => {
  if (!store.frpPackage.updatedAt) {
    return ''
  }
  return formatter.format(new Date(store.frpPackage.updatedAt))
})

const actionLabel = computed(() => {
  if (store.frpPackageLoading) {
    return store.frpPackage.installed ? '正在检查更新' : '正在下载'
  }
  return store.frpPackage.installed ? '检查更新' : '下载最新版本'
})

async function handleFrpPackage() {
  await store.refreshFrpPackage()
}
</script>
