import type { ThemeMode } from '~~/src/storages/app'
import { createError, defineEventHandler, readBody } from 'h3'
import { appStorage } from '~~/src/storages/app'

interface UpdateAppSettingsBody {
  theme?: ThemeMode
}

const themes: ThemeMode[] = ['system', 'light', 'dark']

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateAppSettingsBody>(event)
  if (!body?.theme || !themes.includes(body.theme)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'theme is required'
    })
  }

  appStorage.theme = body.theme

  return {
    theme: appStorage.theme
  }
})
