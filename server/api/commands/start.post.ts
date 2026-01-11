import { createError, defineEventHandler } from 'h3'
import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async () => {
  try {
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()

    // 检查是否已经在运行
    if (processManager.isRunning()) {
      const processInfo = processManager.queryProcess()
      return {
        success: true,
        message: 'FRP service is already running',
        status: 'running',
        data: {
          pid: processInfo.pid,
          uptime: processInfo.uptime
        }
      }
    }

    // 启动 FRP 进程
    await processManager.start()

    // 获取进程信息
    const processInfo = processManager.queryProcess()

    return {
      success: true,
      message: 'FRP service started successfully',
      status: 'running',
      data: {
        pid: processInfo.pid,
        uptime: processInfo.uptime
      }
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start FRP service',
      data: error instanceof Error ? error.message : String(error)
    })
  }
})
