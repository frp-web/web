/**
 * 保存预设配置
 * POST /api/config/preset
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getConfigDir } from '~~/app/constants/paths'
import { generateFrpConfig, useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { type, config, restart = true } = body

  if (!type || !['frps', 'frpc'].includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid type, must be frps or frpc'
    })
  }

  if (!config || typeof config !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid config object'
    })
  }

  try {
    const configDir = getConfigDir()
    const configPath = join(configDir, `${type}-preset.json`)

    // 使用异步文件操作
    await mkdir(configDir, { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')

    // 使用 frp-bridge 保存预设配置并重启
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()

    // 如果需要重启，先停止进程
    if (restart && processManager.isRunning()) {
      await processManager.stop()
    }

    // 重新生成配置文件（进程停止后）
    await generateFrpConfig()

    // 启动进程
    if (restart) {
      await processManager.start()
    }

    return {
      success: true,
      type,
      message: `${type.toUpperCase()} preset config saved successfully`,
      restarted: restart && processManager.isRunning()
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to save preset config: ${error.message}`
    })
  }
})
