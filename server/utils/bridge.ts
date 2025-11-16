import type { RuntimeMode } from 'frp-bridge/runtime'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { FrpBridge } from 'frp-bridge'
import { getConfigDir, getConfigPath, getDataDir, getWorkDir } from '~~/app/constants/paths'
import { appStorage } from '~~/src/storages'

export interface RawConfigSnapshot {
  text: string
  version: number
  updatedAt: number | null
}

let bridgeInstance: FrpBridge | null = null

export function useFrpBridge(): FrpBridge {
  if (!bridgeInstance) {
    bridgeInstance = createBridge()
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
  const state = useFrpBridge().snapshot()

  return {
    text,
    version: state.version,
    updatedAt: state.lastAppliedAt ?? null
  }
}

export async function writeConfigFileText(content: string, restart = false): Promise<void> {
  const bridge = useFrpBridge()

  // 使用自定义命令 config.applyToFile，直接写入到 config 目录并可选重启
  await bridge.execute({
    name: 'config.applyToFile',
    payload: {
      content,
      restart
    }
  })
}

function createBridge(): FrpBridge {
  const mode = getMode()
  const workDir = resolveWorkDir()

  // 创建 bridge 实例
  const bridge = new FrpBridge({
    mode,
    workDir,
    process: {
      mode,
      workDir
    },
    // 注册自定义命令
    commands: {
      // 自定义命令：写入配置文件到 config 目录，并可选重启服务
      'config.applyToFile': async (command, ctx) => {
        const { content, restart } = command.payload as { content: string, restart: boolean }
        const configPath = getConfigPath(mode)
        const { writeFileSync } = await import('node:fs')

        // 确保配置目录存在
        ensureDirectory(getConfigDir())

        // 写入配置文件到 config/ 目录
        writeFileSync(configPath, content, 'utf-8')

        // 如果需要重启服务
        if (restart) {
          const processManager = bridge.getProcessManager()
          const wasRunning = processManager.isRunning()

          if (wasRunning) {
            await processManager.stop()
            await processManager.start()
            console.warn('FRP service restarted after config update')

            // 发出重启事件
            return {
              status: 'success',
              events: [
                { type: 'process:stopped', timestamp: Date.now() },
                { type: 'process:started', timestamp: Date.now() }
              ]
            }
          }
        }

        // 请求版本号递增
        ctx.requestVersionBump()

        return {
          status: 'success',
          events: [{ type: 'config:updated', timestamp: Date.now() }]
        }
      }
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
