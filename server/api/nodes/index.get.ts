import type { RpcCommandStatus } from 'frp-bridge/rpc'
import { useFrpBridge } from '~~/server/bridge'
import { nodeRegistry } from '~~/server/bridge/node-registry'

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    // 获取 RPC 服务器实例（仅在 server 模式下可用）
    const rpcServer = bridge.getRpcServer()

    if (!rpcServer) {
      return {
        success: true,
        data: {
          nodes: [],
          online: [],
          total: 0,
          pendingCommands: 0
        },
        message: 'RPC server not available (client mode)'
      }
    }

    // 获取在线节点列表
    const onlineNodes = rpcServer.getOnlineNodes()

    // 获取所有命令状态
    const commandStatuses = rpcServer.getAllRpcCommandStatuses?.() || []

    // 从注册表获取节点列表并更新在线状态
    const nodes = nodeRegistry.updateOnlineStatus(onlineNodes)

    return {
      success: true,
      data: {
        nodes,
        online: onlineNodes,
        total: nodes.length,
        onlineCount: onlineNodes.length,
        pendingCommands: commandStatuses.filter((cmd: RpcCommandStatus) => cmd.status === 'pending').length
      }
    }
  }
  catch (error) {
    console.error('[API] nodes.list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to list nodes'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
