import { defineEventHandler } from 'h3'
import { eventBus, useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  // 如果请求头包含 text/event-stream,返回 SSE 流
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
      type: isRunning ? 'process:started' : 'status',
      running: isRunning,
      timestamp: Date.now(),
      payload: initialPayload
    }

    stream.push(JSON.stringify(initialEvent))

    // 监听 FRP 事件变化
    const handler = (frpEvent: any) => {
      try {
        if (frpEvent.type?.startsWith('process:')) {
          // 实时获取最新状态
          const currentRunning = processManager.isRunning()

          stream.push(JSON.stringify({
            type: frpEvent.type,
            running: currentRunning,
            timestamp: frpEvent.timestamp,
            payload: frpEvent.payload
          }))
        }
      }
      catch (error) {
        console.error('Error handling FRP event:', error)
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
