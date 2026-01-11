import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const { getConfigPath } = await import('~~/app/constants/paths')
  const parseToml = await import('@iarna/toml')
  const { existsSync, readFileSync } = await import('node:fs')
  const { Buffer } = await import('node:buffer')
  const process = await import('node:process')

  const mode = process.env.FRP_BRIDGE_MODE as 'server' | 'client'
  if (mode !== 'server') {
    return {
      success: false,
      error: 'Not in server mode',
      data: []
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
  const validTypes = ['tcp', 'udp', 'http', 'https', 'stcp', 'xtcp']
  if (!validTypes.includes(proxyType)) {
    return {
      success: false,
      error: `Invalid proxy type: ${proxyType}`,
      data: []
    }
  }

  const configPath = getConfigPath(mode)

  if (!existsSync(configPath)) {
    return {
      success: false,
      error: 'Config file not found',
      data: []
    }
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const config = parseToml.default.parse(content)

    const webServer = (config as any).webServer
    if (!webServer) {
      return {
        success: false,
        error: 'webServer config not found',
        data: []
      }
    }

    const addr = webServer.addr || '127.0.0.1'
    const port = webServer.port || 7500
    const user = webServer.user || 'admin'
    const password = webServer.password || 'admin'

    // 获取 Basic Auth 认证头
    const credentials = `${user}:${password}`
    const encoded = Buffer.from(credentials).toString('base64')
    const authHeader = `Basic ${encoded}`

    // 调用 FRPS API
    const url = `http://${addr}:${port}/api/proxy/${proxyType}`
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`FRPS API error: ${response.status} ${response.statusText}`)
      return {
        success: false,
        error: `FRPS API error: ${response.status}`,
        data: []
      }
    }

    const result = await response.json()

    if (!result.proxies) {
      return {
        success: true,
        data: []
      }
    }

    // 格式化数据
    const formattedData = result.proxies.map((proxy: any) => ({
      name: proxy.name || proxy.conf?.name || '',
      type: proxyType,
      remotePort: proxy.conf?.remotePort || 0,
      localPort: proxy.conf?.localPort || 0,
      localIP: proxy.conf?.localIP || '127.0.0.1',
      conns: proxy.curConns || proxy.conns || 0,
      trafficIn: proxy.todayTrafficIn || proxy.trafficIn || 0,
      trafficOut: proxy.todayTrafficOut || proxy.trafficOut || 0,
      status: proxy.status || 'unknown',
      clientVersion: proxy.clientVersion || '',
      lastStartTime: proxy.lastStartTime || '',
      lastCloseTime: proxy.lastCloseTime || '',
      conf: proxy.conf
    }))

    return {
      success: true,
      data: formattedData
    }
  }
  catch (error) {
    console.error('Failed to get proxy list:', error)
    return {
      success: false,
      error: 'Failed to get proxy list',
      data: []
    }
  }
})
