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

    <section rounded-lg bg-container divide-y>
      <div flex="~ col gap-3 md:row" p="4" md="items-center justify-between">
        <div>
          <p text="base" font="medium">
            模式切换
          </p>
          <p text-sm color-secondary>
            <template v-if="store.frpMode === 'client'">
              当前模式：客户端 (frpc)
            </template>
            <template v-else>
              当前模式：服务端 (frps)
            </template>
            <template v-if="frpStore.isRunning">
              <br>
              <span text="warning" font="medium">⚠ FRP 服务正在运行中</span>
            </template>
          </p>
        </div>
        <AntButton :loading="modeSaving" @click="openModeModal">
          切换模式
        </AntButton>
      </div>
    </section>

    <AntModal v-model:open="modeModalOpen" title="切换 FRP 模式" :confirm-loading="modeSaving" @ok="handleConfirmMode">
      <div flex="~ col" gap="3">
        <p text-sm color-secondary>
          请选择运行模式：
        </p>
        <AntSelect v-model:value="selectedMode" :options="modeOptions" />
        <p text-xs color-secondary>
          - 客户端 (frpc)：直接管理当前实例的隧道
          <br>
          - 服务端 (frps)：管理接入节点并下发隧道配置
        </p>

        <!-- 运行状态警告 -->
        <AntAlert
          v-if="frpStore.isRunning"
          type="warning"
          show-icon
          message="FRP 服务正在运行"
        >
          <template #description>
            切换模式将自动停止当前运行的 FRP 服务
          </template>
        </AntAlert>

        <!-- 模式变化提示 -->
        <AntAlert
          v-else-if="selectedMode !== store.frpMode"
          type="info"
          show-icon
          :message="`切换到 ${selectedMode === 'client' ? '客户端' : '服务端'} 模式`"
        >
          <template #description>
            切换后需要重新启动 FRP 服务才能生效
          </template>
        </AntAlert>
      </div>
    </AntModal>
  </div>
</template>

<script setup lang="ts">
import type { FrpMode } from '~/stores/config'
import { computed, ref } from 'vue'
import { useConfigStore } from '~/stores/config'
import { useFrpStore } from '~/stores/frp'

const store = useConfigStore()
const frpStore = useFrpStore()

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

const modeOptions = [
  { label: '客户端 (frpc)', value: 'client' satisfies FrpMode },
  { label: '服务端 (frps)', value: 'server' satisfies FrpMode }
]

const modeModalOpen = ref(false)
const modeSaving = ref(false)
const selectedMode = ref<FrpMode | null>(null)

async function handleFrpPackage() {
  await store.refreshFrpPackage()
}

function openModeModal() {
  selectedMode.value = store.frpMode ?? null
  modeModalOpen.value = true
}

async function handleConfirmMode() {
  try {
    modeSaving.value = true
    if (selectedMode.value) {
      await store.updateFrpMode(selectedMode.value)
      // 模式切换后，刷新 FRP 配置以匹配最新模式
      await store.fetchFrpConfig()
      modeModalOpen.value = false
    }
  }
  finally {
    modeSaving.value = false
  }
}
</script>
