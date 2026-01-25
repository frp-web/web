import { existsSync, unlinkSync } from 'node:fs'
import { createError, defineEventHandler } from 'h3'
import { getRunConfigPath } from '~~/app/constants/paths'
import { generateFrpConfig, useFrpBridge } from '~~/server/bridge'
import { appStorage } from '~~/src/storages'

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

    // 启动前先生成配置文件（合并预设配置和用户 tunnels）
    // 删除运行配置以确保使用最新的预设配置
    const runConfigPath = getRunConfigPath(appStorage.frpMode || 'server')
    if (existsSync(runConfigPath)) {
      unlinkSync(runConfigPath)
    }
    await generateFrpConfig()

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
