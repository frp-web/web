import { useFrpBridge } from '~~/server/bridge'

interface SyncNodesPayload {
  nodeId?: string // 指定同步特定节点，不指定则同步所有
}

export default defineEventHandler(async (event) => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    const rpcServer = bridge.getRpcServer()

    if (!rpcServer) {
      throw createError({
        statusCode: 400,
        message: 'RPC server not available (only available in server mode)'
      })
    }

    const body = await readBody<SyncNodesPayload>(event)
    const { nodeId } = body

    // 广播同步命令到所有在线节点或指定节点
    const syncCommand = {
      type: 'command' as const,
      action: 'node.sync',
      payload: {
        timestamp: Date.now()
      },
      id: crypto.randomUUID()
    }

    if (nodeId) {
      // 同步指定节点
      const success = rpcServer.sendToNode(nodeId, syncCommand)

      if (!success) {
        throw createError({
          statusCode: 404,
          message: `Node ${nodeId} not found or offline`
        })
      }

      return {
        success: true,
        message: `Sync command sent to node ${nodeId}`,
        commandId: syncCommand.id
      }
    }
    else {
      // 广播到所有在线节点
      rpcServer.broadcast(syncCommand)

      const onlineNodes = rpcServer.getOnlineNodes()

      return {
        success: true,
        message: `Sync command sent to ${onlineNodes.length} nodes`,
        commandId: syncCommand.id,
        targetNodes: onlineNodes
      }
    }
  }
  catch (error) {
    console.error('[API] nodes.sync error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sync nodes'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
