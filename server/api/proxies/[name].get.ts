import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { getPresetConfigPath } from '~~/app/constants/paths'
import { appStorage } from '~~/app/stores/storages'
import { useFrpBridge } from '~~/server/bridge'

interface FrpsProxyDetail {
  name: string
  conf: {
    name: string
    type: string
    transport?: {
      bandwidthLimit?: string
      bandwidthLimitMode?: string
    }
    loadBalancer?: {
      group?: string
    }
    healthCheck?: {
      type?: string
      intervalSeconds?: number
    }
    localIP?: string
    localPort?: number
    remotePort?: number
    plugin?: any
    [key: string]: any
  }
  clientID: string
  clientVersion: string
  todayTrafficIn: number
  todayTrafficOut: number
  curConns: number
  lastStartTime: string
  lastCloseTime: string
  status: string
}

export default defineEventHandler(async (event) => {
  const mode = appStorage.frpMode || 'server'

  if (mode !== 'server') {
    throw createError({
      statusCode: 400,
      message: 'Proxy detail only available in server mode'
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

  // 获取代理名称
  const proxyName = event.context.params?.name
  if (!proxyName) {
    throw createError({
      statusCode: 400,
      message: 'Proxy name is required'
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
    const response = await fetch(`http://127.0.0.1:${port}/api/proxies/${proxyName}`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw createError({
          statusCode: 404,
          message: 'Proxy not found'
        })
      }
      throw new Error(`FRPS API error: ${response.status} ${response.statusText}`)
    }

    const proxy = await response.json() as FrpsProxyDetail

    return {
      success: true,
      data: proxy
    }
  }
  catch (error) {
    console.error('[API] proxy.detail error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Failed to get proxy detail'
    throw createError({
      statusCode: 500,
      message
    })
  }
})
