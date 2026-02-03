<style scoped>
.node-management-page {
  padding: 16px;
}
</style>

<template>
  <div class="node-management-page">
    <AntRow :gutter="[16, 16]">
      <!-- 统计卡片 -->
      <AntCol :xs="24" :sm="12" :md="6">
        <AntCard :loading="nodeStore.loading">
          <AntStatistic
            :title="$t('node.totalNodes')"
            :value="nodeStore.nodeStats.total"
            :prefix="h('i', { class: 'i-carbon-server' })"
          />
        </AntCard>
      </AntCol>
      <AntCol :xs="24" :sm="12" :md="6">
        <AntCard>
          <AntStatistic
            :title="$t('node.onlineNodes')"
            :value="nodeStore.nodeStats.online"
            :value-style="{ color: '#52c41a' }"
            :prefix="h('i', { class: 'i-carbon-circle-check' })"
          />
        </AntCard>
      </AntCol>
      <AntCol :xs="24" :sm="12" :md="6">
        <AntCard>
          <AntStatistic
            :title="$t('node.offlineNodes')"
            :value="nodeStore.nodeStats.offline"
            :value-style="{ color: '#d9d9d9' }"
            :prefix="h('i', { class: 'i-carbon-circle-outline' })"
          />
        </AntCard>
      </AntCol>
      <AntCol :xs="24" :sm="12" :md="6">
        <AntCard>
          <AntStatistic
            :title="$t('node.pendingCommands')"
            :value="nodeStore.pendingCommands"
            :value-style="{ color: nodeStore.pendingCommands > 0 ? '#faad14' : '' }"
            :prefix="h('i', { class: 'i-carbon-time' })"
          />
        </AntCard>
      </AntCol>

      <!-- 节点列表 -->
      <AntCol :span="24">
        <AntCard
          :title="$t('node.nodeList')"
          :loading="nodeStore.loading"
        >
          <template #extra>
            <AntButton
              :icon="h('i', { class: 'i-carbon-refresh' })"
              :loading="refreshing"
              @click="handleRefresh"
            >
              {{ $t('common.refresh') }}
            </AntButton>
          </template>

          <!-- 节点表格 -->
          <AntTable
            :columns="columns"
            :data-source="nodeStore.nodes"
            :pagination="pagination"
            :scroll="{ x: 1200 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <!-- 节点名称/ID -->
              <template v-if="column.key === 'name'">
                <div flex="~ items-center gap-2">
                  <div
                    :class="getOnlineIndicatorClass(record)"
                    h-2
                    w-2
                    rounded-full
                  />
                  <div>
                    <div font-medium>
                      {{ record.hostname || record.id }}
                    </div>
                    <div class="text-xs text-[var(--ant-color-text-tertiary)]">
                      {{ record.id }}
                    </div>
                  </div>
                </div>
              </template>

              <!-- 地址 -->
              <template v-else-if="column.key === 'address'">
                <div>
                  <div>{{ record.ip }}:{{ record.port }}</div>
                  <div class="text-xs text-[var(--ant-color-text-tertiary)]">
                    → {{ record.serverAddr }}:{{ record.serverPort }}
                  </div>
                </div>
              </template>

              <!-- 状态 -->
              <template v-else-if="column.key === 'status'">
                <AntTag :color="getStatusColor(record)">
                  {{ $t(`node.status.${getStatusKey(record)}`) }}
                </AntTag>
              </template>

              <!-- 系统信息 -->
              <template v-else-if="column.key === 'system'">
                <div v-if="record.platform" class="text-sm">
                  {{ record.osType }} {{ record.osRelease }}
                </div>
                <div v-else class="text-[var(--ant-color-text-tertiary)]">
                  -
                </div>
              </template>

              <!-- 版本 -->
              <template v-else-if="column.key === 'version'">
                <template v-if="record.frpVersion || record.bridgeVersion">
                  <div class="text-sm">
                    <div v-if="record.frpVersion">
                      FRP: {{ record.frpVersion }}
                    </div>
                    <div v-if="record.bridgeVersion" class="text-xs text-[var(--ant-color-text-tertiary)]">
                      Bridge: {{ record.bridgeVersion }}
                    </div>
                  </div>
                </template>
                <div v-else class="text-[var(--ant-color-text-tertiary)]">
                  -
                </div>
              </template>

              <!-- 连接时间 -->
              <template v-else-if="column.key === 'connectedAt'">
                <div v-if="record.connectedAt" class="text-sm">
                  {{ formatTime(record.connectedAt) }}
                </div>
                <div v-else class="text-[var(--ant-color-text-tertiary)]">
                  -
                </div>
              </template>

              <!-- 操作 -->
              <template v-else-if="column.key === 'actions'">
                <AntSpace>
                  <AntButton
                    type="link"
                    size="small"
                    :disabled="!isNodeOnline(record)"
                    @click="handleSync(record)"
                  >
                    {{ $t('node.sync') }}
                  </AntButton>
                  <AntButton
                    type="link"
                    size="small"
                    @click="handleViewDetail(record)"
                  >
                    {{ $t('common.detail') }}
                  </AntButton>
                  <AntDropdown>
                    <template #overlay>
                      <AntMenu>
                        <AntMenuItem
                          :disabled="!isNodeOnline(record)"
                          @click="handleManageTunnel(record)"
                        >
                          <template #icon>
                            <i class="i-carbon-network-2" />
                          </template>
                          {{ $t('node.manageTunnel') }}
                        </AntMenuItem>
                        <AntMenuItem
                          danger
                          @click="handleDelete(record)"
                        >
                          <template #icon>
                            <i class="i-carbon-trash-can" />
                          </template>
                          {{ $t('common.delete') }}
                        </AntMenuItem>
                      </AntMenu>
                    </template>
                    <AntButton type="link" size="small">
                      <template #icon>
                        <i class="i-carbon-overflow-menu-horizontal" />
                      </template>
                    </AntButton>
                  </AntDropdown>
                </AntSpace>
              </template>
            </template>
          </AntTable>
        </AntCard>
      </AntCol>
    </AntRow>

    <!-- 节点详情抽屉 -->
    <NodeDetailDrawer
      v-model:open="detailDrawerVisible"
      :node-id="selectedNodeId"
    />

    <!-- 删除确认对话框 -->
    <AntModal
      v-model:open="deleteConfirmVisible"
      :title="$t('node.deleteConfirm')"
      :confirm-loading="deleting"
      @ok="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    >
      <p>{{ deleteConfirmMessage }}</p>
    </AntModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumnType } from 'ant-design-vue'
