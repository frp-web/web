import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

// 配置 Day.js
dayjs.extend(duration)

export const useFrpStore = defineStore('frp', () => {
  // FRP 状态相关
  const isRunning = ref(false)
  const loading = ref(true)

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

  // FRP 状态文本
  const frpStatusText = computed(() => {
    return isRunning.value ? '运行中' : '已停止'
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

    // 使用 dayjs 格式化持续时间
    const dur = dayjs.duration(currentUptime.value)
    const days = Math.floor(dur.asDays())
    const hours = dur.hours()
    const minutes = dur.minutes()
    const seconds = dur.seconds()

    if (days > 0) {
      return `${days}天 ${hours}小时`
    }
    else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`
    }
    else if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`
    }
    else {
      return `${seconds}秒`
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

  return {
    // 状态
    isRunning,
    loading,
    processInfo,
    currentUptime,

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
    restartFrp
  }
})
