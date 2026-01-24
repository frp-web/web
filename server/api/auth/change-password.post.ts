import { createHash } from 'node:crypto'
import { appStorage } from '~~/src/storages'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ newPassword: string }>(event)

  if (!body.newPassword) {
    throw createError({
      statusCode: 400,
      message: 'New password is required'
    })
  }

  if (body.newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 6 characters'
    })
  }

  if (!appStorage.username || !appStorage.hashedPassword) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const hashedPassword = hashPassword(body.newPassword)
  appStorage.hashedPassword = hashedPassword

  return {
    success: true,
    message: 'Password changed successfully'
  }
})

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
