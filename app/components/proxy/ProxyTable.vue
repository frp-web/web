<template>
  <div>
    <AntTable
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="pagination"
      row-key="name"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <span font-medium>{{ record.name }}</span>
        </template>

        <template v-else-if="column.key === 'status'">
          <AntTag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </AntTag>
        </template>

        <template v-else-if="column.key === 'trafficIn'">
          {{ formatTraffic(record.trafficIn) }}
        </template>

        <template v-else-if="column.key === 'trafficOut'">
          {{ formatTraffic(record.trafficOut) }}
        </template>

        <template v-else-if="column.key === 'localIP'">
          <span text-xs>
            {{ record.localIP }}:{{ record.localPort }}
          </span>
        </template>
      </template>
    </AntTable>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface ProxyItem {
  name: string
  type: string
  remotePort: number
  localPort: number
  localIP: string
  conns: number
  trafficIn: number
  trafficOut: number
  status: string
  clientVersion: string
  lastStartTime: string
  lastCloseTime: string
}

interface Props {
  type: string
  refreshTrigger?: number
}

const props = defineProps<Props>()

const { t } = useI18n()

const loading = ref(false)
const dataSource = ref<ProxyItem[]>([])

const pagination = computed(() => ({
  pageSize: 20,
  showSizeChanger: true,
  showTotal: (total: number) => t('tunnel.totalProxies', { count: total })
}))

const columns = computed(() => [
  {
    title: t('tunnel.tunnelName'),
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: t('tunnel.type'),
    dataIndex: 'type',
    key: 'type',
    width: 100
  },
  {
    title: t('tunnel.remotePort'),
    dataIndex: 'remotePort',
    key: 'remotePort',
    width: 100
  },
  {
    title: t('tunnel.localIP'),
    key: 'localIP',
    width: 180
  },
  {
    title: t('common.status'),
    key: 'status',
    width: 100,
    align: 'center' as const
  },
  {
    title: t('tunnel.connections'),
    dataIndex: 'conns',
    key: 'conns',
    width: 100,
    align: 'center' as const
  },
  {
    title: t('tunnel.trafficIn'),
    key: 'trafficIn',
    width: 120
  },
  {
    title: t('tunnel.trafficOut'),
    key: 'trafficOut',
    width: 120
  }
])

async function fetchProxies() {
  loading.value = true
  try {
    const response = await $fetch<{
      success: boolean
      data: ProxyItem[]
      error?: string
    }>(`/api/proxy/${props.type}`)

    if (response?.success) {
      dataSource.value = response.data || []
    }
    else {
      dataSource.value = []
    }
  }
  catch (error) {
    console.error('Failed to fetch proxies:', error)
    dataSource.value = []
  }
  finally {
    loading.value = false
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'default'
    default:
      return 'warning'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'online':
      return t('tunnel.status.online')
    case 'offline':
      return t('tunnel.status.offline')
    default:
      return status
  }
}

function formatTraffic(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 监听类型变化和刷新触发器
watch(() => [props.type, props.refreshTrigger], () => {
  fetchProxies()
}, { immediate: true })
</script>
