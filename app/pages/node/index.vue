<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-start justify-between gap-4>
      <div>
        <h1 text-2xl color-base font-semibold>
          {{ $t('node.title') }}
        </h1>
        <p text-sm color-secondary>
          {{ $t('node.description') }}
        </p>
      </div>
      <AntSpace>
        <AntButton @click="fetchNodes">
          <template #icon>
            <span i-carbon-refresh />
          </template>
          {{ $t('common.refresh') }}
        </AntButton>
      </AntSpace>
    </header>

    <div rounded-lg bg-container p-4 shadow-sm>
      <AntTable
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="pagination"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <AntTag :color="getStatusColor(record.status)">
              {{ $t(`node.status.${record.status}`) }}
            </AntTag>
          </template>
          <template v-if="column.key === 'actions'">
            <AntSpace>
              <AntButton size="small" @click="handleDetail(record)">
                {{ $t('common.detail') }}
              </AntButton>
              <AntButton size="small" @click="handleTunnel(record)">
                {{ $t('node.manageTunnel') }}
              </AntButton>
            </AntSpace>
          </template>
        </template>
      </AntTable>
    </div>

    <NodeDetailDrawer
      v-model:open="detailDrawerOpen"
      :node-id="selectedNodeId"
    />
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()

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

interface NodeListResponse {
  items: NodeInfo[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

const loading = ref(false)
const dataSource = ref<NodeInfo[]>([])
const detailDrawerOpen = ref(false)
const selectedNodeId = ref<string>()
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (total: number) => t('node.totalNodes', { count: total }),
  onChange: (page: number, size: number) => {
    currentPage.value = page
    pageSize.value = size
    fetchNodes()
  }
}))

const columns = computed(() => [
  {
    title: t('node.hostname'),
    dataIndex: 'hostname',
    key: 'hostname'
  },
  {
    title: t('node.ip'),
    dataIndex: 'ip',
    key: 'ip'
  },
  {
    title: t('node.serverAddr'),
    dataIndex: 'serverAddr',
    key: 'serverAddr'
  },
  {
    title: t('node.platform'),
    dataIndex: 'platform',
    key: 'platform'
  },
  {
    title: t('common.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200
  }
])

async function fetchNodes() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean, data: NodeListResponse, error?: { code: string, message: string } }>(
      '/api/node/list',
      {
        params: {
          page: currentPage.value,
          pageSize: pageSize.value
        }
      }
    )

    if (response.success) {
      dataSource.value = response.data.items
      total.value = response.data.total
    }
    else {
      message.error(response.error?.message || t('node.fetchFailed'))
    }
  }
  catch (error) {
    console.error('Failed to fetch nodes:', error)
    message.error(t('node.fetchFailed'))
  }
  finally {
    loading.value = false
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

function handleDetail(record: NodeInfo) {
  selectedNodeId.value = record.id
  detailDrawerOpen.value = true
}

function handleTunnel(record: NodeInfo) {
  navigateTo(`/node/${record.id}/tunnel`)
}

onMounted(() => {
  fetchNodes()
})
</script>
