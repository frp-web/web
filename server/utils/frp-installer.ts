import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { chmod, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { getBinDir, getDataDir, getTempDir } from '~~/app/constants/paths'

interface DownloadOptions {
  workDir: string
  version: string
  downloadUrl: string
}

/**
 * 下载并安装 FRP 到指定目录
 * @returns 解压后的 FRP 目录路径
 */
export async function downloadAndInstallFrp(options: DownloadOptions): Promise<string> {
  const { version, downloadUrl } = options

  // 创建必要的目录
  const dataDir = getDataDir()
  const tempDir = getTempDir()
  ensureDirectory(dataDir)
  ensureDirectory(tempDir)

  // 确定文件扩展名
  const isZip = downloadUrl.endsWith('.zip')
  const archiveExt = isZip ? '.zip' : '.tar.gz'

  // 下载压缩包
  const archivePath = join(tempDir, `frp${archiveExt}`)
  await downloadFile(downloadUrl, archivePath)

  // 解压到临时目录
  const extractDir = join(tempDir, 'extract')
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

  // 创建二进制文件目录
  const binDir = getBinDir(version)
  ensureDirectory(getBinDir())
  ensureDirectory(binDir)

  // 移动整个解压目录到 data 目录（保留配置文件）
  const sourceFrpDir = join(extractDir, frpDirEntry.name)
  const targetFrpDir = join(dataDir, frpDirEntry.name)

  // 如果目标目录已存在，先删除
  if (existsSync(targetFrpDir)) {
    await rm(targetFrpDir, { recursive: true, force: true })
  }

  await rename(sourceFrpDir, targetFrpDir)

  // 复制可执行文件到 bin 目录
  const executableNames = ['frps', 'frpc', 'frps.exe', 'frpc.exe']
  for (const name of executableNames) {
    const source = join(targetFrpDir, name)
    if (existsSync(source)) {
      const target = join(binDir, name)
      await rename(source, target)
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

  // 清理临时目录和压缩包
  await rm(tempDir, { recursive: true, force: true })

  const cleanVersion = version.replace(/^v/, '')
  console.warn(`FRP ${cleanVersion} installed successfully to ${binDir}`)

  // 返回解压目录路径，供后续复制配置文件使用
  return targetFrpDir
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('Response body is null')
  }

  const fileStream = createWriteStream(destPath)
  await pipeline(response.body as any, fileStream)
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
      console.warn('Gzip decompression failed, trying direct tar extraction')
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
    console.error('Failed to extract ZIP archive:', error)
    throw new Error(`Failed to extract ZIP archive: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function ensureDirectory(pathname: string) {
  if (!existsSync(pathname)) {
    mkdirSync(pathname, { recursive: true })
  }
}
