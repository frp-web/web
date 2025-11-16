import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ newPassword: string }>(event)

  if (!body.newPassword) {
    throw createError({
      statusCode: 400,
      message: '新密码不能为空'
    })
  }

  if (body.newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      message: '密码长度至少为 6 个字符'
    })
  }

  if (!appStorage.username || !appStorage.hashedPassword) {
    throw createError({
      statusCode: 404,
      message: '用户不存在'
    })
  }

  const hashedPassword = hashPassword(body.newPassword)
  appStorage.hashedPassword = hashedPassword

  return {
    success: true,
    message: '密码修改成功'
  }
})

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
