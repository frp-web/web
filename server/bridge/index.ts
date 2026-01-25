import type { RuntimeMode } from 'frp-bridge/runtime'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { FrpBridge, saveFrpConfigFile } from 'frp-bridge'
import { getBinDir, getConfigDir, getConfigPath, getWorkDir } from '~~/app/constants/paths'
import { appStorage, frpPackageStorage } from '~~/src/storages'
import { customCommands } from './commands'

export interface RawConfigSnapshot {
  text: string
  version: number
  updatedAt: number | null
}

let bridgeInstance: FrpBridge | null = null
let currentInstanceMode: RuntimeMode | null = null
let initializingPromise: Promise<void> | null = null

// 全局事件总线，用于转发 FRP 事件到 SSE
export const eventBus = new EventEmitter()

export function useFrpBridge(): FrpBridge {
  // 获取当前应该使用的模式
  const targetMode = getMode()

  // 如果 bridge 实例不存在，创建新实例
  if (!bridgeInstance) {
    bridgeInstance = createBridge()
    currentInstanceMode = targetMode

    // 异步初始化，不阻塞
    if (!initializingPromise) {
      initializingPromise = bridgeInstance.initialize().then(() => {
        console.warn('[Bridge] Initialization completed')
      }).catch((error) => {
        console.error('[Bridge] Initialization failed:', error)
      }).finally(() => {
        initializingPromise = null
      })
    }

    return bridgeInstance
  }

  // 如果模式不匹配，重新创建实例
  if (currentInstanceMode !== targetMode) {
    console.warn(`FRP mode changed from ${currentInstanceMode} to ${targetMode}, recreating bridge instance`)
    // 清理旧实例（异步）
    if (bridgeInstance) {
      bridgeInstance.dispose().catch((error) => {
        console.error('[Bridge] Dispose failed:', error)
      })
    }
    bridgeInstance = createBridge()
    currentInstanceMode = targetMode

    // 异步初始化
    initializingPromise = bridgeInstance.initialize().then(() => {
      console.warn('[Bridge] Initialization completed')
    }).catch((error) => {
      console.error('[Bridge] Initialization failed:', error)
    }).finally(() => {
      initializingPromise = null
    })
  }

  return bridgeInstance
}

/**
 * 生成 FRP 配置文件（合并预设配置和用户 tunnels）
 * 每次调用都会重新生成并覆盖 configPath 下的配置文件
 */
export async function generateFrpConfig(): Promise<void> {
  const mode = getMode()
  const configPath = getConfigPath(mode)

  // 1. 读取预设配置
  const presetConfig = await loadPresetConfig(mode)

  // 2. 读取用户 tunnels（根据模式使用不同方式）
  const bridge = useFrpBridge()
  let tunnels: any[] = []

  if (mode === 'client') {
    // client 模式：从 processManager 获取
    const processManager = bridge.getProcessManager()
    tunnels = processManager.listTunnels()
  }
  else {
    // server 模式：从配置文件读取或使用空数组
    tunnels = await loadTunnelsFromConfig(configPath)
  }

  // 3. 使用 saveFrpConfigFile 生成并保存配置文件
  saveFrpConfigFile(configPath, tunnels, presetConfig, mode === 'server' ? 'frps' : 'frpc')
}

/**
 * 从配置文件读取 tunnels
 */
async function loadTunnelsFromConfig(configPath: string): Promise<any[]> {
  if (!existsSync(configPath)) {
    return []
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    // 简单解析 proxies 部分
    const lines = content.split('\n')
    const result: any[] = []
    let currentProxy: any = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('[[proxies]]')) {
        if (currentProxy) {
          result.push(currentProxy)
        }
        currentProxy = {}
      }
      else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // 跳过其他 section
        if (currentProxy) {
          result.push(currentProxy)
          currentProxy = null
        }
      }
      else if (currentProxy && trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim()
          let value: any = trimmed.slice(eqIndex + 1).trim()
          if (value.startsWith('"') || value.startsWith('\'')) {
            value = value.slice(1, -1)
          }
          currentProxy[key] = value
        }
      }
    }

    if (currentProxy) {
      result.push(currentProxy)
    }

    return result
  }
  catch {
    return []
  }
}

/**
 * 读取预设配置
 */
async function loadPresetConfig(mode: RuntimeMode) {
  const configDir = getConfigDir()
  const presetType = mode === 'server' ? 'frps' : 'frpc'
  const presetPath = join(configDir, `${presetType}-preset.json`)

  if (!existsSync(presetPath)) {
    return {}
  }

  try {
    const content = readFileSync(presetPath, 'utf-8')
    const config = JSON.parse(content)
    return { [presetType]: config }
  }
  catch {
    return {}
  }
}

export async function readConfigFileText(): Promise<RawConfigSnapshot> {
  const mode = getMode()
  const configPath = getConfigPath(mode)

  if (!existsSync(configPath)) {
    throw new Error('FRP config file not found, please start FRP service first')
  }

  const text = readFileSync(configPath, 'utf-8')
  const bridge = useFrpBridge()
  const state = bridge.snapshot()

  return {
    text,
    version: state.version,
    updatedAt: state.lastAppliedAt ?? null
  }
}

export async function writeConfigFileText(content: string, restart = false): Promise<void> {
  const bridge = useFrpBridge()
  const mode = getMode()
  const configPath = getConfigPath(mode)

  // 直接使用 frp-bridge 内置的 config.applyRaw 命令
  await bridge.execute({
    name: 'config.applyRaw',
    payload: {
      content,
      restart,
      configPath
    }
  })
}

function createBridge(): FrpBridge {
  const mode = getMode()
  const workDir = resolveWorkDir()
  // 去掉 v 前缀，frp-bridge 期望纯版本号
  const version = frpPackageStorage.version?.replace(/^v/, '') || undefined

  // 创建 bridge 实例，注册自定义命令和事件监听
  const bridge = new FrpBridge({
    mode,
    workDir,
    configPath: getConfigPath(mode),
    process: {
      mode,
      workDir,
      version
    },
    // 注册所有自定义命令
    commands: customCommands,
    // 设置事件接收器，转发到全局事件总线
    eventSink: (event) => {
      eventBus.emit('frp-event', event)
    }
  })

  return bridge
}

function getMode(): RuntimeMode {
  // 优先从 storage 读取，如果没有则从环境变量读取，最后默认为 server
  if (appStorage.frpMode) {
    return appStorage.frpMode
  }
  return parseMode(process.env.FRP_BRIDGE_MODE)
}

function resolveWorkDir() {
  const workDir = getWorkDir()
  ensureDirectory(workDir)
  ensureDirectory(getBinDir())
  ensureDirectory(getConfigDir())
  return workDir
}

function ensureDirectory(pathname: string) {
  if (!existsSync(pathname)) {
    mkdirSync(pathname, { recursive: true })
  }
}

function parseMode(mode?: string): RuntimeMode {
  if (mode === 'client' || mode === 'server') {
    return mode
  }
  return 'server'
}
