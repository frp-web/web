import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { chmod, copyFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { pipeline } from 'node:stream/promises'
import { getBinDir, getConfigDir, getUserConfigPath } from '~~/app/constants/paths'

interface DownloadOptions {
  version: string
  downloadUrl: string
  onProgress?: (progress: number) => void
}

/**
 * 下载并安装 FRP 到指定目录
 * @returns 安装的版本号
 */
export async function downloadAndInstallFrp(options: DownloadOptions): Promise<string> {
  const { version, downloadUrl, onProgress } = options

  // 创建必要的目录
  const binDir = getBinDir(version)
  const configDir = getConfigDir()
  ensureDirectory(binDir)
  ensureDirectory(configDir)

  // 确定文件扩展名
  const isZip = downloadUrl.endsWith('.zip')
  const archiveExt = isZip ? '.zip' : '.tar.gz'

  // 下载压缩包到系统临时目录
  const osTempDir = join(process.env.TEMP || '/tmp', 'frp-web-install')
  ensureDirectory(osTempDir)
  const archivePath = join(osTempDir, `frp_${version}${archiveExt}`)
  await downloadFile(downloadUrl, archivePath, onProgress)

  // 解压到临时目录
  const extractDir = join(osTempDir, `extract_${version}`)
  if (existsSync(extractDir)) {
    await rm(extractDir, { recursive: true, force: true })
  }
  ensureDirectory(extractDir)

  if (isZip) {
    await extractZip(archivePath, extractDir)
  }
  else {
    await extractTarGz(archivePath, extractDir)
  }

  // 查找解压后的 frp 目录
  const entries = await readdir(extractDir, { withFileTypes: true })
  const frpDirEntry = entries.find(e => e.isDirectory() && e.name.startsWith('frp'))

  if (!frpDirEntry) {
    throw new Error('Failed to find FRP directory in extracted archive')
  }

  const sourceFrpDir = join(extractDir, frpDirEntry.name)

  // 复制可执行文件到 bin 目录
  const executableNames = ['frps', 'frpc', 'frps.exe', 'frpc.exe']
  for (const name of executableNames) {
    const source = join(sourceFrpDir, name)
    if (existsSync(source)) {
      const target = join(binDir, name)
      await copyFile(source, target)
      // 在 Unix 系统上添加执行权限
      if (!name.endsWith('.exe')) {
        try {
          await chmod(target, 0o755)
        }
        catch {
          // Windows 系统不支持 chmod，忽略错误
        }
      }
    }
  }

  // 创建空白用户配置模板（如果不存在）
  const userConfigTemplate = '# User configuration\n# Additional configurations can be added here. If duplicates with page configurations, they will be overridden.\n'
  const serverUserConfigPath = getUserConfigPath('server')
  const clientUserConfigPath = getUserConfigPath('client')
  for (const targetConfig of [serverUserConfigPath, clientUserConfigPath]) {
    // 只在目标文件不存在时创建模板
    if (!existsSync(targetConfig)) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(targetConfig, userConfigTemplate, 'utf-8')
    }
  }

  // 清理临时目录
  await rm(extractDir, { recursive: true, force: true })
  await rm(archivePath, { force: true })

  return version
}

async function downloadFile(url: string, destPath: string, onProgress?: (progress: number) => void): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('Response body is null')
  }

  // 获取文件总大小用于计算进度
  const contentLength = response.headers.get('content-length')
  const totalBytes = contentLength ? Number.parseInt(contentLength, 10) : 0
  let downloadedBytes = 0

  const fileStream = createWriteStream(destPath)

  // 创建一个转换流来跟踪进度
  const { Transform } = await import('node:stream')
  const progressTransform = new Transform({
    transform(chunk, encoding, callback) {
      downloadedBytes += chunk.length
      if (onProgress && totalBytes > 0) {
        const progress = Math.round(downloadedBytes / totalBytes * 10000) / 10000
        onProgress(Math.min(progress, 1))
      }
      callback(null, chunk)
    }
  })

  await pipeline(response.body as any, progressTransform, fileStream)
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  const { createReadStream } = await import('node:fs')
  const { createGunzip } = await import('node:zlib')
  const { extract } = await import('tar')

  try {
    await pipeline(
      createReadStream(archivePath),
      createGunzip(),
      extract({ cwd: destDir })
    )
  }
  catch (error: any) {
    // 如果标准解压失败，尝试使用 tar 包直接解压（可能是非 gzip 格式）
    if (error.message && error.message.includes('incorrect header check')) {
      await pipeline(
        createReadStream(archivePath),
        extract({ cwd: destDir })
      )
    }
    else {
      throw error
    }
  }
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  const { default: AdmZip } = await import('adm-zip')

  try {
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(destDir, true)
  }
  catch (error) {
    throw new Error(`Failed to extract ZIP archive: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function ensureDirectory(pathname: string) {
  if (!existsSync(pathname)) {
    mkdirSync(pathname, { recursive: true })
  }
}
