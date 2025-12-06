import { createError, defineEventHandler } from 'h3'
import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()

    // 检查是否已经停止
    if (!processManager.isRunning()) {
      return {
        success: true,
        message: 'FRP service is already stopped',
        status: 'stopped'
      }
    }

    // 停止 FRP 进程
    await processManager.stop()

    return {
      success: true,
      message: 'FRP service stopped successfully',
      status: 'stopped'
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to stop FRP service',
      data: error instanceof Error ? error.message : String(error)
    })
  }
})
