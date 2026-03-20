import type { ProcessEvent, ProcessEventType } from 'frp-bridge'
import { defineEventHandler } from 'h3'
import { eventBus, useFrpBridge } from '~~/server/bridge'

// Frontend expects running at top level, not in payload
interface StatusEvent {
  type: 'status' | ProcessEventType
  timestamp: number
  running: boolean
  payload?: {
    pid?: number
    uptime?: number
    startTime?: number
    code?: number
    signal?: string
    error?: string
  }
}

export default defineEventHandler(async (event) => {
  // SSE 流式响应
  const accept = getHeader(event, 'accept')
  if (accept?.includes('text/event-stream')) {
    const stream = createEventStream(event)

    // 发送初始状态
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()
    const isRunning = processManager.isRunning()

    // 使用 queryProcess API 获取进程信息
    const processInfo = isRunning ? processManager.queryProcess() : null

    // 发送初始状态事件（running 在顶层）
    const initialEvent: StatusEvent = {
      type: 'status',
      running: isRunning,
      timestamp: Date.now(),
      payload: processInfo
        ? {
            pid: processInfo.pid,
            uptime: processInfo.uptime,
            startTime: processInfo.startTime
          }
        : undefined
    }

    stream.push(JSON.stringify(initialEvent))

    // 监听所有事件变化，转换为 frontend 格式
    const handler = (frpEvent: ProcessEvent) => {
      // 转换为 frontend 期望的格式（running 在顶层）
      const statusEvent: StatusEvent = {
        type: frpEvent.type,
        running: frpEvent.payload?.running ?? frpEvent.type === 'process:started',
        timestamp: frpEvent.timestamp,
        payload: frpEvent.payload
      }
      try {
        stream.push(JSON.stringify(statusEvent))
      }
      catch {
        // Stream closed, ignore
      }
    }

    eventBus.on('frp-event', handler)

    // 清理监听器
    stream.onClosed(() => {
      eventBus.off('frp-event', handler)
    })

    return stream.send()
  }

  // 普通 HTTP 请求,返回当前状态
  try {
    const bridge = useFrpBridge()
    const processManager = bridge.getProcessManager()
    const isRunning = processManager.isRunning()

    const processInfo = processManager.queryProcess()

    return {
      running: isRunning,
      status: isRunning ? 'running' : 'stopped',
      pid: processInfo?.pid,
      uptime: processInfo?.uptime,
      startTime: processInfo?.startTime
    }
  }
  catch (error) {
    console.error('[Status API] Error:', error)
    return {
      running: false,
      status: 'stopped',
      error: error instanceof Error ? error.message : String(error)
    }
  }
})
