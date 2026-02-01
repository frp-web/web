/**
 * FRP Web 路径配置
 * 统一管理所有文件和目录路径
 */

import { resolve } from 'node:path'
import process from 'node:process'

/**
 * 获取工作目录根路径
 */
export function getWorkDir(): string {
  return process.env.FRP_BRIDGE_WORKDIR ?? resolve(process.cwd(), '.frp-web')
}

/**
 * 获取用户配置文件目录（用户可编辑）
 * 包含：预设配置、用户额外配置
 */
export function getConfigDir(): string {
  return resolve(getWorkDir(), 'config')
}

/**
 * 获取运行时生成目录（系统自动生成，用户不可编辑）
 * 包含：最终合并后的 FRP 配置文件
 */
export function getGeneratedDir(): string {
  return resolve(getWorkDir(), 'generated')
}

/**
 * 获取数据目录
 */
export function getDataDir(): string {
  return resolve(getWorkDir(), 'data')
}

/**
 * 获取下载临时目录
 */
export function getTempDir(): string {
  return resolve(getDataDir(), 'temp')
}

/**
 * 获取二进制文件目录
 */
export function getBinDir(version?: string): string {
  const baseDir = resolve(getWorkDir(), 'bin')
  if (version) {
    const cleanVersion = version.replace(/^v/, '')
    return resolve(baseDir, cleanVersion)
  }
  return baseDir
}

/**
 * 获取生成的配置文件路径（FRP 实际使用的，合并后的配置）
 * @param mode - FRP 运行模式 (server/client)
 */
export function getGeneratedConfigPath(mode: 'server' | 'client'): string {
  const configFileName = mode === 'server' ? 'frps.toml' : 'frpc.toml'
  return resolve(getGeneratedDir(), configFileName)
}

/**
 * 获取用户额外配置文件路径（用户手动编辑的 TOML 配置，可选）
 * @param mode - FRP 运行模式 (server/client)
 */
export function getUserConfigPath(mode: 'server' | 'client'): string {
  const configFileName = mode === 'server' ? 'user-frps.toml' : 'user-frpc.toml'
  return resolve(getConfigDir(), configFileName)
}

/**
 * 获取预设配置文件路径（系统级配置，通过前端表单设置）
 * @param mode - FRP 运行模式 (server/client)
 */
export function getPresetConfigPath(mode: 'server' | 'client'): string {
  const configFileName = mode === 'server' ? 'frps-preset.json' : 'frpc-preset.json'
  return resolve(getConfigDir(), configFileName)
}

/**
 * 获取二进制文件路径
 * @param mode - FRP 运行模式 (server/client)
 * @param version - FRP 版本号
 */
export function getBinaryPath(mode: 'server' | 'client', version: string): string {
  const binDir = getBinDir(version)
  const binaryBaseName = mode === 'server' ? 'frps' : 'frpc'

  // Windows 平台可能是 .exe 文件
  if (process.platform === 'win32') {
    return resolve(binDir, `${binaryBaseName}.exe`)
  }

  return resolve(binDir, binaryBaseName)
}

/**
 * 路径常量（只读）
 */
export const PATHS = {
  /** 工作目录根路径 */
  WORK_DIR: getWorkDir(),
  /** 用户配置文件目录 */
  CONFIG_DIR: getConfigDir(),
  /** 运行时生成目录 */
  GENERATED_DIR: getGeneratedDir(),
  /** 数据目录 */
  DATA_DIR: getDataDir(),
  /** 临时下载目录 */
  TEMP_DIR: getTempDir(),
  /** 二进制文件基础目录 */
  BIN_DIR: getBinDir()
} as const
