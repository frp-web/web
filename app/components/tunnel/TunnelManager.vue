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
      <AntButton type="primary">
        {{ $t('tunnel.addTunnel') }}
      </AntButton>
    </header>

    <div rounded-lg bg-container p-4 shadow-sm>
      <AntTable
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
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
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface TunnelManagerProps {
  nodeId?: string
}

const props = defineProps<TunnelManagerProps>()
const { t } = useI18n()

const loading = ref(false)

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

const columns = [
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
    title: t('common.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200
  }
]

const dataSource = ref<any[]>([])

function handleEdit(record: any) {
  // TODO: 实现编辑功能
  // eslint-disable-next-line no-console
  console.log('Edit:', record)
}

function handleDelete(record: any) {
  // TODO: 实现删除功能
  // eslint-disable-next-line no-console
  console.log('Delete:', record)
}
</script>
