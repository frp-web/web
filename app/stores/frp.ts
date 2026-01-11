import type { ProxyConfig } from 'frp-bridge'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

// 配置 Day.js
dayjs.extend(duration)

export const useFrpStore = defineStore('frp', () => {
  // FRP 状态相关
  const isRunning = ref(false)
  const loading = ref(true)

  // 隧道管理
  const tunnels = ref<ProxyConfig[]>([])
  const tunnelLoading = ref(false)
  const tunnelError = ref<string | null>(null)

  // 进程信息
  const processInfo = ref<{
    pid?: number
    uptime?: number
    startTime?: number
  } | null>(null)

  // 实时计算的 uptime
  const currentUptime = ref(0)
  let uptimeTimer: NodeJS.Timeout | null = null

  // SSE 连接
  let eventSource: EventSource | null = null
  let tunnelEventSource: EventSource | null = null

  // FRP 状态文本
  const frpStatusText = computed(() => {
    const { t } = useI18n()
    return isRunning.value ? t('frp.status.running') : t('frp.status.stopped')
  })

  // FRP 状态徽章状态
  const frpStatusBadgeStatus = computed(() => {
    return isRunning.value ? 'success' : 'default'
  })

  // FRP 状态指示器颜色类
  const frpStatusIndicatorClass = computed(() => {
    return isRunning.value ? 'bg-success' : 'bg-warning'
  })

  // 运行时间文本
  const uptimeText = computed(() => {
    if (!isRunning.value || currentUptime.value <= 0) {
      return ''
    }

    const { t } = useI18n()

    // 使用 dayjs 格式化持续时间
    const dur = dayjs.duration(currentUptime.value)
    const days = Math.floor(dur.asDays())
    const hours = dur.hours()
    const minutes = dur.minutes()
    const seconds = dur.seconds()

    if (days > 0) {
      return `${days}${t('frp.uptime.days')} ${hours}${t('frp.uptime.hours')}`
    }
    else if (hours > 0) {
      return `${hours}${t('frp.uptime.hours')} ${minutes}${t('frp.uptime.minutes')}`
    }
    else if (minutes > 0) {
      return `${minutes}${t('frp.uptime.minutes')} ${seconds}${t('frp.uptime.seconds')}`
    }
    else {
      return `${seconds}${t('frp.uptime.seconds')}`
    }
  })

  // 启动运行时间计时器
  function startUptimeTimer() {
    stopUptimeTimer()
    // 记录启动计时器时的时间戳和初始 uptime
    const startTimerAt = Date.now()
    const initialUptime = currentUptime.value

    // 启动计时器每秒更新运行时间
    uptimeTimer = setInterval(() => {
      currentUptime.value = initialUptime + (Date.now() - startTimerAt)
    }, 1000)
  }

  // 停止运行时间计时器
  function stopUptimeTimer() {
    if (uptimeTimer) {
      clearInterval(uptimeTimer)
      uptimeTimer = null
    }
  }

  // 连接 SSE
  function connectSSE() {
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource('/api/status/frp')

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        switch (data.type) {
          case 'status':
          case 'process:started':
          case 'process:restart':
            isRunning.value = data.running
            // 从 payload 中提取进程信息
            if (data.payload?.pid) {
              const uptime = data.payload.uptime || 0
              processInfo.value = {
                pid: data.payload.pid,
                uptime,
                startTime: data.timestamp
              }
              currentUptime.value = uptime || Date.now() - data.timestamp
              // 启动 uptime 计时器以保持时间更新
              startUptimeTimer()
            }
            break
          case 'process:stopped':
          case 'process:exited':
            isRunning.value = false
            processInfo.value = null
            currentUptime.value = 0
            stopUptimeTimer()
            break
          case 'process:error':
            console.error('FRP 错误:', data.payload?.error)
            break
        }

        // 首次获取状态后关闭loading
        if (loading.value) {
          loading.value = false
        }
      }
      catch (error) {
        console.error('解析 SSE 数据失败:', error)
      }
    }

    eventSource.onerror = () => {
      // SSE 连接错误
      isRunning.value = false
      processInfo.value = null
      currentUptime.value = 0
      stopUptimeTimer()

      // 首次获取状态失败后关闭loading
      if (loading.value) {
        loading.value = false
      }
    }
  }

  // 断开 SSE 连接
  function disconnectSSE() {
    eventSource?.close()
    eventSource = null
    stopUptimeTimer()
  }

  // 启动 FRP 服务
  async function startFrp() {
    try {
      // 调用实际的启动 API
      await $fetch('/api/commands/start', { method: 'POST' })
    }
    catch (error) {
      console.error('启动 FRP 失败:', error)
      throw error
    }
  }

  // 停止 FRP 服务
  async function stopFrp() {
    try {
      // 调用实际的停止 API
      await $fetch('/api/commands/stop', { method: 'POST' })
    }
    catch (error) {
      console.error('停止 FRP 失败:', error)
      throw error
    }
  }

  // 重启 FRP 服务
  async function restartFrp() {
    try {
      // 调用实际的重启 API
      await $fetch('/api/commands/restart', { method: 'POST' })
    }
    catch (error) {
      console.error('重启 FRP 失败:', error)
      throw error
    }
  }

  // 初始化
  function init() {
    connectSSE()
  }

  // 隧道管理方法

  /**
   * 获取隧道列表
   */
  async function fetchTunnels(nodeId?: string) {
    tunnelLoading.value = true
    tunnelError.value = null

    try {
      const { listTunnels } = await import('~/utils/tunnel-api')
      tunnels.value = await listTunnels(nodeId)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tunnels'
      tunnelError.value = message
      console.error('[Store] Fetch tunnels error:', error)
    }
    finally {
      tunnelLoading.value = false
    }
  }

  /**
   * 添加隧道
   */
  async function addTunnel(config: ProxyConfig, nodeId?: string) {
    try {
      const { addTunnel: apiAddTunnel } = await import('~/utils/tunnel-api')
      await apiAddTunnel(config, nodeId)
      // 刷新隧道列表
      await fetchTunnels(nodeId)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add tunnel'
      tunnelError.value = message
      console.error('[Store] Add tunnel error:', error)
      throw error
    }
  }

  /**
   * 更新隧道
   */
  async function updateTunnel(
    config: Partial<ProxyConfig> & { name: string },
    nodeId?: string
  ) {
    try {
      const { updateTunnel: apiUpdateTunnel } = await import('~/utils/tunnel-api')
      await apiUpdateTunnel(config, nodeId)
      // 刷新隧道列表
      await fetchTunnels(nodeId)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tunnel'
      tunnelError.value = message
      console.error('[Store] Update tunnel error:', error)
      throw error
    }
  }

  /**
   * 删除隧道
   */
  async function removeTunnel(name: string, nodeId?: string) {
    try {
      const { removeTunnel: apiRemoveTunnel } = await import('~/utils/tunnel-api')
      await apiRemoveTunnel(name, nodeId)
      // 刷新隧道列表
      await fetchTunnels(nodeId)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove tunnel'
      tunnelError.value = message
      console.error('[Store] Remove tunnel error:', error)
      throw error
    }
  }

  /**
   * 订阅隧道状态变化（SSE）
   */
  async function subscribeTunnelEvents(nodeId?: string) {
    if (tunnelEventSource) {
      tunnelEventSource.close()
    }

    try {
      const { subscribeTunnelEvents: apiSubscribeTunnelEvents } = await import('~/utils/tunnel-api')
      const unsubscribe = apiSubscribeTunnelEvents(
        nodeId,
        (event) => {
          // 处理隧道状态变化事件
          if (event.type === 'tunnel.status' || event.type === 'tunnel.list') {
            // 可选：自动刷新隧道列表
            fetchTunnels(nodeId)
          }
        },
        (error) => {
          console.error('[Store] Tunnel event error:', error)
          tunnelError.value = error.message
        }
      )

      // 保存取消订阅函数供后续使用
      tunnelEventSource = { close: unsubscribe } as any
    }
    catch (error) {
      console.error('[Store] Subscribe tunnel events error:', error)
    }
  }

  /**
   * 断开隧道事件连接
   */
  function unsubscribeTunnelEvents() {
    if (tunnelEventSource) {
      tunnelEventSource.close()
      tunnelEventSource = null
    }
  }

  return {
    // 状态
    isRunning,
    loading,
    processInfo,
    currentUptime,

    // 隧道管理状态
    tunnels,
    tunnelLoading,
    tunnelError,

    // 计算属性
    frpStatusText,
    frpStatusBadgeStatus,
    frpStatusIndicatorClass,
    uptimeText,

    // 方法
    init,
    disconnectSSE,
    startFrp,
    stopFrp,
    restartFrp,
    fetchTunnels,
    addTunnel,
    updateTunnel,
    removeTunnel,
    subscribeTunnelEvents,
    unsubscribeTunnelEvents
  }
})
