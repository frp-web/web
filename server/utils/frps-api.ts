/**
 * FRPS Dashboard API utility
 * 用于与 FRPS webServer 接口通信
 */

interface FrpsApiConfig {
  addr: string
  port: number
  user: string
  password: string
}

interface ProxyInfo {
  name: string
  type: string
  tcpMultiplexer?: boolean
  config?: Record<string, any>
}

interface ServerInfo {
  version?: string
  bindPort?: number
  virtualPort?: number
}

interface ProxyStats {
  name?: string
  conns?: number
  trafficIn?: number
  trafficOut?: number
  todayTrafficIn?: number
  todayTrafficOut?: number
  curConns?: number
  status?: string
  clientVersion?: string
  lastStartTime?: string
  lastCloseTime?: string
  conf?: {
    name: string
    type: string
    localIP?: string
    localPort?: number
    remotePort?: number
    customDomains?: string[]
    subdomain?: string
    [key: string]: any
  }
}

interface ProxyWithStats {
  name: string
  type: string
  remotePort: number
  conns: number
  trafficIn: number
  trafficOut: number
  status?: string
  clientVersion?: string
  lastStartTime?: string
  lastCloseTime?: string
}

interface FrpsApiResponse {
  code?: number
  msg?: string
}

// FRPS API 响应结构
interface ProxyTypeResponse extends FrpsApiResponse {
  proxies?: ProxyStats[]
}

/**
 * 从预设配置中读取 dashboard 配置
 */
export async function getFrpsApiConfig(): Promise<FrpsApiConfig | null> {
  const { getPresetConfigPath } = await import('~~/app/constants/paths')
  const { existsSync, readFileSync } = await import('node:fs')
  const process = await import('node:process')

  const mode = process.env.FRP_BRIDGE_MODE as 'server' | 'client'
  if (mode !== 'server') {
    return null
  }

  const presetPath = getPresetConfigPath(mode)

  if (!existsSync(presetPath)) {
    // 返回默认配置
    return {
      addr: '0.0.0.0',
      port: 7500,
      user: 'admin',
      password: 'admin'
    }
  }

  try {
    const content = readFileSync(presetPath, 'utf-8')
    const config = JSON.parse(content)

    // 从预设配置中读取 dashboard 设置
    const dashboardPort = config.dashboardPort || 7500
    const dashboardUser = config.dashboardUser || 'admin'
    const dashboardPassword = config.dashboardPassword || 'admin'

    return {
      addr: '0.0.0.0',
      port: dashboardPort,
      user: dashboardUser,
      password: dashboardPassword
    }
  }
  catch (error) {
    console.error('Failed to read FRPS API config:', error)
    // 返回默认配置
    return {
      addr: '0.0.0.0',
      port: 7500,
      user: 'admin',
      password: 'admin'
    }
  }
}

/**
 * 调用 FRPS API
 */
async function callFrpsApi<T>(endpoint: string, config: FrpsApiConfig): Promise<T | null> {
  const { Buffer } = await import('node:buffer')
  const url = `http://${config.addr}:${config.port}${endpoint}`

  try {
    const credentials = `${config.user}:${config.password}`
    const encoded = Buffer.from(credentials).toString('base64')
    const authHeader = `Basic ${encoded}`

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`FRPS API error: ${response.status} ${response.statusText} - ${url}`)
      return null
    }

    return await response.json() as T
  }
  catch (error) {
    console.error(`Failed to call FRPS API ${endpoint}:`, error)
    return null
  }
}

/**
 * 获取服务器信息
 */
export async function getFrpsServerInfo(): Promise<ServerInfo | null> {
  const config = await getFrpsApiConfig()
  if (!config) {
    return null
  }

  return await callFrpsApi<ServerInfo>('/api/serverinfo', config)
}

/**
 * 获取代理列表（包含统计信息）
 * FRPS API 按类型分别获取：/api/proxy/tcp, /api/proxy/udp, /api/proxy/http, /api/proxy/https 等
 */
export async function getFrpsProxiesWithStats(): Promise<ProxyWithStats[] | null> {
  const config = await getFrpsApiConfig()

  if (!config) {
    return null
  }

  try {
    // 并行获取所有类型的代理数据
    const [tcpResult, udpResult, httpResult, httpsResult, stcpResult, xtcpResult] = await Promise.all([
      callFrpsApi<ProxyTypeResponse>('/api/proxy/tcp', config),
      callFrpsApi<ProxyTypeResponse>('/api/proxy/udp', config),
      callFrpsApi<ProxyTypeResponse>('/api/proxy/http', config),
      callFrpsApi<ProxyTypeResponse>('/api/proxy/https', config),
      callFrpsApi<ProxyTypeResponse>('/api/proxy/stcp', config),
      callFrpsApi<ProxyTypeResponse>('/api/proxy/xtcp', config)
    ])

    // 收集所有代理
    const allProxies: ProxyWithStats[] = []

    // 处理各类型代理数据
    const processProxies = (type: string, proxies?: ProxyStats[]) => {
      if (!proxies)
        return
      for (const proxy of proxies) {
        allProxies.push({
          name: proxy.name || proxy.conf?.name || '',
          type,
          remotePort: proxy.conf?.remotePort || 0,
          conns: proxy.curConns || proxy.conns || 0,
          trafficIn: proxy.todayTrafficIn || proxy.trafficIn || 0,
          trafficOut: proxy.todayTrafficOut || proxy.trafficOut || 0,
          status: proxy.status,
          clientVersion: proxy.clientVersion,
          lastStartTime: proxy.lastStartTime,
          lastCloseTime: proxy.lastCloseTime
        })
      }
    }

    processProxies('tcp', tcpResult?.proxies)
    processProxies('udp', udpResult?.proxies)
    processProxies('http', httpResult?.proxies)
    processProxies('https', httpsResult?.proxies)
    processProxies('stcp', stcpResult?.proxies)
    processProxies('xtcp', xtcpResult?.proxies)

    return allProxies
  }
  catch (error) {
    console.error('Failed to get FRPS proxies with stats:', error)
    return null
  }
}

/**
 * 获取代理列表（不含统计信息）
 */
export async function getFrpsProxies(): Promise<ProxyInfo[] | null> {
  const proxies = await getFrpsProxiesWithStats()
  if (!proxies) {
    return null
  }

  // 移除统计信息，只保留基本信息
  return proxies.map(p => ({
    name: p.name,
    type: p.type,
    config: {
      remotePort: p.remotePort
    }
  }))
}

/**
 * 获取代理统计信息
 */
export async function getFrpsProxyStats(name: string): Promise<ProxyStats | null> {
  const config = await getFrpsApiConfig()
  if (!config) {
    return null
  }

  return await callFrpsApi<ProxyStats>(`/api/proxy/${name}`, config)
}
