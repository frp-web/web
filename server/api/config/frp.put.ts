import { createError, defineEventHandler, readBody } from 'h3'
import { readConfigFileText, writeConfigFileText } from '~~/server/bridge'

interface UpdateFrpConfigBody {
  config?: string
  restart?: boolean
  author?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateFrpConfigBody>(event)

  if (!body?.config || typeof body.config !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'config must be a non-empty string'
    })
  }

  try {
    // 直接写入配置文件，支持重启选项
    await writeConfigFileText(body.config, body.restart ?? true)
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to write config file',
      data: error instanceof Error ? error.message : String(error)
    })
  }

  // 读取保存后的配置
  const snapshot = await readConfigFileText()

  return {
    config: snapshot.text,
    structured: null,
    updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt).toISOString() : null,
    version: snapshot.version
  }
})
