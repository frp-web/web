import { defineEventHandler } from 'h3'
import { readConfigFileText } from '~~/server/bridge'
import { checkFrpConfigExists } from '~~/server/utils/frp-checker'

export default defineEventHandler(async () => {
  // 先检查配置文件是否存在
  if (!checkFrpConfigExists()) {
    return {
      config: null,
      structured: null,
      updatedAt: null,
      version: 0,
      exists: false
    }
  }

  const snapshot = await readConfigFileText()

  return {
    config: snapshot.text,
    structured: null,
    updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt).toISOString() : null,
    version: snapshot.version,
    exists: true
  }
})
