import { createError, defineEventHandler } from 'h3'
import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()

    const wasRunning = processManager.isRunning()

    // 如果正在运行，先停止
    if (wasRunning) {
      await processManager.stop()
    }

    // 启动进程
    await processManager.start()

    return {
      success: true,
      message: 'FRP service restarted successfully',
      status: 'running',
      wasRunning
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to restart FRP service',
      data: error instanceof Error ? error.message : String(error)
    })
  }
})
