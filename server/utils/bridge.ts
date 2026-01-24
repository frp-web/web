import type { RuntimeMode } from 'frp-bridge/runtime'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { FrpBridge, mergeConfigs } from 'frp-bridge'

import { getConfigDir, getConfigPath, getDataDir, getWorkDir } from '~~/app/constants/paths'
import { appStorage, frpPackageStorage } from '~~/src/storages'

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

/**
 * 生成 FRP 配置文件（合并预设配置和用户 tunnels）
 * @param force 是否强制重新生成
 */
export async function generateFrpConfig(force = false): Promise<void> {
  const mode = getMode()
  const configPath = getConfigPath(mode)

  // 如果配置文件已存在且不强制重新生成，则跳过
  if (!force && existsSync(configPath)) {
    return
  }

  // 1. 读取预设配置
  const presetConfig = await loadPresetConfig(mode)

  // 2. 读取用户 tunnels
  const bridge = useFrpBridge()
  const processManager = bridge.getProcessManager()
  const tunnels = processManager.listTunnels()

  // 3. 生成用户配置 TOML（只包含 tunnels）
  const userConfig = generateTunnelsConfig(tunnels)

  // 4. 合并预设配置和用户配置
  const finalConfig = mergeConfigs(presetConfig, userConfig, mode === 'server' ? 'frps' : 'frpc')

  // 5. 写入最终配置文件
  const { writeFileSync } = await import('node:fs')
  ensureDirectory(getConfigDir())
  writeFileSync(configPath, finalConfig, 'utf-8')
}

/**
 * 读取预设配置
 */
async function loadPresetConfig(mode: RuntimeMode) {
  const configDir = join(process.cwd(), 'data', 'config')
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

/**
 * 将 tunnels 数组转换为 TOML 格式的用户配置
 */
function generateTunnelsConfig(tunnels: any[]): string {
  if (!tunnels || tunnels.length === 0) {
    return ''
  }

  const lines: string[] = []

  for (const tunnel of tunnels) {
    lines.push('')
    lines.push('[[proxies]]')
    for (const [key, value] of Object.entries(tunnel)) {
      if (value === undefined || value === null)
        continue
      if (typeof value === 'string') {
        lines.push(`${key} = "${value}"`)
      }
      else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key} = ${value}`)
      }
      else if (typeof value === 'object') {
        lines.push(`[${key}]`)
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'string') {
            lines.push(`${subKey} = "${subValue}"`)
          }
          else {
            lines.push(`${subKey} = ${subValue}`)
          }
        }
      }
    }
  }

  return lines.join('\n')
}

export async function readConfigFileText(): Promise<RawConfigSnapshot> {
  const mode = getMode()
  const configPath = getConfigPath(mode)

  // 如果配置文件不存在，生成配置
  if (!existsSync(configPath)) {
    await generateFrpConfig()
  }

  // 如果还是不存在，尝试从下载的 FRP 包中复制默认配置
  if (!existsSync(configPath)) {
    await copyDefaultConfigIfExists()
  }

  if (!existsSync(configPath)) {
    throw new Error('FRP config file is missing and no default config found in downloaded package')
  }

  const { readFileSync } = await import('node:fs')
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
      workDir,
      // 使用已下载的 FRP 版本，避免启动时尝试获取最新版本
      version: frpPackageStorage.version ?? undefined
    },
    // 注册自定义命令
    commands: {
      // 自定义命令：写入配置文件到 config 目录并可选重启服务
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
