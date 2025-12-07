import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    // 设置 SSE 响应头
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'X-Accel-Buffering', 'no')

    const response = event.node.res

    // 初始连接消息
    response.write('event: connected\ndata: {"message":"Connected to tunnel event stream"}\n\n')

    // 订阅隧道状态变化事件
    try {
      // 尝试从 bridge 的事件系统获取隧道变化
      const events = bridge.drainEvents?.()
      if (Array.isArray(events)) {
        for (const tunnelEvent of events) {
          try {
            const data = JSON.stringify({
              type: tunnelEvent.type || 'tunnel.status',
              name: (tunnelEvent as any).name,
              status: (tunnelEvent as any).status,
              timestamp: Date.now()
            })
            response.write(`event: tunnel.status\ndata: ${data}\n\n`)
          }
          catch (writeError) {
            console.error('[SSE] Write error:', writeError)
          }
        }
      }
    }
    catch {
      console.warn('[SSE] Event subscription not supported, using heartbeat only')
    }

    // 定期发送心跳保活连接
    const heartbeatInterval = setInterval(() => {
      try {
        response.write(': heartbeat\n\n')
      }
      catch (error) {
        console.error('[SSE] Heartbeat write error:', error)
        clearInterval(heartbeatInterval)
      }
    }, 30000)

    // 处理连接关闭
    response.on('close', () => {
      clearInterval(heartbeatInterval)
    })

    response.on('error', (error: any) => {
      console.error('[SSE] Connection error:', error)
      clearInterval(heartbeatInterval)
    })
  }
  catch (error) {
    console.error('[API] tunnel events error:', error)

    if (!event.node.res.headersSent) {
      const message = error instanceof Error ? error.message : 'Failed to setup event stream'
      return {
        success: false,
        error: {
          code: 'SETUP_ERROR',
          message
        }
      }
    }
  }
})