import type { NodeInfo } from '~/stores/node'
import { message } from 'ant-design-vue'
import { useNodeStore } from '~/stores/node'

const { t } = useI18n()
const nodeStore = useNodeStore()
const router = useRouter()

// 对话框状态
const detailDrawerVisible = ref(false)
const deleteConfirmVisible = ref(false)

// 操作状态
const refreshing = ref(false)
const deleting = ref(false)

// 选中的节点
const selectedNodeId = ref<string>()
const nodeToDelete = ref<NodeInfo>()

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => t('common.totalRecords', { total })
})

// 表格列定义
const columns: TableColumnType<NodeInfo>[] = [
  {
    key: 'name',
    title: t('node.name'),
    width: 200
  },
  {
    key: 'address',
    title: t('node.address'),
    width: 200
  },
  {
    key: 'status',
    title: t('common.status'),
    width: 120,
    align: 'center'
  },
  {
    key: 'system',
    title: t('node.system'),
    width: 180
  },
  {
    key: 'version',
    title: t('node.version'),
    width: 180
  },
  {
    key: 'connectedAt',
    title: t('node.connectedAt'),
    width: 180
  },
  {
    key: 'actions',
    title: t('common.actions'),
    width: 180,
    fixed: 'right',
    align: 'center'
  }
]

// 删除确认消息
const deleteConfirmMessage = computed(() => {
  if (nodeToDelete.value) {
    return t('node.deleteConfirmMessage', {
      name: nodeToDelete.value.hostname || nodeToDelete.value.id
    })
  }
  return ''
})

// 获取在线指示器样式
function getOnlineIndicatorClass(node: NodeInfo) {
  if (node.isOnline || node.hasActiveConnection) {
    return 'bg-success'
  }
  if (node.status === 'connecting') {
    return 'bg-warning'
  }
  if (node.status === 'error') {
    return 'bg-error'
  }
  return 'bg-default'
}

// 获取状态颜色
function getStatusColor(node: NodeInfo) {
  if (node.isOnline || node.hasActiveConnection) {
    return 'success'
  }
  if (node.status === 'connecting') {
    return 'processing'
  }
  if (node.status === 'error') {
    return 'error'
  }
  return 'default'
}

// 获取状态 key
function getStatusKey(node: NodeInfo) {
  if (node.isOnline || node.hasActiveConnection) {
    return 'online'
  }
  return node.status
}

// 检查节点是否在线
function isNodeOnline(node: NodeInfo) {
  return nodeStore.isNodeOnline(node.id)
}

// 格式化时间
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

// 刷新节点列表
async function handleRefresh() {
  refreshing.value = true
  try {
    await nodeStore.fetchNodes()
    message.success(t('node.refreshSuccess'))
  }
  catch {
    message.error(t('node.refreshFailed'))
  }
  finally {
    refreshing.value = false
  }
}

// 同步节点
async function handleSync(node: NodeInfo) {
  try {
    const result = await nodeStore.syncNodes(node.id)
    message.success(result.message || t('node.syncSuccess'))
  }
  catch {
    message.error(t('node.syncFailed'))
  }
}

// 查看详情
function handleViewDetail(node: NodeInfo) {
  selectedNodeId.value = node.id
  detailDrawerVisible.value = true
}

// 同步所有节点
async function _handleSyncAll() {
  try {
    const result = await nodeStore.syncNodes()
    message.success(result.message || t('node.syncAllSuccess'))
  }
  catch {
    message.error(t('node.syncAllFailed'))
  }
}

// 管理隧道
function handleManageTunnel(node: NodeInfo) {
  router.push(`/node/${node.id}/tunnel`)
}

// 显示删除确认
function handleDelete(node: NodeInfo) {
  nodeToDelete.value = node
  deleteConfirmVisible.value = true
}

// 确认删除
async function confirmDelete() {
  if (!nodeToDelete.value)
    return

  deleting.value = true
  try {
    // 使用节点的 id 作为 nodeId，使用 hostname 或 id 作为 targetName
    await nodeStore.deleteNode(nodeToDelete.value.id, nodeToDelete.value.hostname || nodeToDelete.value.id)
    message.success(t('node.deleteSuccess'))
    deleteConfirmVisible.value = false
    nodeToDelete.value = undefined
  }
  catch {
    message.error(t('node.deleteFailed'))
  }
  finally {
    deleting.value = false
  }
}

// 页面加载时获取节点列表
onMounted(() => {
  handleRefresh()
})
</script>
