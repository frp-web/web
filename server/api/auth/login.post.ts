import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string, password: string }>(event)

  if (!body.username || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password are required'
    })
  }

  if (!appStorage.username || !appStorage.hashedPassword) {
    throw createError({
      statusCode: 404,
      message: 'User not found, please register first'
    })
  }

  const hashedPassword = hashPassword(body.password)

  if (body.username !== appStorage.username || hashedPassword !== appStorage.hashedPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid username or password'
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
