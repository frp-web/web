import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string, password: string }>(event)

  if (!body.username || !body.password) {
    throw createError({
      statusCode: 400,
      message: '用户名和密码不能为空'
    })
  }

  if (!appStorage.username || !appStorage.hashedPassword) {
    throw createError({
      statusCode: 404,
      message: '用户不存在，请先注册'
    })
  }

  const hashedPassword = hashPassword(body.password)

  if (body.username !== appStorage.username || hashedPassword !== appStorage.hashedPassword) {
    throw createError({
      statusCode: 401,
      message: '用户名或密码错误'
    })
  }

  return {
    success: true,
    username: body.username
  }
})

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
