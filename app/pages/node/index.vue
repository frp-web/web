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
      <AntButton type="primary">
        {{ $t('node.addNode') }}
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
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()

const loading = ref(false)

const columns = [
  {
    title: t('node.nodeName'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('node.nodeId'),
    dataIndex: 'id',
    key: 'id'
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

function handleDetail(record: any) {
  // TODO: 实现详情弹窗
  // eslint-disable-next-line no-console
  console.log('Detail:', record)
}

function handleTunnel(record: any) {
  navigateTo(`/node/${record.id}/tunnel`)
}
</script>
