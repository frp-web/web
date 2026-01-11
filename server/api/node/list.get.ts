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

    const nodeManager = bridge.getNodeManager()

    if (!nodeManager) {
      throw createError({
        statusCode: 500,
        message: 'Not in server mode'
      })
    }

    // Get query parameters
    const query = getQuery(event)
    const listQuery = {
      page: query.page ? Number.parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? Number.parseInt(query.pageSize as string, 10) : 20,
      status: query.status as 'online' | 'offline' | 'connecting' | 'error' | undefined,
      search: query.search as string | undefined
    }

    const result = await nodeManager.listNodes(listQuery)

    return {
      success: true,
      data: result
    }
  }
  catch (error) {
    console.error('[API] node list error:', error)

    if (error instanceof Error && 'statusCode' in error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error.message
        }
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to list nodes'
    return {
      success: false,
      error: {
        code: 'NODE_LIST_ERROR',
        message
      }
    }
  }
})
