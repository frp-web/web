<template>
  <div p-4>
    <!-- 页面头部 -->
    <div fyc gap-3 m-b-4>
      <AntButton type="text" :icon="h('i', { class: 'i-carbon-arrow-left' })" @click="handleBack">
        {{ $t('common.back') }}
      </AntButton>
      <h2 flex-1 m-0 text-xl color-base font-semibold>
        {{ pageTitle }}
      </h2>
      <AntButton
        :icon="h('i', { class: 'i-carbon-refresh' })"
        :loading="loading"
        @click="handleRefresh"
      >
        {{ $t('common.refresh') }}
      </AntButton>
    </div>

    <!-- 节点信息卡片 -->
    <AntCard v-if="nodeInfo" m-b-4>
      <div grid grid-cols="[repeat(auto-fit,minmax(200px,1fr))]" gap-4 items-center>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('common.status') }}</span>
          <AntTag :color="nodeInfo.online ? 'success' : 'default'">
            {{ $t(nodeInfo.online ? 'node.status.online' : 'node.status.offline') }}
          </AntTag>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('node.hostname') }}</span>
          <span text-sm color-base font-medium>{{ nodeInfo.hostname || '-' }}</span>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('node.clientIP') }}</span>
          <span text-sm color-base font-medium>{{ nodeInfo.clientIP }}</span>
        </div>
        <div fyc gap-2>
          <span text-sm color-secondary whitespace-nowrap>{{ $t('node.user') }}</span>
          <span text-sm color-base font-medium>{{ nodeInfo.user || '-' }}</span>
        </div>
        <div fyc gap-2>
          <AntButton type="link" size="small" @click="showDetailModal = true">
            {{ $t('common.viewMore') }}
          </AntButton>
        </div>
      </div>
    </AntCard>

    <!-- 代理列表 -->
    <div m-t-0>
      <AntTabs v-model:active-key="activeTab" @change="handleTabChange">
        <AntTabPane
          v-for="type in proxyTypes"
          :key="type"
          :tab="getTabLabel(type)"
        >
          <AntCard :loading="loading">
            <AntTable
              :columns="columns"
              :data-source="getProxiesByType(type)"
              :pagination="pagination"
              :scroll="{ x: 1200 }"
              row-key="name"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <!-- 代理名称 -->
                <template v-if="column.key === 'name'">
                  <AntButton type="link" size="small" @click="goToProxyDetail(record.name)">
                    {{ record.name }}
                  </AntButton>
                </template>

                <!-- 类型 -->
                <template v-else-if="column.key === 'type'">
                  <AntTag :color="getTypeColor(record.type)">
                    {{ record.type.toUpperCase() }}
                  </AntTag>
                </template>

                <!-- 端口信息 -->
                <template v-else-if="column.key === 'ports'">
                  <div>
                    <div>{{ record.localIP }}:{{ record.localPort || 0 }}</div>
                    <div text-xs color-tertiary>
                      → :{{ record.remotePort }}
                    </div>
                  </div>
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'status'">
                  <AntTag :color="record.status === 'online' ? 'success' : 'default'">
                    {{ record.status }}
                  </AntTag>
                </template>

                <!-- 连接数 -->
                <template v-else-if="column.key === 'curConns'">
                  <span>{{ record.curConns || 0 }}</span>
                </template>

                <!-- 流量 -->
                <template v-else-if="column.key === 'traffic'">
                  <div text-sm>
                    <div>↓ {{ formatBytes(record.todayTrafficIn || 0) }}</div>
                    <div text-xs color-tertiary>
                      ↑ {{ formatBytes(record.todayTrafficOut || 0) }}
                    </div>
                  </div>
                </template>

                <!-- 时间 -->
                <template v-else-if="column.key === 'time'">
                  <div text-sm>
                    <div v-if="record.lastStartTime">
                      {{ record.lastStartTime }}
                    </div>
                    <div v-else color-tertiary>
                      -
                    </div>
                  </div>
                </template>

                <!-- 版本 -->
                <template v-else-if="column.key === 'clientVersion'">
                  {{ record.clientVersion || '-' }}
                </template>
              </template>
            </AntTable>
          </AntCard>
        </AntTabPane>
      </AntTabs>
    </div>

    <!-- 详细信息弹窗 -->
    <AntModal
      v-model:open="showDetailModal"
      :title="$t('node.detailInfo')"
      :footer="null"
      width="600px"
    >
      <AntDescriptions v-if="nodeInfo" :column="1" bordered size="small">
        <AntDescriptionsItem :label="$t('node.clientID')">
          {{ nodeInfo.clientID }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.runID')">
          {{ nodeInfo.runID }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.hostname')">
          {{ nodeInfo.hostname || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.user')">
          {{ nodeInfo.user || '-' }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.clientIP')">
          {{ nodeInfo.clientIP }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('common.status')">
          <AntTag :color="nodeInfo.online ? 'success' : 'default'">
            {{ $t(nodeInfo.online ? 'node.status.online' : 'node.status.offline') }}
          </AntTag>
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.firstConnectedAt')">
          {{ formatTimestamp(nodeInfo.firstConnectedAt) }}
        </AntDescriptionsItem>
        <AntDescriptionsItem :label="$t('node.lastConnectedAt')">
          {{ formatTimestamp(nodeInfo.lastConnectedAt) }}
        </AntDescriptionsItem>
      </AntDescriptions>
    </AntModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumnType } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { h } from 'vue'

interface NodeInfo {
  key: string
  user: string
  clientID: string
  runID: string
  hostname: string
  clientIP: string
  firstConnectedAt: number
  lastConnectedAt: number
  online: boolean
}

interface ProxyInfo {
  name: string
  type: string
  remotePort: number
  localPort: number
  localIP: string
  curConns: number
  todayTrafficIn: number
  todayTrafficOut: number
  status: string
  clientID: string
  clientVersion: string
  lastStartTime: string
  lastCloseTime: string
  conf: any
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const nodeId = computed(() => route.params.id as string)
const loading = ref(false)
const nodeInfo = ref<NodeInfo>()
const allProxies = ref<ProxyInfo[]>([])
const activeTab = ref('tcp')
const showDetailModal = ref(false)

const proxyTypes = ['tcp', 'udp', 'http', 'https', 'tcpmux', 'stcp', 'sudp']

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => t('common.totalRecords', { total })
})

// 表格列定义
const columns: TableColumnType<ProxyInfo>[] = [
  {
    key: 'name',
    title: t('proxy.name'),
    width: 150
  },
  {
    key: 'type',
    title: t('proxy.type'),
    width: 80,
    align: 'center'
  },
  {
    key: 'ports',
    title: t('proxy.ports'),
    width: 160
  },
  {
    key: 'status',
    title: t('common.status'),
    width: 90,
    align: 'center'
  },
  {
    key: 'curConns',
    title: t('proxy.connections'),
    width: 90,
    align: 'center'
  },
  {
    key: 'traffic',
    title: t('proxy.traffic'),
    width: 130
  },
  {
    key: 'time',
    title: t('proxy.lastStartTime'),
    width: 150
  },
  {
    key: 'clientVersion',
    title: t('proxy.version'),
    width: 100
  }
]

const pageTitle = computed(() => {
  if (nodeInfo.value) {
    return nodeInfo.value.hostname || nodeInfo.value.clientID
  }
  return t('node.detail')
})

// 获取指定类型的代理列表
function getProxiesByType(type: string) {
  return allProxies.value.filter(p => p.type === type && p.clientID === nodeId.value)
}

// 获取标签文本
function getTabLabel(type: string) {
  const count = getProxiesByType(type).length
  return `${type.toUpperCase()} (${count})`
}

// 获取类型颜色
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    tcp: 'blue',
    udp: 'cyan',
    http: 'green',
    https: 'purple',
    stcp: 'orange',
    xtcp: 'magenta',
    sudp: 'geekblue',
    tcpmux: 'volcano'
  }
  return colors[type.toLowerCase()] || 'default'
}

// 格式化时间戳
function formatTimestamp(timestamp: number) {
  if (!timestamp)
    return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

// 格式化字节数
function formatBytes(bytes: number) {
  if (!bytes || bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

// 加载节点信息
async function loadNodeInfo() {
  try {
    const response = await $fetch<{ success: boolean, data: NodeInfo }>(`/api/clients/${nodeId.value}`)
    if (response.success && response.data) {
      nodeInfo.value = response.data
    }
  }
  catch (error) {
    console.error('Failed to load node info:', error)
    message.error(t('node.loadFailed'))
  }
}

// 加载所有类型的代理
async function loadAllProxies() {
  loading.value = true
  try {
    const promises = proxyTypes.map(type =>
      $fetch<{ success: boolean, data: ProxyInfo[] }>(`/api/proxy/${type}`)
    )

    const results = await Promise.all(promises)
    allProxies.value = results.flatMap(r => r.success ? r.data : [])
  }
  catch (error) {
    console.error('Failed to load proxies:', error)
    message.error(t('proxy.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

// 刷新数据
async function handleRefresh() {
  await Promise.all([
    loadNodeInfo(),
    loadAllProxies()
  ])
}

// 切换标签
function handleTabChange() {
  pagination.current = 1
}

// 返回
function handleBack() {
  router.push('/node')
}

// 跳转到代理详情
function goToProxyDetail(proxyName: string) {
  router.push(`/proxy/${proxyName}`)
}

// 页面加载时获取数据
onMounted(() => {
  handleRefresh()
})
</script>
