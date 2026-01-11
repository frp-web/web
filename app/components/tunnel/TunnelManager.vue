<template>
  <section flex="~ col" gap-6>
    <!-- frpc 模式：显示标题和操作按钮 -->
    <header v-if="mode === 'client'" flex="~ wrap" items-start justify-between gap-4>
      <div>
        <h1 text-2xl color-base font-semibold>
          {{ title }}
        </h1>
        <p text-sm color-secondary>
          {{ subtitle }}
        </p>
      </div>
      <AntSpace>
        <AntButton @click="fetchTunnels">
          <template #icon>
            <span i-carbon-refresh />
          </template>
          {{ $t('common.refresh') }}
        </AntButton>
        <AntButton type="primary" @click="handleAdd">
          <template #icon>
            <span i-carbon-add />
          </template>
          {{ $t('tunnel.addTunnel') }}
        </AntButton>
      </AntSpace>
    </header>

    <!-- 隧道表格 -->
    <div rounded-lg bg-container p-4 shadow-sm>
      <AntTable
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        :row-key="(record: ProxyConfig) => record.name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <AntTag color="blue">
              {{ record.type }}
            </AntTag>
          </template>

          <!-- frps 模式：显示连接数 -->
          <template v-else-if="column.key === 'conns'">
            <AntTag :color="record.conns && record.conns > 0 ? 'green' : 'default'">
              {{ record.conns || 0 }}
            </AntTag>
          </template>

          <!-- frps 模式：显示流量 -->
          <template v-else-if="column.key === 'trafficIn'">
            <span text-sm>{{ formatBytes(record.trafficIn || 0) }}</span>
          </template>

          <template v-else-if="column.key === 'trafficOut'">
            <span text-sm>{{ formatBytes(record.trafficOut || 0) }}</span>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'actions'">
            <AntSpace>
              <AntButton size="small" @click="handleEdit(record)">
                {{ $t('tunnel.editTunnel') }}
              </AntButton>
              <AntButton size="small" danger @click="handleDelete(record)">
                {{ $t('tunnel.deleteTunnel') }}
              </AntButton>
            </AntSpace>
          </template>
        </template>
      </AntTable>
    </div>

    <!-- frpc 模式：表单抽屉 -->
    <TunnelFormDrawer
      v-if="mode === 'client'"
      v-model:open="drawerOpen"
      :mode="drawerMode"
      :initial-tunnel="selectedTunnel"
      @success="handleTunnelSuccess"
    />
  </section>
</template>

<script setup lang="ts">
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'

interface ProxyConfig {
  name: string
  type: string
  localPort?: number
  localIP?: string
  remotePort?: number
  customDomains?: string[]
  subdomain?: string
  conns?: number // frps 统计：当前连接数
  trafficIn?: number // frps 统计：入站流量（字节）
  trafficOut?: number // frps 统计：出站流量（字节）
  [key: string]: any
}

interface TunnelManagerProps {
  mode?: 'client' | 'server'
  refreshTrigger?: number
}

const props = withDefaults(defineProps<TunnelManagerProps>(), {
  mode: 'client',
  refreshTrigger: 0
})

const { t } = useI18n()

const loading = ref(false)
const dataSource = ref<ProxyConfig[]>([])
const drawerOpen = ref(false)
const drawerMode = ref<'add' | 'edit'>('add')
const selectedTunnel = ref<ProxyConfig>()

// 标题（仅 frpc 模式显示）
const title = computed(() => t('tunnel.title'))
const subtitle = computed(() => t('tunnel.description'))

// 表格列定义
const columns = computed(() => {
  const baseColumns = [
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
      width: 120
    }
  ]

  // frps 模式：添加统计列
  if (props.mode === 'server') {
    baseColumns.push(
      {
        title: t('tunnel.remotePort'),
        dataIndex: 'remotePort',
        key: 'remotePort',
        width: 100
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
        dataIndex: 'trafficIn',
        key: 'trafficIn',
        width: 120
      },
      {
        title: t('tunnel.trafficOut'),
        dataIndex: 'trafficOut',
        key: 'trafficOut',
        width: 120
      }
    )
  }
  // frpc 模式：显示本地端口
  else {
    baseColumns.push(
      {
        title: t('tunnel.localPort'),
        dataIndex: 'localPort',
        key: 'localPort',
        width: 100
      },
      {
        title: t('tunnel.remotePort'),
        dataIndex: 'remotePort',
        key: 'remotePort',
        width: 100
      }
    )
  }

  // frpc 模式：添加操作列
  if (props.mode === 'client') {
    baseColumns.push({
      title: t('common.actions'),
      key: 'actions',
      width: 200
    })
  }

  return baseColumns
})

// 格式化字节
function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 获取隧道/代理列表
async function fetchTunnels() {
  loading.value = true
  try {
    let apiUrl = ''

    if (props.mode === 'server') {
      // frps 模式：从 frps webServer API 获取
      apiUrl = '/api/proxy/list'
    }
    else {
      // frpc 模式：从本地配置获取
      apiUrl = '/api/config/tunnel'
    }

    const response = await $fetch<{ success: boolean, data: ProxyConfig[], error?: { code: string, message: string } }>(
      apiUrl
    )

    if (response.success) {
      dataSource.value = response.data || []
    }
    else {
      message.error(response.error?.message || t('tunnel.fetchFailed'))
    }
  }
  catch (error) {
    console.error('Failed to fetch tunnels:', error)
    message.error(t('tunnel.fetchFailed'))
  }
  finally {
    loading.value = false
  }
}

// frpc 模式：添加隧道
function handleAdd() {
  drawerMode.value = 'add'
  selectedTunnel.value = undefined
  drawerOpen.value = true
}

// frpc 模式：编辑隧道
function handleEdit(record: ProxyConfig) {
  drawerMode.value = 'edit'
  selectedTunnel.value = record
  drawerOpen.value = true
}

// frpc 模式：删除隧道
function handleDelete(record: ProxyConfig) {
  Modal.confirm({
    title: t('tunnel.deleteConfirm'),
    content: t('tunnel.deleteConfirmMessage', { name: record.name }),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        const response = await $fetch<{ success: boolean, error?: { code: string, message: string } }>(
          '/api/config/tunnel',
          {
            method: 'DELETE',
            body: { name: record.name }
          }
        )

        if (response.success) {
          message.success(t('tunnel.deleteSuccess'))
          await fetchTunnels()
        }
        else {
          message.error(response.error?.message || t('tunnel.deleteFailed'))
        }
      }
      catch (error) {
        console.error('Failed to delete tunnel:', error)
        message.error(t('tunnel.deleteFailed'))
      }
    }
  })
}

// frpc 模式：操作成功回调
function handleTunnelSuccess() {
  fetchTunnels()
}

// 监听刷新触发器
watch(() => props.refreshTrigger, () => {
  fetchTunnels()
})

onMounted(() => {
  fetchTunnels()
})
</script>
