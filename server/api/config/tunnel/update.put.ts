import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    // 更新隧道
    const result = await bridge.execute({
      name: 'proxy.update',
      payload: body
    })

    return {
      success: true,
      data: result
    }
  }
  catch (error) {
    console.error('[API] tunnel.update error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update tunnel'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
