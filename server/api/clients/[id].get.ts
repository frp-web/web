import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { getPresetConfigPath } from '~~/app/constants/paths'
import { appStorage } from '~~/app/stores/storages'
import { useFrpBridge } from '~~/server/bridge'

interface FrpsClient {
  key: string
  user: string
  clientID: string
  runID: string
  hostname: string
  clientIP: string
  firstConnectedAt: number
  lastConnectedAt: number
  online: boolean
}

export default defineEventHandler(async (event) => {
  const mode = appStorage.frpMode || 'server'

  if (mode !== 'server') {
    throw createError({
      statusCode: 400,
      message: 'Client detail only available in server mode'
    })
  }

  // 检查 frps 是否运行
  const bridge = useFrpBridge()
  const processManager = bridge.getProcessManager()
  if (!processManager.isRunning()) {
    throw createError({
      statusCode: 503,
      message: 'FRP service is not running'
    })
  }

  // 获取客户端 ID
  const clientId = event.context.params?.id
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const presetPath = getPresetConfigPath(mode)

  // 从预设配置读取 dashboard 设置
  let port = 7500
  let user = 'admin'
  let password = 'admin'

  if (existsSync(presetPath)) {
    try {
      const content = readFileSync(presetPath, 'utf-8')
      const config = JSON.parse(content)

      port = config.dashboardPort || 7500
      user = config.dashboardUser || 'admin'
      password = config.dashboardPassword || 'admin'
    }
    catch {
      // 使用默认值
    }
  }

  try {
    // 调用 FRPS API
    const auth = Buffer.from(`${user}:${password}`).toString('base64')
    const response = await fetch(`http://127.0.0.1:${port}/api/clients/${clientId}`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    })

    if (!response.ok) {
      throw new Error(`FRPS API error: ${response.status} ${response.statusText}`)
    }

    const client = await response.json() as FrpsClient

    return {
      success: true,
      data: client
    }
  }
  catch (error) {
    console.error('[API] client.detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to get client detail'
    throw createError({
      statusCode: 500,
      message
    })
  }
})
