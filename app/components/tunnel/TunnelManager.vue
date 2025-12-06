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
        添加隧道
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
                编辑
              </AntButton>
              <AntButton size="small" danger @click="handleDelete(record)">
                删除
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

const loading = ref(false)

const title = computed(() => {
  if (props.nodeId) {
    return `隧道管理 - 服务端节点 ${props.nodeId}`
  }
  return '隧道管理'
})

const subtitle = computed(() => {
  if (props.nodeId) {
    return `管理服务端节点 ${props.nodeId} 的隧道配置`
  }
  return '管理客户端隧道配置'
})

const columns = [
  {
    title: '隧道名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type'
  },
  {
    title: '本地端口',
    dataIndex: 'localPort',
    key: 'localPort'
  },
  {
    title: '远程端口',
    dataIndex: 'remotePort',
    key: 'remotePort'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: '操作',
    key: 'actions',
    width: 200
  }
]

const dataSource = ref<any[]>([])

function handleEdit(record: any) {
  // TODO: 实现编辑功能
  // eslint-disable-next-line no-console
  console.log('编辑:', record)
}

function handleDelete(record: any) {
  // TODO: 实现删除功能
  // eslint-disable-next-line no-console
  console.log('删除:', record)
}
</script>
