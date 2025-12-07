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
    const result = await bridge.execute({
      name: 'proxy.add',
      payload: body
    })

    return {
      success: true,
      data: result
    }
  }
  catch (error) {
    console.error('[API] tunnel.add error:', error)
    const message = error instanceof Error ? error.message : 'Failed to add tunnel'
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message
      }
    }
  }
})
