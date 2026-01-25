<template>
  <div flex="~ col gap-4">
    <section rounded-lg bg-container divide-y>
      <div flex="~ col gap-3" p="4">
        <div flex="~ col gap-3" md="flex-row items-center justify-between" group="settings">
          <div>
            <p text-base font-medium>
              {{ $t('frp.version') }}
            </p>
            <p text-sm color-secondary>
              <template v-if="store.frpPackage.version">
                {{ $t('frp.currentVersion', { version: store.frpPackage.version, time: updatedTimeLabel }) }}
              </template>
              <template v-else>
                {{ $t('frp.notDownloaded') }}
              </template>
            </p>
          </div>
          <div flex="~ gap-2">
            <AntButton @click="openGithubTokenModal">
              <template #icon>
                <span i-carbon-settings />
              </template>
            </AntButton>
            <AntButton type="primary" :loading="buttonLoading" @click="handleFrpPackage">
              {{ actionLabel }}
            </AntButton>
          </div>
        </div>

        <!-- 下载进度条 -->
        <div flex="~ col gap-2">
          <AntProgress
            v-if="frpStore.downloadProgress?.stage === 'downloading'"
            :percent="frpStore.downloadProgress.progress ?? 0"
            stroke-color="#52c41a"
          />
          <AntProgress
            v-else-if="frpStore.downloadProgress?.stage === 'extracting'"
            :percent="100"
            status="active"
          />
        </div>
      </div>
    </section>

    <section rounded-lg bg-container divide-y>
      <div flex="~ col gap-3" md="flex-row items-center justify-between" p="4">
        <div>
          <p text-base font-medium>
            {{ $t('frp.switchMode') }}
          </p>
          <p text-sm color-secondary>
            <template v-if="store.frpMode === 'client'">
              {{ $t('frp.currentModeClient') }}
            </template>
            <template v-else>
              {{ $t('frp.currentModeServer') }}
            </template>
            <template v-if="frpStore.isRunning">
              <br>
              <span text-warning font-medium>⚠ {{ $t('frp.serviceRunning') }}</span>
            </template>
          </p>
        </div>
        <AntButton :loading="modeSaving" @click="openModeModal">
          {{ $t('frp.switchMode') }}
        </AntButton>
      </div>
    </section>

    <AntModal v-model:open="modeModalOpen" :title="$t('frp.switchMode')" :confirm-loading="modeSaving" @ok="handleConfirmMode">
      <div flex="~ col" gap="3">
        <p text-sm color-secondary>
          {{ $t('frp.selectMode') }}
        </p>
        <AntSelect v-model:value="selectedMode" :options="modeOptions" />
        <p text-xs color-secondary>
          - {{ $t('frp.clientModeDesc') }}
          <br>
          - {{ $t('frp.serverModeDesc') }}
        </p>

        <!-- 运行状态警告 -->
        <AntAlert
          v-if="frpStore.isRunning"
          type="warning"
          show-icon
          :message="$t('frp.serviceRunning')"
        >
          <template #description>
            {{ $t('frp.switchingModeWillStop') }}
          </template>
        </AntAlert>

        <!-- 模式变化提示 -->
        <AntAlert
          v-else-if="selectedMode !== store.frpMode"
          type="info"
          show-icon
          :message="$t('frp.switchToMode', { mode: selectedMode === 'client' ? $t('auth.clientMode') : $t('auth.serverMode') })"
        >
          <template #description>
            {{ $t('frp.restartRequired') }}
          </template>
        </AntAlert>
      </div>
    </AntModal>

    <!-- GitHub Token 配置弹窗 -->
    <AntModal v-model:open="githubTokenModalOpen" :title="$t('frp.githubTokenConfig')" :confirm-loading="githubTokenSaving" @ok="handleSaveGithubToken">
      <div flex="~ col" gap="3">
        <p text-sm color-secondary>
          {{ $t('frp.githubTokenDesc') }}
        </p>
        <AntInput
          v-model:value="githubTokenInput"
          type="password"
          :placeholder="$t('frp.tokenPlaceholder')"
          :maxlength="100"
          show-count
        />
        <p text-xs color-secondary>
          <span color-base font-medium>{{ $t('frp.tokenHelp') }}</span>
          <br>
          1. {{ $t('frp.tokenHelpStep1') }}
          <br>
          2. {{ $t('frp.tokenHelpStep2') }}
          <br>
          3. {{ $t('frp.tokenHelpStep3') }}
          <br>
          4. {{ $t('frp.tokenHelpStep4') }}
        </p>
        <AntAlert
          v-if="store.githubTokenConfigured"
          type="success"
          show-icon
          :message="$t('frp.tokenConfigured')"
        >
          <template #description>
            {{ $t('frp.tokenConfiguredDesc') }}
          </template>
        </AntAlert>
        <AntAlert
          v-else
          type="warning"
          show-icon
          :message="$t('frp.tokenNotConfigured')"
        >
          <template #description>
            {{ $t('frp.tokenNotConfiguredDesc') }}
          </template>
        </AntAlert>
      </div>
    </AntModal>
  </div>
</template>

<script setup lang="ts">
import type { FrpMode } from '~/stores/config'
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '~/stores/config'
import { useFrpStore } from '~/stores/frp'

const { t: $t } = useI18n()
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
  return store.frpPackage.installed ? $t('frp.checkUpdate') : $t('frp.downloadLatest')
})

const modeOptions = [
  { label: $t('auth.clientMode'), value: 'client' satisfies FrpMode },
  { label: $t('auth.serverMode'), value: 'server' satisfies FrpMode }
]

const modeModalOpen = ref(false)
const modeSaving = ref(false)
const selectedMode = ref<FrpMode>()

const githubTokenModalOpen = ref(false)
const githubTokenSaving = ref(false)
const githubTokenInput = ref('')

const buttonLoading = computed(() => store.frpPackage.status === 'updating')

async function handleFrpPackage() {
  await store.refreshFrpPackage()
}

function clearProgress() {
  frpStore.downloadProgress = null
}

// 监听完成状态，3秒后自动清除提示
watch(() => frpStore.downloadProgress?.stage, (stage) => {
  if (stage === 'complete' || stage === 'up-to-date') {
    setTimeout(() => {
      clearProgress()
    }, 3000)
  }
})

function openGithubTokenModal() {
  githubTokenInput.value = ''
  githubTokenModalOpen.value = true
}

async function handleSaveGithubToken() {
  try {
    githubTokenSaving.value = true
    await store.saveGithubToken(githubTokenInput.value.trim())
    githubTokenModalOpen.value = false
  }
  finally {
    githubTokenSaving.value = false
  }
}

function openModeModal() {
  selectedMode.value = store.frpMode ?? undefined
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
