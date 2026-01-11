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

    // 添加隧道到本地 FRP 进程
    const commandResult = await bridge.execute({
      name: 'proxy.add',
      payload: { proxy: body }
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
    console.error('[API] tunnel.add error:', error)
    const message = error instanceof Error ? error.message : 'Failed to add tunnel'
    return {
      success: false,
      error: {
        code: 'RUNTIME_ERROR',
        message
      }
    }
  }
})
