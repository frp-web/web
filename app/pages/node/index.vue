<template>
  <section flex="~ col" gap-6>
    <header flex="~ wrap" items-start justify-between gap-4>
      <div>
        <h1 text-2xl color-base font-semibold>
          节点管理
        </h1>
        <p text-sm color-secondary>
          管理 FRP 服务端节点
        </p>
      </div>
      <AntButton type="primary">
        添加节点
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
              <AntButton size="small" @click="handleDetail(record)">
                详情
              </AntButton>
              <AntButton size="small" @click="handleTunnel(record)">
                隧道管理
              </AntButton>
            </AntSpace>
          </template>
        </template>
      </AntTable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'default'
})

const loading = ref(false)

const columns = [
  {
    title: '节点名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '节点ID',
    dataIndex: 'id',
    key: 'id'
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

function handleDetail(record: any) {
  // TODO: 实现详情弹窗
  // eslint-disable-next-line no-console
  console.log('详情:', record)
}

function handleTunnel(record: any) {
  navigateTo(`/node/${record.id}/tunnel`)
}
</script>
