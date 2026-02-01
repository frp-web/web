import type { RuntimeMode } from 'frp-bridge/runtime'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { FrpBridge, mergeConfigs } from 'frp-bridge'

import { getBinDir, getConfigDir, getGeneratedConfigPath, getGeneratedDir, getPresetConfigPath, getUserConfigPath, getWorkDir } from '~~/app/constants/paths'
import { appStorage, frpPackageStorage } from '~~/src/storages'

export interface RawConfigSnapshot {
  text: string
  version: number
  updatedAt: number | null
}

let bridgeInstance: FrpBridge | null = null
let cachedVersion: string | null = null

export function useFrpBridge(): FrpBridge {
  const currentVersion = frpPackageStorage.version
  // 版本变化时重新创建实例
  if (!bridgeInstance || cachedVersion !== currentVersion) {
    // 创建 bridge 前先生成配置文件
    const configPath = getGeneratedConfigPath(getMode())
    if (!existsSync(configPath)) {
      // 同步方式生成配置（在下一个事件循环）
      setImmediate(() => {
        generateFrpConfig(true).catch((err) => {
          console.error('[bridge] Failed to generate config:', err)
        })
      })
    }
    bridgeInstance = createBridge()
    cachedVersion = currentVersion
  }
  return bridgeInstance
}

/**
 * 生成 FRP 配置文件（合并预设配置、用户额外配置和 tunnels）
 * @param force 是否强制重新生成
 */
export async function generateFrpConfig(force = false): Promise<void> {
  const mode = getMode()
  const configPath = getGeneratedConfigPath(mode)

  // 如果配置文件已存在且不强制重新生成，则跳过
  if (!force && existsSync(configPath)) {
    return
  }

  // 1. 读取预设配置（JSON 格式，从配置页面设置）
  const presetConfig = await loadPresetConfig(mode)

  // 2. 读取用户额外配置（TOML 格式，用户手动编辑的）
  let userConfigToml = ''
  const userConfigPath = getUserConfigPath(mode)
  if (existsSync(userConfigPath)) {
    const content = readFileSync(userConfigPath, 'utf-8')
    // 排除空模板文件
    if (content && !content.trim().startsWith('# User configuration')) {
      userConfigToml = content
    }
  }

  // 3. 读取 tunnels（从 bridge storage）
  const bridge = useFrpBridge()
  const processManager = bridge.getProcessManager()
  const tunnels = await processManager.listTunnels()
  const tunnelsConfig = generateTunnelsConfig(tunnels)

  // 4. 合并：预设配置 + 用户额外配置 + tunnels
  const combinedUserConfig = `${userConfigToml}\n${tunnelsConfig}`.trim()
  const finalConfig = mergeConfigs(presetConfig, combinedUserConfig, mode === 'server' ? 'frps' : 'frpc')

  // 5. 写入生成的配置文件（FRP 实际使用的）
  const { writeFileSync } = await import('node:fs')
  ensureDirectory(getGeneratedDir())
  writeFileSync(configPath, finalConfig, 'utf-8')
}

/**
 * 读取预设配置（从 preset.json 文件）
 */
async function loadPresetConfig(mode: RuntimeMode) {
  const presetPath = getPresetConfigPath(mode)

  if (!existsSync(presetPath)) {
    // 返回默认配置
    if (mode === 'server') {
      return {
        frps: {
          bindPort: 7000,
          vhostHTTPPort: 7000,
          dashboardPort: 7500,
          dashboardUser: 'admin',
          dashboardPassword: 'admin'
        }
      }
    }
    return {
      frpc: {
        serverPort: 7000
      }
    }
  }

  try {
    const content = readFileSync(presetPath, 'utf-8')
    const config = JSON.parse(content)
    // 修复空密码为默认值
    if (mode === 'server' && config.frps) {
      if (!config.frps.dashboardPassword) {
        config.frps.dashboardPassword = 'admin'
      }
    }
    const presetType = mode === 'server' ? 'frps' : 'frpc'
    return { [presetType]: config }
  }
  catch {
    if (mode === 'server') {
      return {
        frps: {
          bindPort: 7000,
          vhostHTTPPort: 7000,
          dashboardPort: 7500,
          dashboardUser: 'admin',
          dashboardPassword: 'admin'
        }
      }
    }
    return {
      frpc: {
        serverPort: 7000
      }
    }
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
  const configPath = getGeneratedConfigPath(mode)

  // 如果配置文件不存在，生成配置
  if (!existsSync(configPath)) {
    await generateFrpConfig()
  }

  if (!existsSync(configPath)) {
    throw new Error('FRP config file does not exist')
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

  // 使用自定义命令 config.applyToFile，直接写入到 generated 目录并可选重启
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
  // 去掉 v 前缀，frp-bridge 期望纯版本号
  const version = frpPackageStorage.version?.replace(/^v/, '') || undefined

  // 创建 bridge 实例，使用生成的配置文件路径
  const configPath = getGeneratedConfigPath(mode)
  const bridge = new FrpBridge({
    mode,
    workDir,
    process: {
      mode,
      workDir,
      version,
      configPath
    },
    // 注册自定义命令
    commands: {
      // 自定义命令：写入配置文件到 generated 目录并可选重启服务
      'config.applyToFile': async (command, ctx) => {
        const { content, restart } = command.payload as { content: string, restart: boolean }
        const configPath = getGeneratedConfigPath(mode)
        const { writeFileSync } = await import('node:fs')

        // 确保配置目录存在
        ensureDirectory(getGeneratedDir())

        // 写入配置文件到 generated/ 目录
        writeFileSync(configPath, content, 'utf-8')

        // 如果需要重启服务
        if (restart) {
          const processManager = bridge.getProcessManager()
          const wasRunning = processManager.isRunning()

          if (wasRunning) {
            await processManager.stop()
            await processManager.start()

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
  ensureDirectory(getBinDir())
  ensureDirectory(getConfigDir())
  ensureDirectory(getGeneratedDir())
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
