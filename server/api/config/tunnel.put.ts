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
    // body 包含: { oldName: string, name: string, type: string, ...otherFields }
    const { oldName, ...proxyData } = body

    const commandResult = await bridge.execute({
      name: 'proxy.update',
      payload: {
        name: oldName,
        proxy: proxyData
      }
    })

    if (commandResult.status === 'failed') {
      return {
        success: false,
        error: commandResult.error
      }
    }

    return {
      success: true,
      data: commandResult.result
    }
  }
  catch (error) {
    console.error('[API] tunnel.update error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update tunnel'
    return {
      success: false,
      error: {
        code: 'RUNTIME_ERROR',
        message
      }
    }
  }
})
