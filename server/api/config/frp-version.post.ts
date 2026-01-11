import type { FrpPackageStatus } from '~~/src/storages/frp'
import { resolve } from 'node:path'
import process from 'node:process'
import { createError, defineEventHandler } from 'h3'
import { checkFrpInstalled } from '~~/server/utils/frp-checker'
import { downloadAndInstallFrp } from '~~/server/utils/frp-installer'
import { frpPackageStorage } from '~~/src/storages/frp'

interface GithubAsset {
  browser_download_url?: string
  name?: string
}

interface GithubRelease {
  tag_name?: string
  name?: string
  published_at?: string
  assets?: GithubAsset[]
  html_url?: string
}

export default defineEventHandler(async () => {
  if (frpPackageStorage.status === 'updating') {
    return serializeState()
  }

  frpPackageStorage.status = 'updating'

  try {
    const release = await $fetch<GithubRelease>('https://api.github.com/repos/fatedier/frp/releases/latest', {
      headers: {
        'User-Agent': 'frp-web'
      }
    })

    const version = release.tag_name ?? release.name ?? null

    // 根据当前平台选择正确的 asset
    const platformKey = getPlatformKey()
    const asset = release.assets?.find(a => a.name?.includes(platformKey)) ?? release.assets?.[0]
    const downloadUrl = asset?.browser_download_url ?? release.html_url ?? null

    frpPackageStorage.version = version
    frpPackageStorage.releaseName = release.name ?? version
    frpPackageStorage.downloadUrl = downloadUrl
    frpPackageStorage.updatedAt = release.published_at ?? new Date().toISOString()

    // 如果有下载链接和版本号，自动下载并安装
    if (downloadUrl && version) {
      const { getWorkDir, getConfigPath } = await import('~~/app/constants/paths')
      const workDir = getWorkDir()

      try {
        const extractedDir = await downloadAndInstallFrp({
          workDir,
          version,
          downloadUrl
        })

        // 复制两种模式的配置文件到对应目录（同时准备 client/server 两套）
        const { copyFile, access } = await import('node:fs/promises')
        const { constants } = await import('node:fs')

        async function copyModeConfigIfMissing(mode: 'client' | 'server') {
          const fileName = mode === 'server' ? 'frps.toml' : 'frpc.toml'
          const sourceConfig = resolve(extractedDir, fileName)
          const targetConfig = getConfigPath(mode)
          try {
            await access(sourceConfig, constants.F_OK)
          }
          catch {
            console.warn(`Source config file not found: ${sourceConfig}`)
            return
          }
          try {
            await access(targetConfig, constants.F_OK)
            console.warn(`Config file already exists: ${targetConfig}`)
          }
          catch {
            await copyFile(sourceConfig, targetConfig)
            console.warn(`Copied config file to: ${targetConfig}`)

            // 如果是 server 模式，添加 webServer 配置
            if (mode === 'server') {
              const { readFile, appendFile } = await import('node:fs/promises')
              try {
                const configContent = await readFile(targetConfig, 'utf-8')

                // 检查是否已存在 webServer 配置
                if (!configContent.includes('webServer.addr')) {
                  // 添加 webServer 配置
                  const webServerConfig = '\n# webServer 配置 - 用于获取 FRPS 连接数据\nwebServer.addr = "127.0.0.1"\nwebServer.port = 7500\nwebServer.user = "admin"\nwebServer.password = "admin"\n'
                  await appendFile(targetConfig, webServerConfig)
                  console.warn(`Added webServer config to: ${targetConfig}`)
                }
              }
              catch (error) {
                console.error('Failed to add webServer config:', error)
              }
            }
          }
        }

        await Promise.all([
          copyModeConfigIfMissing('client'),
          copyModeConfigIfMissing('server')
        ])

        // 安装完成后，删除解压目录
        const { rm } = await import('node:fs/promises')
        await rm(extractedDir, { recursive: true, force: true })
        console.warn(`Cleaned up extracted directory: ${extractedDir}`)
      }
      catch (installError) {
        console.error('Failed to install FRP:', installError)
        // 不抛出错误，只记录日志，允许用户稍后重试
      }
    }
  }
  catch (error) {
    frpPackageStorage.status = 'idle'
    throw createError({
      statusCode: 502,
      statusMessage: '获取 FRP 版本信息失败',
      data: error instanceof Error ? error.message : String(error)
    })
  }

  frpPackageStorage.status = 'idle'
  return serializeState()
})

function serializeState() {
  const installStatus = checkFrpInstalled(frpPackageStorage.version ?? undefined)

  return {
    version: frpPackageStorage.version,
    releaseName: frpPackageStorage.releaseName,
    downloadUrl: frpPackageStorage.downloadUrl,
    updatedAt: frpPackageStorage.updatedAt,
    status: frpPackageStorage.status as FrpPackageStatus,
    installed: installStatus.installed,
    binaryExists: installStatus.binaryExists,
    configExists: installStatus.configExists
  }
}

/**
 * 获取当前平台的标识符
 */
function getPlatformKey(): string {
  const platform = process.platform
  const arch = process.arch

  // 平台映射
  const platformMap: Record<string, string> = {
    win32: 'windows',
    darwin: 'darwin',
    linux: 'linux'
  }

  // 架构映射
  const archMap: Record<string, string> = {
    x64: 'amd64',
    arm64: 'arm64',
    arm: 'arm',
    ia32: '386'
  }

  const platformName = platformMap[platform] || 'linux'
  const archName = archMap[arch] || 'amd64'

  return `${platformName}_${archName}`
}
