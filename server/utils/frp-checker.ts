import { existsSync } from 'node:fs'
import { getBinaryPath, getConfigPath } from '~~/app/constants/paths'
import { appStorage } from '~~/src/storages'

/**
 * 检查 FRP 可执行文件是否存在
 */
export function checkFrpBinaryExists(version?: string): boolean {
  const mode = appStorage.frpMode || 'server'

  if (!version) {
    return false
  }

  const binaryPath = getBinaryPath(mode, version)
  const binaryPathWithoutExe = binaryPath.replace(/\.exe$/, '')
  const binaryPathWithExe = `${binaryPathWithoutExe}.exe`

  // 检查两种可能的文件名
  return existsSync(binaryPath) || existsSync(binaryPathWithoutExe) || existsSync(binaryPathWithExe)
}

/**
 * 检查 FRP 配置文件是否存在
 */
export function checkFrpConfigExists(): boolean {
  const mode = appStorage.frpMode || 'server'
  const configPath = getConfigPath(mode)

  return existsSync(configPath)
}

/**
 * 检查 FRP 是否已安装（可执行文件和配置文件都存在）
 */
export function checkFrpInstalled(version?: string): {
  binaryExists: boolean
  configExists: boolean
  installed: boolean
} {
  const binaryExists = checkFrpBinaryExists(version)
  const configExists = checkFrpConfigExists()

  return {
    binaryExists,
    configExists,
    installed: binaryExists && configExists
  }
}
