<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-start justify-between gap-4>
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

    <div rounded-lg bg-container p-4 shadow-sm>
      <AntTable
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        :row-key="(record: TunnelConfig) => record.name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <AntTag color="blue">
              {{ record.type }}
            </AntTag>
          </template>
          <template v-if="column.key === 'actions'">
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

    <TunnelFormDrawer
      v-model:open="drawerOpen"
      :mode="drawerMode"
      :initial-tunnel="selectedTunnel"
      :node-id="nodeId"
      @success="handleTunnelSuccess"
    />
  </section>
</template>

<script setup lang="ts">
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'

interface TunnelConfig {
  name: string
  type: string
  localPort?: number
  localIP?: string
  remotePort?: number
  customDomains?: string[]
  subdomain?: string
  [key: string]: any
}

interface TunnelManagerProps {
  nodeId?: string
}

const props = defineProps<TunnelManagerProps>()
const { t } = useI18n()

const loading = ref(false)
const dataSource = ref<TunnelConfig[]>([])
const drawerOpen = ref(false)
const drawerMode = ref<'add' | 'edit'>('add')
const selectedTunnel = ref<TunnelConfig>()

const title = computed(() => {
  if (props.nodeId) {
    return t('node.tunnelManagement', { nodeId: props.nodeId })
  }
  return t('tunnel.title')
})

const subtitle = computed(() => {
  if (props.nodeId) {
    return t('node.tunnelManagementDescription', { nodeId: props.nodeId })
  }
  return t('tunnel.description')
})

const columns = computed(() => [
  {
    title: t('tunnel.tunnelName'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('tunnel.type'),
    dataIndex: 'type',
    key: 'type'
  },
  {
    title: t('tunnel.localPort'),
    dataIndex: 'localPort',
    key: 'localPort'
  },
  {
    title: t('tunnel.remotePort'),
    dataIndex: 'remotePort',
    key: 'remotePort'
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200
  }
])

const apiUrl = computed(() => {
  if (props.nodeId) {
    return `/api/node/${props.nodeId}/tunnel`
  }
  return '/api/config/tunnel'
})

async function fetchTunnels() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean, data: TunnelConfig[], error?: { code: string, message: string } }>(
      apiUrl.value
    )

    if (response.success) {
      dataSource.value = response.data
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

function handleAdd() {
  drawerMode.value = 'add'
  selectedTunnel.value = undefined
  drawerOpen.value = true
}

function handleEdit(record: TunnelConfig) {
  drawerMode.value = 'edit'
  selectedTunnel.value = record
  drawerOpen.value = true
}

function handleDelete(record: TunnelConfig) {
  Modal.confirm({
    title: t('tunnel.deleteConfirm'),
    content: t('tunnel.deleteConfirmMessage', { name: record.name }),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        const response = await $fetch<{ success: boolean, error?: { code: string, message: string } }>(
          apiUrl.value,
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

function handleTunnelSuccess() {
  fetchTunnels()
}

watch(() => props.nodeId, () => {
  fetchTunnels()
})

onMounted(() => {
  fetchTunnels()
})
</script>
