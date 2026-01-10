import { createError, defineEventHandler, readBody } from 'h3'
import { useFrpBridge } from '~~/server/bridge'
import { appStorage } from '~~/src/storages'

interface SwitchModeBody {
  frpMode: 'client' | 'server'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SwitchModeBody>(event)

  if (!body?.frpMode || !['client', 'server'].includes(body.frpMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid frpMode'
    })
  }

  const newMode = body.frpMode
  const oldMode = appStorage.frpMode

  // 如果模式相同，直接返回
  if (oldMode === newMode) {
    return {
      success: true,
      message: `Mode is already set to ${newMode}`,
      frpMode: newMode,
      stopped: false
    }
  }

  // 获取当前 bridge 实例（在切换模式之前）
  const oldBridge = useFrpBridge()
  const processManager = oldBridge.getProcessManager()
  let wasRunning = false
  let stopped = false

  // 如果服务正在运行，先停止
  if (processManager.isRunning()) {
    wasRunning = true
    try {
      await processManager.stop()
      stopped = true
      console.warn(`Stopped FRP service before switching mode from ${oldMode} to ${newMode}`)
    }
    catch (error) {
      console.error('Failed to stop FRP service:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to stop FRP service before mode switch',
        data: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // 更新模式
  appStorage.frpMode = newMode

  // 注意：不需要在这里重新创建 bridge 实例
  // 下一次调用 useFrpBridge() 时会自动检测模式变化并重新创建

  return {
    success: true,
    message: wasRunning
      ? `Switched mode from ${oldMode} to ${newMode}, FRP service has been stopped`
      : `Switched mode from ${oldMode} to ${newMode}`,
    frpMode: newMode,
    oldMode,
    wasRunning,
    stopped
  }
})
