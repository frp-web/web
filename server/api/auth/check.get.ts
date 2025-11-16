import { appStorage } from '~~/src/storages'

export default defineEventHandler(() => {
  const hasUser = Boolean(appStorage.username && appStorage.hashedPassword)
  return {
    hasUser,
    username: hasUser ? appStorage.username : null
  }
})
