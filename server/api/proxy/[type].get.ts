import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { getPresetConfigPath } from '~~/app/constants/paths'
import { appStorage } from '~~/app/stores/storages'
import { useFrpBridge } from '~~/server/bridge'

interface FrpsProxy {
  name: string
  conf: {
    name: string
    type: string
    localIP: string
    localPort?: number
    remotePort?: number
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

interface FrpsProxyResponse {
  proxies: FrpsProxy[]
}

export default defineEventHandler(async (event) => {
  const mode = appStorage.frpMode || 'server'

  if (mode !== 'server') {
    return {
      success: false,
      error: 'Not in server mode',
      data: []
    }
  }

  // 检查 frps 是否运行
  const bridge = useFrpBridge()
  const processManager = bridge.getProcessManager()
  if (!processManager.isRunning()) {
    return {
      success: true,
      data: [],
      message: 'FRP service is not running'
    }
  }

  // 获取代理类型
  const proxyType = event.context.params?.type
  if (!proxyType) {
    return {
      success: false,
      error: 'Proxy type is required',
      data: []
    }
  }

  // 验证类型是否有效
  const validTypes = ['tcp', 'udp', 'http', 'https', 'stcp', 'xtcp', 'sudp', 'tcpmux']
  if (!validTypes.includes(proxyType)) {
    return {
      success: false,
      error: `Invalid proxy type: ${proxyType}`,
      data: []
    }
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
    const response = await fetch(`http://127.0.0.1:${port}/api/proxy/${proxyType}`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    })

    if (!response.ok) {
      throw new Error(`FRPS API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json() as FrpsProxyResponse

    if (!result.proxies || result.proxies.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // 格式化数据
    const formattedData = result.proxies.map(proxy => ({
      name: proxy.name,
      type: proxyType,
      remotePort: proxy.conf?.remotePort || 0,
      localPort: proxy.conf?.localPort || 0,
      localIP: proxy.conf?.localIP || '127.0.0.1',
      curConns: proxy.curConns,
      todayTrafficIn: proxy.todayTrafficIn,
      todayTrafficOut: proxy.todayTrafficOut,
      status: proxy.status,
      clientID: proxy.clientID,
      clientVersion: proxy.clientVersion,
      lastStartTime: proxy.lastStartTime,
      lastCloseTime: proxy.lastCloseTime,
      conf: proxy.conf
    }))

    return {
      success: true,
      data: formattedData
    }
  }
  catch (error) {
    console.error('[API] proxy.list error:', error)
    // 返回空数据而不是错误
    return {
      success: true,
      data: [],
      message: 'Failed to fetch proxies, service may not be running'
    }
  }
})
