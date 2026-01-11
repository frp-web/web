import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (_event) => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    const nodeManager = bridge.getNodeManager()

    if (!nodeManager) {
      throw createError({
        statusCode: 500,
        message: 'Not in server mode'
      })
    }

    const stats = await nodeManager.getStatistics()

    return {
      success: true,
      data: stats
    }
  }
  catch (error) {
    console.error('[API] node stats error:', error)

    if (error instanceof Error && 'statusCode' in error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error.message
        }
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to get node statistics'
    return {
      success: false,
      error: {
        code: 'NODE_STATS_ERROR',
        message
      }
    }
  }
})
