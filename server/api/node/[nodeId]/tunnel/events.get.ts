import { useFrpBridge } from '~~/server/bridge'

export default defineEventHandler(async (event) => {
  try {
    const nodeId = getRouterParam(event, 'nodeId')

    if (!nodeId) {
      throw createError({
        statusCode: 400,
        message: 'Missing nodeId parameter'
      })
    }

    const bridge = useFrpBridge()

    if (!bridge) {
      throw createError({
        statusCode: 500,
        message: 'FrpBridge not initialized'
      })
    }

    const rpcServer = bridge.getRpcServer?.()

    if (!rpcServer) {
      throw createError({
        statusCode: 500,
        message: 'Not in server mode'
      })
    }

    // 设置 SSE 响应头
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'X-Accel-Buffering', 'no')

    const response = event.node.res

    // 初始连接消息
    response.write(`event: connected\ndata: {"message":"Connected to node ${nodeId} tunnel event stream"}\n\n`)

    // 定期轮询获取隧道列表（因为 RPC 没有主动推送机制）
    let isPolling = true
    let lastTunnels: any[] = []

    const pollInterval = setInterval(async () => {
      if (!isPolling) {
        return
      }

      try {
        const currentTunnels = await rpcServer.rpcCall(nodeId, 'tunnel.list', {}, 30000)

        // 比较变化
        if (JSON.stringify(currentTunnels) !== JSON.stringify(lastTunnels)) {
          const data = JSON.stringify({
            tunnels: currentTunnels || [],
            timestamp: Date.now()
          })
          response.write(`event: tunnel.list\ndata: ${data}\n\n`)
          lastTunnels = (currentTunnels as any[]) || []
        }
      }
      catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Polling error'
        console.error(`[SSE] Node ${nodeId} polling error:`, errorMsg)

        // 如果节点离线，发送错误事件
        if (errorMsg.includes('not connected') || errorMsg.includes('timeout')) {
          response.write(`event: error\ndata: {"type":"NODE_OFFLINE","message":"Node ${nodeId} is offline"}\n\n`)
        }
      }
    }, 10000) // 每 10 秒轮询一次

    // 定期发送心跳保活连接
    const heartbeatInterval = setInterval(() => {
      try {
        response.write(': heartbeat\n\n')
      }
      catch (error) {
        console.error('[SSE] Heartbeat write error:', error)
        isPolling = false
        clearInterval(heartbeatInterval)
        clearInterval(pollInterval)
      }
    }, 30000)

    // 处理连接关闭
    response.on('close', () => {
      isPolling = false
      clearInterval(heartbeatInterval)
      clearInterval(pollInterval)
    })

    response.on('error', (error: any) => {
      console.error('[SSE] Connection error:', error)
      isPolling = false
      clearInterval(heartbeatInterval)
      clearInterval(pollInterval)
    })
  }
  catch (error) {
    console.error('[API] node tunnel events error:', error)

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
