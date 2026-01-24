import type { FrpMode } from '~~/src/storages/app'
import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string, password: string, frpMode: FrpMode }>(event)

  if (!body.username || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required'
    })
  }

  if (!body.frpMode || (body.frpMode !== 'client' && body.frpMode !== 'server')) {
    throw createError({
      statusCode: 400,
      message: 'Please select a running mode'
    })
  }

  if (appStorage.username && appStorage.hashedPassword) {
    throw createError({
      statusCode: 400,
      message: 'User already exists, please login'
    })
  }

  if (body.username.length < 3 || body.username.length > 20) {
    throw createError({
      statusCode: 400,
      message: 'Username length must be between 3-20 characters'
    })
  }

  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 6 characters'
    })
  }

  const hashedPassword = hashPassword(body.password)
  appStorage.username = body.username
  appStorage.hashedPassword = hashedPassword
  appStorage.frpMode = body.frpMode

  // 异步触发 FRP 下载和安装（不阻塞注册响应）
  downloadAndInstallFrp().catch((error) => {
    console.error('Failed to download and install FRP:', error)
  })

  return {
    success: true,
    username: body.username
  }
})

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function downloadAndInstallFrp() {
  // 调用 frp-version 接口获取最新版本
  await $fetch('/api/config/frp-version', { method: 'POST' })

  // TODO: 实现下载和安装逻辑
  // 这部分需要在 frp-version.post.ts 中实现
}
