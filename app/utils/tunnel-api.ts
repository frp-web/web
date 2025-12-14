import { useConfigStore } from '~/stores/config'

export interface TunnelListResponse {
  success: boolean
  data?: any[]
  error?: { code: string, message: string }
}

export interface TunnelOperationResponse {
  success: boolean
  data?: unknown
  error?: { code: string, message: string }
}

/**
 * 获取隧道列表
 * - Client 模式：获取本地隧道
 * - Server 模式：获取指定节点的隧道
 */
export async function listTunnels(nodeId?: string): Promise<any[]> {
  const configStore = useConfigStore()
  const { frpMode } = configStore

  try {
    let response: TunnelListResponse

    if (frpMode === 'server' && nodeId) {
      response = await $fetch<TunnelListResponse>(`/api/node/${nodeId}/tunnel/list`)
    }
    else {
      response = await $fetch<TunnelListResponse>('/api/config/tunnel/list')
    }

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to list tunnels')
    }

    return response.data || []
  }
  catch (error) {
    console.error('[Tunnel API] List failed:', error)
    throw error
  }
}

/**
 * 添加隧道
 */
export async function addTunnel(config: any, nodeId?: string): Promise<void> {
  const configStore = useConfigStore()
  const { frpMode } = configStore

  try {
    let response: TunnelOperationResponse

    if (frpMode === 'server' && nodeId) {
      response = await $fetch<TunnelOperationResponse>(`/api/node/${nodeId}/tunnel/add`, {
        method: 'POST',
        body: config
      })
    }
    else {
      response = await $fetch<TunnelOperationResponse>('/api/config/tunnel/add', {
        method: 'POST',
        body: config
      })
    }

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add tunnel')
    }
  }
  catch (error) {
    console.error('[Tunnel API] Add failed:', error)
    throw error
  }
}

/**
 * 更新隧道
 */
export async function updateTunnel(
  config: Record<string, any> & { name: string },
  nodeId?: string
): Promise<void> {
  const configStore = useConfigStore()
  const { frpMode } = configStore

  try {
    let response: TunnelOperationResponse

    if (frpMode === 'server' && nodeId) {
      response = await $fetch<TunnelOperationResponse>(`/api/node/${nodeId}/tunnel/update`, {
        method: 'PUT',
        body: config
      })
    }
    else {
      response = await $fetch<TunnelOperationResponse>('/api/config/tunnel/update', {
        method: 'PUT',
        body: config
      })
    }

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update tunnel')
    }
  }
  catch (error) {
    console.error('[Tunnel API] Update failed:', error)
    throw error
  }
}

/**
 * 删除隧道
 */
export async function removeTunnel(name: string, nodeId?: string): Promise<void> {
  const configStore = useConfigStore()
  const { frpMode } = configStore

  try {
    let response: TunnelOperationResponse

    if (frpMode === 'server' && nodeId) {
      response = await $fetch<TunnelOperationResponse>(`/api/node/${nodeId}/tunnel/remove`, {
        method: 'DELETE',
        body: { name }
      })
    }
    else {
      response = await $fetch<TunnelOperationResponse>('/api/config/tunnel/remove', {
        method: 'DELETE',
        body: { name }
      })
    }

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove tunnel')
    }
  }
  catch (error) {
    console.error('[Tunnel API] Remove failed:', error)
    throw error
  }
}

/**
 * 订阅隧道状态变化（SSE）
 */
export function subscribeTunnelEvents(
  nodeId: string | undefined,
  onEvent: (event: { type: string, data: unknown }) => void,
  onError?: (error: Error) => void
): () => void {
  const configStore = useConfigStore()
  const { frpMode } = configStore

  const url = frpMode === 'server' && nodeId ? `/api/node/${nodeId}/tunnel/events` : '/api/config/tunnel/events'

  const eventSource = new EventSource(url)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onEvent({ type: event.type, data })
    }
    catch (error) {
      console.error('[Tunnel API] Event parse error:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('[Tunnel API] SSE error:', error)
    onError?.(new Error('SSE connection error'))
    eventSource.close()
  }

  // 返回取消订阅函数
  return () => eventSource.close()
}
