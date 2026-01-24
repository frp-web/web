/**
 * 保存预设配置
 * POST /api/config/preset
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from '~~/app/constants/paths'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { type, config } = body

  if (!type || !['frps', 'frpc'].includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid type, must be frps or frpc'
    })
  }

  if (!config || typeof config !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid config object'
    })
  }

  try {
    const configDir = getConfigDir()
    const configPath = join(configDir, `${type}-preset.json`)

    mkdirSync(configDir, { recursive: true })
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

    return {
      success: true,
      type,
      message: `${type.toUpperCase()} preset config saved successfully`
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to save preset config: ${error.message}`
    })
  }
})
