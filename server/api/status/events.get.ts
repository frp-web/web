import { defineEventHandler } from 'h3'
import { eventBus, useFrpBridge } from '~~/server/bridge'

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
    let initialPayload: any = {}
    if (isRunning) {
      try {
        const processInfo = processManager.queryProcess()
        initialPayload = {
          pid: processInfo.pid,
          uptime: processInfo.uptime
        }
      }
      catch (error) {
        console.warn('Failed to query process info:', error)
      }
    }

    // 发送初始状态事件
    const initialEvent = {
      type: 'status',
      running: isRunning,
      timestamp: Date.now(),
      payload: initialPayload
    }

    stream.push(JSON.stringify(initialEvent))

    // 监听所有事件变化（通用事件处理器）
    const handler = (frpEvent: any) => {
      try {
        stream.push(JSON.stringify(frpEvent))
      }
      catch (error) {
        console.error('Error handling SSE event:', error)
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

    return {
      running: isRunning,
      status: isRunning ? 'running' : 'stopped'
    }
  }
  catch (error) {
    return {
      running: false,
      status: 'stopped',
      error: error instanceof Error ? error.message : String(error)
    }
  }
})
