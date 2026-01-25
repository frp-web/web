import type { FrpPackageStatus } from '~~/src/storages/frp'
import { resolve } from 'node:path'
import process from 'node:process'
import { createError, defineEventHandler, readBody } from 'h3'
import { eventBus } from '~~/server/bridge'
import { checkFrpInstalled } from '~~/server/utils/frp-checker'
import { downloadAndInstallFrp } from '~~/server/utils/frp-installer'
import { toPercent } from '~~/server/utils/number'
import { appStorage, frpPackageStorage } from '~~/src/storages'

interface CheckVersionBody {
  checkOnly?: boolean // 只检查版本，不下载
}

interface GithubAsset {
  browser_download_url?: string
  name?: string
  size?: number
}

interface GithubRelease {
  tag_name?: string
  name?: string
  published_at?: string
  assets?: GithubAsset[]
  html_url?: string
}

// 发送进度事件
function sendProgress(type: string, data: any) {
  eventBus.emit('frp-event', {
    type: `frp:${type}`,
    timestamp: Date.now(),
    payload: data
  })
}

export default defineEventHandler(async (event) => {
  if (frpPackageStorage.status === 'updating') {
    return serializeState()
  }

  const body = await readBody<CheckVersionBody>(event) || {}
  const checkOnly = body.checkOnly ?? false

  frpPackageStorage.status = 'updating'

  try {
    // 步骤 1: 获取最新版本信息
    sendProgress('check', { message: '正在检查最新版本...' })

    const headers: Record<string, string> = {
      'User-Agent': 'frp-web'
    }

    if (appStorage.githubToken) {
      headers.Authorization = `Bearer ${appStorage.githubToken}`
    }

    const release = await $fetch<GithubRelease>('https://api.github.com/repos/fatedier/frp/releases/latest', {
      headers
    })

    const latestVersion = release.tag_name ?? release.name ?? null

    if (!latestVersion) {
      throw new Error('无法获取最新版本信息')
    }

    // 根据当前平台选择正确的 asset
    const platformKey = getPlatformKey()
    const asset = release.assets?.find(a => a.name?.includes(platformKey)) ?? release.assets?.[0]
    const downloadUrl = asset?.browser_download_url ?? release.html_url ?? null

    // 更新版本信息
    frpPackageStorage.version = latestVersion
    frpPackageStorage.releaseName = release.name ?? latestVersion
    frpPackageStorage.downloadUrl = downloadUrl
    frpPackageStorage.updatedAt = new Date().toISOString()

    // 如果只是检查版本，直接返回
    if (checkOnly) {
      sendProgress('checked', {
        version: latestVersion,
        isLatest: true,
        message: `已是最新版本 ${latestVersion}`
      })
      frpPackageStorage.status = 'idle'
      return serializeState()
    }

    // 检查当前版本是否已是最新
    const installStatus = checkFrpInstalled(latestVersion)
    if (installStatus.installed) {
      sendProgress('up-to-date', {
        version: latestVersion,
        message: `当前已是最新版本 ${latestVersion}`
      })
      frpPackageStorage.status = 'idle'
      return serializeState()
    }

    // 需要下载新版本
    if (!downloadUrl) {
      throw new Error('无法获取下载链接')
    }

    sendProgress('download-start', {
      version: latestVersion,
      message: `开始下载 ${latestVersion}...`
    })

    // 下载并安装
    const { getWorkDir, getConfigPath } = await import('~~/app/constants/paths')
    const workDir = getWorkDir()

    sendProgress('downloading', {
      version: latestVersion,
      message: '正在下载...'
    })

    const extractedDir = await downloadAndInstallFrp({
      workDir,
      version: latestVersion,
      downloadUrl,
      onProgress: (progress) => {
        const percent = toPercent(progress)
        sendProgress('download-progress', {
          version: latestVersion,
          progress: percent,
          message: `下载中... ${percent}%`
        })
      }
    })

    sendProgress('download-complete', {
      version: latestVersion,
      message: '下载完成，正在配置...'
    })

    // 复制配置文件
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
        return
      }
      try {
        await access(targetConfig, constants.F_OK)
      }
      catch {
        await copyFile(sourceConfig, targetConfig)

        if (mode === 'server') {
          const { readFile, appendFile } = await import('node:fs/promises')
          try {
            const configContent = await readFile(targetConfig, 'utf-8')
            if (!configContent.includes('webServer.addr')) {
              const webServerConfig = '\n# webServer 配置 - 用于获取 FRPS 连接数据\n# 默认用户名: admin，密码: admin\nwebServer.addr = "127.0.0.1"\nwebServer.port = 7500\nwebServer.user = "admin"\nwebServer.password = "admin"\n'
              await appendFile(targetConfig, webServerConfig)
            }
          }
          catch {
            // ignore
          }
        }
      }
    }

    await Promise.all([
      copyModeConfigIfMissing('client'),
      copyModeConfigIfMissing('server')
    ])

    // 清理解压目录
    const { rm } = await import('node:fs/promises')
    await rm(extractedDir, { recursive: true, force: true })

    sendProgress('complete', {
      version: latestVersion,
      message: `FRP ${latestVersion} 安装完成`
    })
  }
  catch (error) {
    frpPackageStorage.status = 'idle'

    const errorMessage = error instanceof Error ? error.message : String(error)

    sendProgress('error', {
      message: '操作失败',
      error: errorMessage
    })

    throw createError({
      statusCode: 502,
      statusMessage: '获取 FRP 版本信息失败',
      data: errorMessage
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

  const platformMap: Record<string, string> = {
    win32: 'windows',
    darwin: 'darwin',
    linux: 'linux'
  }

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
