<template>
  <div>
    <AntRow :gutter="[16, 16]">
      <AntCol :span="24">
        <AntCard :title="$t('dashboard.title')" :loading="frpStore.loading">
          <div flex="~ wrap items-center justify-between gap-4">
            <div flex="~ col gap-2">
              <div fyc gap-2>
                <span
                  :class="frpStore.frpStatusIndicatorClass"
                  inline-block
                  h-2
                  w-2
                  rounded-full
                  transition-colors
                />
                <span>{{ frpStore.frpStatusText }}</span>
              </div>
              <div v-if="frpStore.isRunning" text="sm [var(--ant-color-text-tertiary)]">
                {{ $t('dashboard.uptime') }}: {{ frpStore.uptimeText }}
              </div>
              <div v-if="frpStore.processInfo?.pid" text="sm [var(--ant-color-text-tertiary)]">
                PID: {{ frpStore.processInfo.pid }}
              </div>
            </div>
            <div flex="~ gap-2">
              <AntButton
                v-if="!frpStore.isRunning"
                type="primary"
                :loading="starting"
                @click="startFrp"
              >
                {{ $t('dashboard.start') }}
              </AntButton>
              <AntButton
                v-else
                danger
                :loading="stopping"
                @click="showStopConfirm"
              >
                {{ $t('dashboard.stop') }}
              </AntButton>
              <AntButton
                type="default"
                :loading="restarting"
                @click="showRestartConfirm"
              >
                {{ $t('dashboard.restart') }}
              </AntButton>
            </div>
          </div>
        </AntCard>
      </AntCol>
    </AntRow>

    <!-- 停止确认对话框 -->
    <AntModal
      v-model:open="stopConfirmVisible"
      :title="$t('dashboard.stopConfirm')"
      :confirm-loading="stopping"
      @ok="stopFrp"
      @cancel="stopConfirmVisible = false"
    >
      <p>{{ $t('dashboard.stopConfirmMessage') }}</p>
    </AntModal>

    <!-- 重启确认对话框 -->
    <AntModal
      v-model:open="restartConfirmVisible"
      :title="$t('dashboard.restartConfirm')"
      :confirm-loading="restarting"
      @ok="restartFrp"
      @cancel="restartConfirmVisible = false"
    >
      <p>{{ $t('dashboard.restartConfirmMessage') }}</p>
    </AntModal>
  </div>
</template>

<script setup lang="ts">
const frpStore = useFrpStore()
const starting = ref(false)
const stopping = ref(false)
const restarting = ref(false)

// 确认对话框状态
const stopConfirmVisible = ref(false)
const restartConfirmVisible = ref(false)

// 显示停止确认对话框
function showStopConfirm() {
  stopConfirmVisible.value = true
}

// 显示重启确认对话框
function showRestartConfirm() {
  restartConfirmVisible.value = true
}

// 启动 FRP 服务
async function startFrp() {
  starting.value = true
  try {
    await frpStore.startFrp()
  }
  catch (error) {
    console.error('启动 FRP 失败:', error)
  }
  finally {
    starting.value = false
  }
}

// 停止 FRP 服务
async function stopFrp() {
  stopping.value = true
  try {
    await frpStore.stopFrp()
    stopConfirmVisible.value = false
  }
  catch (error) {
    console.error('停止 FRP 失败:', error)
  }
  finally {
    stopping.value = false
  }
}

// 重启 FRP 服务
async function restartFrp() {
  restarting.value = true
  try {
    await frpStore.restartFrp()
    restartConfirmVisible.value = false
  }
  catch (error) {
    console.error('重启 FRP 失败:', error)
  }
  finally {
    restarting.value = false
  }
}
</script>
