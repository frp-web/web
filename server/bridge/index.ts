import type { RuntimeMode } from 'frp-bridge/runtime'
import { EventEmitter } from 'node:events'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { FrpBridge } from 'frp-bridge'
import { getConfigDir, getConfigPath, getDataDir, getWorkDir } from '~~/app/constants/paths'
import { appStorage } from '~~/src/storages'
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

export async function readConfigFileText(): Promise<RawConfigSnapshot> {
  const mode = getMode()
  const configPath = getConfigPath(mode)
  const { readFileSync } = await import('node:fs')

  // 如果配置文件不存在，尝试从下载的 FRP 包中复制默认配置
  if (!existsSync(configPath)) {
    await copyDefaultConfigIfExists()
  }

  if (!existsSync(configPath)) {
    throw new Error('FRP config file is missing and no default config found in downloaded package')
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

  // 创建 bridge 实例，注册自定义命令和事件监听

  const bridge = new FrpBridge({
    mode,
    workDir,
    configPath: getConfigPath(mode),
    process: {
      mode,
      workDir
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
  ensureDirectory(getDataDir())
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

/**
 * 尝试从下载的 FRP 包中复制默认配置文件
 * @returns 是否成功复制
 */
async function copyDefaultConfigIfExists(): Promise<boolean> {
  const mode = getMode()
  const dataDir = getDataDir()
  const targetConfigPath = getConfigPath(mode)

  // 如果目标配置已存在，无需复制
  if (existsSync(targetConfigPath)) {
    return false
  }

  // 在 data 目录中查找解压的 FRP 包
  if (!existsSync(dataDir)) {
    return false
  }

  try {
    const entries = readdirSync(dataDir, { withFileTypes: true })
    const configFileName = mode === 'server' ? 'frps.toml' : 'frpc.toml'

    // 查找 frp 开头的目录（解压后的目录通常是 frp_x.x.x_xxx）
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('frp')) {
        const frpDir = join(dataDir, entry.name)
        const sourceConfigPath = join(frpDir, configFileName)

        // 如果找到默认配置文件，复制到配置目录
        if (existsSync(sourceConfigPath)) {
          copyFileSync(sourceConfigPath, targetConfigPath)
          console.warn(`Copied default config from ${sourceConfigPath} to ${targetConfigPath}`)

          // 如果是 server 模式，添加 webServer 配置
          if (mode === 'server') {
            const { appendFileSync, readFileSync } = await import('node:fs')
            try {
              const configContent = readFileSync(targetConfigPath, 'utf-8')

              // 检查是否已存在 webServer 配置
              if (!configContent.includes('webServer.addr')) {
                // 添加 webServer 配置
                const webServerConfig = '\n# webServer 配置 - 用于获取 FRPS 连接数据\nwebServer.addr = "127.0.0.1"\nwebServer.port = 7500\nwebServer.user = "admin"\nwebServer.password = "admin"\n'
                appendFileSync(targetConfigPath, webServerConfig)
                console.warn(`Added webServer config to: ${targetConfigPath}`)
              }
            }
            catch (error) {
              console.error('Failed to add webServer config:', error)
            }
          }

          return true
        }
      }
    }
  }
  catch (error) {
    console.error('Failed to copy default config:', error)
  }

  return false
}
