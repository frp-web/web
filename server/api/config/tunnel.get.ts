import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    // 使用 frp-bridge 的 proxy.list 查询
    const queryResult = await bridge.query({
      name: 'proxy.list'
    })

    return {
      success: true,
      data: Array.isArray(queryResult.result) ? queryResult.result : []
    }
  }
  catch (error) {
    console.error('[API] tunnel.list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to list tunnels'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
