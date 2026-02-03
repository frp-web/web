import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    const { nodeId, targetName } = await getQuery<{ nodeId: string, targetName: string }>(event)

    if (!nodeId || !targetName) {
      throw createError({
        statusCode: 400,
        message: 'Missing required parameters: nodeId, targetName'
      })
    }

    const rpcServer = bridge.getRpcServer()

    if (!rpcServer) {
      throw createError({
        statusCode: 400,
        message: 'RPC server not available (only available in server mode)'
      })
    }

    // 检查节点是否在线
    if (!rpcServer.isNodeOnline(nodeId)) {
      throw createError({
        statusCode: 404,
        message: `Node ${nodeId} is not online`
      })
    }

    // 发送删除命令
    const deleteCommand = {
      type: 'command' as const,
      action: 'node.delete',
      payload: {
        name: targetName
      },
      id: crypto.randomUUID()
    }

    const success = rpcServer.sendToNode(nodeId, deleteCommand)

    if (!success) {
      throw createError({
        statusCode: 500,
        message: 'Failed to send delete command'
      })
    }

    return {
      success: true,
      message: `Node ${targetName} deletion command sent to ${nodeId}`,
      commandId: deleteCommand.id
    }
  }
  catch (error) {
    console.error('[API] nodes.delete error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete node'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
