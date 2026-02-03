/**
 * 节点管理 Store
 * 用于管理连接的 frpc 客户端节点
 */

export interface NodeInfo {
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
  isOnline?: boolean // 来自 RPC 服务器的实时在线状态
  hasActiveConnection?: boolean // 来自 NodeManager 的状态
}

export interface NodeStats {
  total: number
  online: number
  offline: number
  connecting: number
  error: number
}

export interface NodesData {
  nodes: NodeInfo[]
  online: string[] // 在线节点 ID 列表
  total: number
  pendingCommands: number
}

export const useNodeStore = defineStore('node', () => {
  // 状态
  const loading = ref(false)
  const nodes = ref<NodeInfo[]>([])
  const onlineNodeIds = ref<string[]>([])
  const totalNodes = ref(0)
  const pendingCommands = ref(0)

  // 计算属性 - 节点统计
  const nodeStats = computed<NodeStats>(() => {
    const stats: NodeStats = {
      total: nodes.value.length,
      online: 0,
      offline: 0,
      connecting: 0,
      error: 0
    }

    nodes.value.forEach((node) => {
      if (node.isOnline || node.hasActiveConnection) {
        stats.online++
      }
      else {
        stats.offline++
      }

      if (node.status === 'connecting') {
        stats.connecting++
      }
      else if (node.status === 'error') {
        stats.error++
      }
    })

    return stats
  })

  // 按状态分组节点
  const nodesByStatus = computed(() => {
    const grouped: Record<string, NodeInfo[]> = {
      online: [],
      offline: [],
      connecting: [],
      error: []
    }

    nodes.value.forEach((node) => {
      if (node.isOnline || node.hasActiveConnection) {
        grouped.online.push(node)
      }
      else if (node.status === 'connecting') {
        grouped.connecting.push(node)
      }
      else if (node.status === 'error') {
        grouped.error.push(node)
      }
      else {
        grouped.offline.push(node)
      }
    })

    return grouped
  })

  /**
   * 加载节点列表
   */
  async function fetchNodes() {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean, data: NodesData, error?: { code: string, message: string } }>(
        '/api/nodes'
      )

      if (response.success && response.data) {
        nodes.value = response.data.nodes
        onlineNodeIds.value = response.data.online
        totalNodes.value = response.data.total
        pendingCommands.value = response.data.pendingCommands
      }
      else {
        throw new Error(response.error?.message || 'Failed to fetch nodes')
      }
    }
    catch (error) {
      console.error('Failed to fetch nodes:', error)
      throw error
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 同步节点（向所有节点发送同步命令）
   */
  async function syncNodes(nodeId?: string) {
    try {
      const response = await $fetch<{ success: boolean, message: string, commandId: string, targetNodes?: string[] }>(
        '/api/nodes/sync',
        {
          method: 'POST',
          body: nodeId ? { nodeId } : {}
        }
      )

      if (response.success) {
        // 刷新节点列表
        await fetchNodes()
        return {
          success: true,
          message: response.message,
          commandId: response.commandId,
          targetNodes: response.targetNodes
        }
      }
      else {
        throw new Error('Failed to sync nodes')
      }
    }
    catch (error) {
      console.error('Failed to sync nodes:', error)
      throw error
    }
  }

  /**
   * 删除节点
   */
  async function deleteNode(nodeId: string, targetName: string) {
    try {
      const response = await $fetch<{ success: boolean, message: string, commandId: string }>(
        `/api/nodes/delete?nodeId=${encodeURIComponent(nodeId)}&targetName=${encodeURIComponent(targetName)}`,
        { method: 'DELETE' }
      )

      if (response.success) {
        // 刷新节点列表
        await fetchNodes()
        return {
          success: true,
          message: response.message,
          commandId: response.commandId
        }
      }
      else {
        throw new Error('Failed to delete node')
      }
    }
    catch (error) {
      console.error('Failed to delete node:', error)
      throw error
    }
  }

  /**
   * 检查节点是否在线
   */
  function isNodeOnline(nodeId: string): boolean {
    return onlineNodeIds.value.includes(nodeId)
  }

  /**
   * 获取节点详情
   */
  function getNode(nodeId: string): NodeInfo | undefined {
    return nodes.value.find(n => n.id === nodeId)
  }

  return {
    // 状态
    loading,
    nodes,
    onlineNodeIds,
    totalNodes,
    pendingCommands,

    // 计算属性
    nodeStats,
    nodesByStatus,

    // 方法
    fetchNodes,
    syncNodes,
    deleteNode,
    isNodeOnline,
    getNode
  }
})
