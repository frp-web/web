<template>
  <header b="0 b-1 solid" h-12 w-full flex-shrink-0 border-base bg-container>
    <div h-full fbc px-4 color-base>
      <div flex="~ items-center gap-2" text-lg font-thin>
        <span>FRP Web</span>
        <AntTooltip>
          <template #title>
            <div>
              <div>{{ serviceStatusText }}</div>
              <div>{{ processIdText }}</div>
              <div>{{ runningTimeText }}</div>
            </div>
          </template>
          <span :class="statusClass" inline-block h-2 w-2 rounded-full transition-colors />
        </AntTooltip>
      </div>
      <div flex="~ items-center gap-4">
        <ThemeToggle />
        <AntDropdown>
          <span cursor-pointer color-secondary transition hover:color-base>
            {{ authStore.username }}
          </span>
          <template #overlay>
            <AntMenu>
              <AntMenuItem key="github">
                <a
                  href="https://github.com/frp-web/web"
                  target="_blank"
                  rel="noopener noreferrer"
                  flex="~ items-center gap-2"
                  text-inherit
                  no-underline
                >
                  <span i-carbon-logo-github />
                  GitHub
                </a>
              </AntMenuItem>
              <AntMenuItem key="logout" @click="handleLogout">
                <span flex="~ items-center gap-2">
                  <span i-carbon-logout />
                  退出登录
                </span>
              </AntMenuItem>
            </AntMenu>
          </template>
        </AntDropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useAuthStore } from '~/stores/auth'

import 'dayjs/locale/zh-cn'

// 配置 Day.js
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const authStore = useAuthStore()
const router = useRouter()

// 服务状态
const isRunning = ref(false)
const processInfo = ref<{
  pid?: number
  uptime?: number
  startTime?: number
} | null>(null)

// 实时计算的 uptime
const currentUptime = ref(0)
let uptimeTimer: NodeJS.Timeout | null = null

const statusClass = computed(() => isRunning.value ? 'bg-success' : 'bg-warning')

const serviceStatusText = computed(() => {
  return isRunning.value ? '服务运行中' : '服务未启动'
})

const processIdText = computed(() => {
  if (!isRunning.value || !processInfo.value?.pid) {
    return ''
  }
  return `PID: ${processInfo.value.pid}`
})

const runningTimeText = computed(() => {
  if (!isRunning.value || currentUptime.value <= 0) {
    return ''
  }
  const uptimeStr = formatUptime(currentUptime.value)
  return `运行时间: ${uptimeStr}`
})

// 格式化运行时间
function formatUptime(ms: number): string {
  const dur = dayjs.duration(ms)
  const days = dur.days()
  const hours = dur.hours()
  const minutes = dur.minutes()
  const seconds = dur.seconds()

  if (days > 0) {
    return `${days}天 ${hours}小时`
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟 ${seconds}秒`
  }
  return `${seconds}秒`
}

// SSE 连接
let eventSource: EventSource | null = null

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
          // 如果是异常退出,显示提示
          if (data.payload?.code && data.payload.code !== 0) {
            console.warn('FRP 服务异常退出', data.payload)
          }
          break
        case 'process:error':
          console.error('FRP 错误:', data.payload?.error)
          break
      }
    }
    catch (error) {
      console.error('解析 SSE 数据失败:', error)
    }
  }

  eventSource.onerror = () => {
    // SSE 连接错误，3 秒后重连
    isRunning.value = false
    processInfo.value = null
    currentUptime.value = 0
    stopUptimeTimer()
    setTimeout(connectSSE, 3000)
  }
}

// 启动 uptime 计时器
function startUptimeTimer() {
  stopUptimeTimer()
  // 启动计时器每秒更新运行时间
  uptimeTimer = setInterval(() => {
    if (processInfo.value?.startTime) {
      currentUptime.value = Date.now() - processInfo.value.startTime
    }
    else if (processInfo.value?.uptime) {
      // 如果有初始 uptime，则继续累加
      currentUptime.value = processInfo.value.uptime + (Date.now() - (processInfo.value.startTime || Date.now()))
    }
  }, 1000)
}

// 停止 uptime 计时器
function stopUptimeTimer() {
  if (uptimeTimer) {
    clearInterval(uptimeTimer)
    uptimeTimer = null
  }
}

// 初始化和清理
onMounted(() => {
  connectSSE()
})

onBeforeUnmount(() => {
  eventSource?.close()
  eventSource = null
  stopUptimeTimer()
})

async function handleLogout() {
  authStore.logout()
  await router.push('/login')
}
</script>
