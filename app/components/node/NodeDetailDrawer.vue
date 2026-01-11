<template>
  <AntDrawer
    :open="open"
    :title="node?.hostname || node?.ip || t('node.detail')"
    width="600"
    @update:open="handleClose"
  >
    <AntSpin :spinning="loading">
      <AntDescriptions v-if="node" bordered :column="1">
        <AntDescriptionsItem :label="t('node.hostname')">
          {{ node.hostname || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.ip')">
          {{ node.ip }}:{{ node.port }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.serverAddr')">
          {{ node.serverAddr }}:{{ node.serverPort }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('common.status')">
          <AntTag :color="getStatusColor(node.status)">
            {{ t(`node.status.${node.status}`) }}
          </AntTag>
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.platform')">
          {{ node.platform || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.osType')">
          {{ node.osType || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.osRelease')">
          {{ node.osRelease || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.cpuCores')">
          {{ node.cpuCores || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.memTotal')">
          {{ node.memTotal ? formatBytes(node.memTotal) : '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.frpVersion')">
          {{ node.frpVersion || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.bridgeVersion')">
          {{ node.bridgeVersion || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.connectedAt')">
          {{ node.connectedAt ? formatTime(node.connectedAt) : '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.lastHeartbeat')">
          {{ node.lastHeartbeat ? formatTime(node.lastHeartbeat) : '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="t('node.createdAt')">
          {{ node.createdAt ? formatTime(node.createdAt) : '-' }}
        </AntDescriptionsItem>
      </AntDescriptions>

      <AntEmpty v-else :description="t('node.notFound')" />
    </AntSpin>

    <template #footer>
      <AntSpace>
        <AntButton @click="handleClose">
          {{ t('common.close') }}
        </AntButton>
        <AntButton
          v-if="node"
          type="primary"
          @click="handleManageTunnel"
        >
          {{ t('node.manageTunnel') }}
        </AntButton>
      </AntSpace>
    </template>
  </AntDrawer>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'

interface Props {
  open: boolean
  nodeId?: string
}

interface NodeInfo {
  id: string
  hostname?: string
  ip: string
  port: number
  status: 'online' | 'offline' | 'connecting' | 'error'
  serverAddr: string
  serverPort: number
  osType?: string
  osRelease?: string
  platform?: string
  cpuCores?: number
  memTotal?: number
  frpVersion?: string
  bridgeVersion?: string
  connectedAt?: number
  lastHeartbeat?: number
  createdAt?: number
  updatedAt?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const router = useRouter()

const loading = ref(false)
const node = ref<NodeInfo | null>(null)

async function fetchNodeDetail() {
  if (!props.nodeId) {
    return
  }

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean, data: NodeInfo, error?: { code: string, message: string } }>(
      `/api/node/${props.nodeId}`
    )

    if (response.success) {
      node.value = response.data
    }
    else {
      message.error(response.error?.message || t('node.fetchDetailFailed'))
    }
  }
  catch (error) {
    console.error('Failed to fetch node detail:', error)
    message.error(t('node.fetchDetailFailed'))
  }
  finally {
    loading.value = false
  }
}

function handleClose() {
  emit('update:open', false)
  node.value = null
}

function handleManageTunnel() {
  if (props.nodeId) {
    router.push(`/node/${props.nodeId}/tunnel`)
    handleClose()
  }
}

function getStatusColor(status: NodeInfo['status']) {
  const colors = {
    online: 'success',
    offline: 'default',
    connecting: 'processing',
    error: 'error'
  }
  return colors[status] || 'default'
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.nodeId) {
    fetchNodeDetail()
  }
})

watch(() => props.nodeId, (newId) => {
  if (props.open && newId) {
    fetchNodeDetail()
  }
})
</script>
