import { useFrpStore } from '~/stores/frp'

/**
 * 应用初始化管理器
 * 统一管理所有需要在应用启动时初始化的逻辑
 */
export class AppInitializer {
  private static initialized = false

  /**
   * 初始化应用
   * 该方法应该在整个应用启动时调用一次
   */
  static init() {
    // 防止重复初始化
    if (this.initialized) {
      return
    }

    // 初始化 FRP 状态管理
    this.initFrpStore()

    // 标记为已初始化
    this.initialized = true
  }

  /**
   * 初始化 FRP 状态管理
   * 建立 SSE 连接以获取实时状态
   */
  private static initFrpStore() {
    const frpStore = useFrpStore()
    frpStore.init()
  }

  /**
   * 清理应用资源
   * 该方法应该在应用关闭时调用
   */
  static cleanup() {
    // 清理 FRP 状态管理资源
    this.cleanupFrpStore()

    // 重置初始化状态
    this.initialized = false
  }

  /**
   * 清理 FRP 状态管理资源
   */
  private static cleanupFrpStore() {
    const frpStore = useFrpStore()
    frpStore.disconnectSSE()
  }
}
