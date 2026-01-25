/**
 * 获取预设配置
 * GET /api/config/preset
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from '~~/app/constants/paths'

const DEFAULT_PRESETS = {
  frps: {
    bindPort: 7000,
    vhostHTTPPort: 7000,
    vhostHTTPSPort: 443,
    dashboardPort: 7500,
    dashboardUser: 'admin',
    dashboardPassword: 'admin',
    authToken: '',
    domain: '',
    subdomainHost: ''
  },
  frpc: {
    serverAddr: '127.0.0.1',
    serverPort: 7000,
    authToken: '',
    user: '',
    heartbeatInterval: 30
  }
}

export default defineEventHandler(async (event) => {
  const type = getQuery(event).type as 'frps' | 'frpc'

  if (!type || !['frps', 'frpc'].includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid type, must be frps or frpc'
    })
  }

  const configDir = getConfigDir()
  const configPath = join(configDir, `${type}-preset.json`)

  try {
    if (!existsSync(configPath)) {
      const defaultConfig = DEFAULT_PRESETS[type]
      const fs = await import('node:fs/promises')
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')

      return {
        type,
        config: defaultConfig,
        isNew: true
      }
    }

    const configContent = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configContent)

    return {
      type,
      config,
      isNew: false
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to load preset config: ${error.message}`
    })
  }
})
