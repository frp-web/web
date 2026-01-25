import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

// 配置 Day.js
dayjs.extend(duration)

interface FrpDownloadProgress {
  stage: 'check' | 'downloading' | 'extracting' | 'complete' | 'error' | 'up-to-date'
  version?: string
  progress?: number
  message?: string
  error?: string
}

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

  // FRP 下载进度
  const downloadProgress = ref<FrpDownloadProgress | null>(null)

  // SSE 连接
  let eventSource: EventSource | null = null

  // FRP 状态文本
  const frpStatusText = computed(() => {
    // 返回 i18n key 而不是翻译后的文本，由组件负责翻译
    return isRunning.value ? 'frp.status.running' : 'frp.status.stopped'
  })

  // FRP 状态徽章状态
  const frpStatusBadgeStatus = computed(() => {
    return isRunning.value ? 'success' : 'default'
  })

  // FRP 状态指示器颜色类
  const frpStatusIndicatorClass = computed(() => {
    return isRunning.value ? 'bg-success' : 'bg-warning'
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

    eventSource = new EventSource('/api/status/events')

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
          // FRP 下载进度事件
          case 'frp:check':
            downloadProgress.value = { stage: 'check', message: data.payload?.message }
            break
          case 'frp:checked':
            downloadProgress.value = {
              stage: 'complete',
              version: data.payload?.version,
              message: data.payload?.message
            }
            break
          case 'frp:up-to-date':
            downloadProgress.value = {
              stage: 'up-to-date',
              version: data.payload?.version,
              message: data.payload?.message
            }
            break
          case 'frp:download-start':
            downloadProgress.value = {
              stage: 'downloading',
              version: data.payload?.version,
              progress: 0,
              message: data.payload?.message
            }
            break
          case 'frp:downloading':
          case 'frp:download-progress':
            downloadProgress.value = {
              stage: 'downloading',
              version: data.payload?.version,
              progress: data.payload?.progress || 0,
              message: data.payload?.message
            }
            break
          case 'frp:download-complete':
            downloadProgress.value = {
              stage: 'extracting',
              version: data.payload?.version,
              message: data.payload?.message
            }
            break
          case 'frp:complete':
            downloadProgress.value = {
              stage: 'complete',
              version: data.payload?.version,
              message: data.payload?.message
            }
            break
          case 'frp:error':
            downloadProgress.value = {
              stage: 'error',
              message: data.payload?.message,
              error: data.payload?.error
            }
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
      const result = await $fetch<{ success: boolean, status: string, data?: { pid?: number, uptime?: number } }>('/api/commands/start', { method: 'POST' })

      // 立即更新状态，使用 API 返回的数据
      if (result.success && result.data?.pid) {
        isRunning.value = true
        const uptime = result.data.uptime || 0
        processInfo.value = {
          pid: result.data.pid,
          uptime,
          startTime: Date.now()
        }
        currentUptime.value = uptime
        startUptimeTimer()
      }
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
    downloadProgress,

    // 计算属性
    frpStatusText,
    frpStatusBadgeStatus,
    frpStatusIndicatorClass,

    // 方法
    init,
    disconnectSSE,
    startFrp,
    stopFrp,
    restartFrp
  }
})
