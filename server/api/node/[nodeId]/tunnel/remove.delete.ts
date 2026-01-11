import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const nodeId = getRouterParam(event, 'nodeId')
    const body = await readBody(event)

    if (!nodeId) {
      throw createError({
        statusCode: 400,
        message: 'Missing nodeId parameter'
      })
    }

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
        statusCode: 500,
        message: 'Not in server mode'
      })
    }

    // 通过 RPC 远程执行
    try {
      const result = await rpcServer.rpcCall(nodeId, 'tunnel.remove', body, 30000)

      return {
        success: true,
        data: result
      }
    }
    catch (rpcError) {
      const message = rpcError instanceof Error ? rpcError.message : 'RPC call failed'

      if (message.includes('timeout')) {
        throw createError({
          statusCode: 504,
          message: 'Node timeout'
        })
      }

      if (message.includes('not connected')) {
        throw createError({
          statusCode: 503,
          message: 'Node offline'
        })
      }

      throw rpcError
    }
  }
  catch (error) {
    console.error('[API] node tunnel.remove error:', error)

    if (error instanceof Error && error.message.includes('statusCode')) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error.message
        }
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to remove tunnel'
    return {
      success: false,
      error: {
        code: 'RPC_ERROR',
        message
      }
    }
  }
})
