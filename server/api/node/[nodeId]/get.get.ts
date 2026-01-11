import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const nodeId = getRouterParam(event, 'nodeId')

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

    const nodeManager = bridge.getNodeManager()

    if (!nodeManager) {
      throw createError({
        statusCode: 500,
        message: 'Not in server mode'
      })
    }

    const node = await nodeManager.getNode(nodeId)

    if (!node) {
      throw createError({
        statusCode: 404,
        message: 'Node not found'
      })
    }

    return {
      success: true,
      data: node
    }
  }
  catch (error) {
    console.error('[API] node get error:', error)

    if (error instanceof Error && 'statusCode' in error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error.message
        }
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to get node'
    return {
      success: false,
      error: {
        code: 'NODE_GET_ERROR',
        message
      }
    }
  }
})
