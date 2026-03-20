import { Buffer } from 'node:buffer'
import { appStorage } from '~~/app/stores/storages'
import { useFrpBridge } from '~~/server/bridge'

interface FrpsClient {
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

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    const mode = appStorage.frpMode || 'server'

    // 只在 server 模式下获取客户端列表
    if (mode !== 'server') {
      return {
        success: true,
        data: {
          nodes: [],
          online: [],
          total: 0,
          onlineCount: 0,
          pendingCommands: 0
        },
        message: 'Client list only available in server mode'
      }
    }

    // 检查 frps 是否运行
    const processManager = bridge.getProcessManager()
    if (!processManager.isRunning()) {
      return {
        success: true,
        data: {
          nodes: [],
          online: [],
          total: 0,
          onlineCount: 0,
          pendingCommands: 0
        },
        message: 'FRP service is not running'
      }
    }

    // 获取 frps 的 dashboard 配置
    const presetConfig = processManager.getPresetConfig()

    const dashboardPort = presetConfig?.frps?.dashboardPort || 7500
    const dashboardUser = presetConfig?.frps?.dashboardUser || 'admin'
    const dashboardPassword = presetConfig?.frps?.dashboardPassword || 'admin'

    // 调用 frps webServer 的 /api/clients 接口
    const auth = Buffer.from(`${dashboardUser}:${dashboardPassword}`).toString('base64')
    const response = await fetch(`http://127.0.0.1:${dashboardPort}/api/clients`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.statusText}`)
    }

    const clients = await response.json() as FrpsClient[]

    // 转换为 NodeInfo 格式
    const nodes = clients.map(client => ({
      id: client.clientID,
      hostname: client.hostname,
      ip: client.clientIP,
      port: 0, // frps API 不提供端口信息
      status: client.online ? 'online' as const : 'offline' as const,
      serverAddr: '',
      serverPort: 0,
      connectedAt: client.firstConnectedAt * 1000, // 转换为毫秒
      lastHeartbeat: client.lastConnectedAt * 1000,
      isOnline: client.online,
      hasActiveConnection: client.online,
      // 额外的客户端信息
      user: client.user,
      clientID: client.clientID,
      runID: client.runID
    }))

    const onlineNodeIds = clients.filter(c => c.online).map(c => c.clientID)

    return {
      success: true,
      data: {
        nodes,
        online: onlineNodeIds,
        total: clients.length,
        onlineCount: onlineNodeIds.length,
        pendingCommands: 0
      }
    }
  }
  catch (error) {
    console.error('[API] nodes.list error:', error)
    // 返回空数据而不是错误，避免前端报错
    return {
      success: true,
      data: {
        nodes: [],
        online: [],
        total: 0,
        onlineCount: 0,
        pendingCommands: 0
      },
      message: 'Failed to fetch nodes, service may not be running'
    }
  }
})
