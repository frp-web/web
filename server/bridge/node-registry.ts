import type { NodeInfo } from 'frp-bridge/types'

interface RegisteredNode extends NodeInfo {
  lastSeen: number
  connectedAt: number
}

/**
 * In-memory node registry
 * Tracks all nodes that have ever registered with the server
 */
class NodeRegistry {
  private readonly nodes = new Map<string, RegisteredNode>()

  register(nodeId: string, info: NodeInfo): void {
    const existing = this.nodes.get(nodeId)
    const now = Date.now()

    if (existing) {
      // Update last seen time
      existing.lastSeen = now
      // Update info fields
      Object.assign(existing, info)
    }
    else {
      // New node registration
      this.nodes.set(nodeId, {
        ...info,
        id: nodeId,
        lastSeen: now,
        connectedAt: now
      })
    }
  }

  getAll(): RegisteredNode[] {
    return Array.from(this.nodes.values())
  }

  get(nodeId: string): RegisteredNode | undefined {
    return this.nodes.get(nodeId)
  }

  updateOnlineStatus(onlineNodeIds: string[]): RegisteredNode[] {
    const now = Date.now()
    const onlineSet = new Set(onlineNodeIds)

    return this.getAll().map(node => ({
      ...node,
      isOnline: onlineSet.has(node.id),
      hasActiveConnection: onlineSet.has(node.id),
      lastSeen: onlineSet.has(node.id) ? now : node.lastSeen
    }))
  }

  clear(): void {
    this.nodes.clear()
  }
}

// Singleton instance
export const nodeRegistry = new NodeRegistry()
