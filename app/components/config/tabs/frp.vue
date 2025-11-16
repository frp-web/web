<template>
  <div flex="~ col gap-4">
    <div fbc flex-wrap gap-3>
      <div>
        <p text-lg font-medium>
          FRP 配置编辑器
        </p>
        <p text-sm color-secondary>
          {{ updatedLabel }}
        </p>
      </div>
      <div flex="~ gap-2">
        <AntButton :loading="store.frpLoading" :disabled="!store.frpPackage.configExists" @click="handleRefresh">
          刷新配置
        </AntButton>
        <AntButton :disabled="!store.isFrpDirty || store.frpLoading || !store.frpPackage.configExists" @click="store.resetFrpDraft">
          重置
        </AntButton>
        <AntButton type="primary" :loading="store.frpSaving" :disabled="!store.isFrpDirty || !store.frpPackage.configExists" @click="handleSave">
          保存配置
        </AntButton>
      </div>
    </div>

    <AntAlert v-if="store.frpError" type="error" show-icon>
      <template #message>
        {{ store.frpError }}
      </template>
    </AntAlert>

    <AntAlert v-if="!store.frpPackage.configExists" type="warning" show-icon mb-4>
      <template #message>
        配置文件不存在，请先下载 FRP
      </template>
    </AntAlert>

    <ClientOnly fallback="正在加载编辑器...">
      <FrpEditor v-model="store.frpDraft" :read-only="store.frpSaving || !store.frpPackage.configExists" min-h-96 />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core'
import FrpEditor from '~/components/config/FrpEditor.vue'
import { useConfigStore } from '~/stores/config'

const store = useConfigStore()
const formatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

const updatedLabel = computed(() => {
  if (!store.frpUpdatedAt) {
    return '尚未保存'
  }
  return `最近保存时间：${formatter.format(new Date(store.frpUpdatedAt))}`
})

async function handleSave() {
  if (store.isFrpDirty && !store.frpSaving && store.frpPackage.configExists) {
    await store.saveFrpConfig()
  }
}

async function handleRefresh() {
  await store.fetchFrpConfig()
}

// 快捷键：Ctrl+S (Windows/Linux) 或 Command+S (macOS)
const { ctrl_s, meta_s } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && e.type === 'keydown')
      e.preventDefault()
  }
})

whenever(ctrl_s!, handleSave)
whenever(meta_s!, handleSave)
</script>
