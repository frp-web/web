<template>
  <div flex="~ col" gap-4>
    <div flex="~" items-center justify-between>
      <div>
        <h2 text-lg font-semibold>
          FRP 配置
        </h2>
        <p text-sm text-gray-500>
          系统级配置，在启动 frp 前会与用户配置合并
        </p>
      </div>
      <AntButton type="primary" :loading="saving" @click="handleSave">
        保存配置
      </AntButton>
    </div>

    <!-- 根据当前模式显示对应的配置 -->
    <FrpsConfigForm v-if="isServerMode" v-model="form as any" />
    <FrpcConfigForm v-else v-model="form as any" />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import FrpcConfigForm from './preset/FrpcConfigForm.vue'
import FrpsConfigForm from './preset/FrpsConfigForm.vue'

interface FrpsConfig {
  bindPort?: number
  vhostHTTPPort?: number
  vhostHTTPSPort?: number
  domain?: string
  subdomainHost?: string
  dashboardPort?: number
  dashboardUser?: string
  dashboardPassword?: string
  authToken?: string
}

interface FrpcConfig {
  serverAddr?: string
  serverPort?: number
  authToken?: string
  user?: string
  heartbeatInterval?: number
}

const saving = ref(false)

// 从 store 获取当前模式
const configStore = useConfigStore()
const isServerMode = computed(() => configStore.frpMode === 'server')

// 默认配置
const defaultFrpsConfig: FrpsConfig = {
  bindPort: 7000,
  vhostHTTPPort: 7000,
  dashboardPort: 7500,
  dashboardUser: 'admin'
}

const defaultFrpcConfig: FrpcConfig = {
  serverPort: 7000
}

// 使用 ref 存储表单数据
const form = ref<FrpsConfig | FrpcConfig>(
  isServerMode.value ? { ...defaultFrpsConfig } : { ...defaultFrpcConfig }
)

onMounted(async () => {
  await loadPresetConfig()
})

async function loadPresetConfig() {
  try {
    const mode = isServerMode.value ? 'frps' : 'frpc'
    const data = await $fetch<{ config: any }>(`/api/config/preset`, {
      method: 'GET',
      query: { type: mode }
    })

    if (data?.config) {
      form.value = data.config
    }
  }
  catch { }
}

async function handleSave() {
  saving.value = true
  try {
    const mode = isServerMode.value ? 'frps' : 'frpc'

    await $fetch('/api/config/preset', {
      method: 'POST',
      body: {
        type: mode,
        config: form.value
      }
    })

    message.success('FRP 配置保存成功')
  }
  catch (error: any) {
    message.error(error.message || '保存失败')
    console.error(error)
  }
  finally {
    saving.value = false
  }
}
</script>
