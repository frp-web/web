import type { FrpMode } from '~~/src/storages/app'
import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string, password: string, frpMode: FrpMode }>(event)

  if (!body.username || !body.password) {
    throw createError({
      statusCode: 400,
      message: '用户名和密码不能为空'
    })
  }

  if (!body.frpMode || (body.frpMode !== 'client' && body.frpMode !== 'server')) {
    throw createError({
      statusCode: 400,
      message: '请选择运行模式'
    })
  }

  if (appStorage.username && appStorage.hashedPassword) {
    throw createError({
      statusCode: 400,
      message: '用户已存在，请直接登录'
    })
  }

  if (body.username.length < 3 || body.username.length > 20) {
    throw createError({
      statusCode: 400,
      message: '用户名长度必须在 3-20 个字符之间'
    })
  }

  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: '密码长度至少为 6 个字符'
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
