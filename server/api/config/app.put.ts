import type { FrpMode, ThemeMode } from '~~/src/storages/app'
import { createError, defineEventHandler, readBody } from 'h3'
import { appStorage } from '~~/src/storages/app'

interface UpdateAppSettingsBody {
  theme?: ThemeMode
  frpMode?: FrpMode
}

const themes: ThemeMode[] = ['system', 'light', 'dark']
const frpModes: FrpMode[] = ['client', 'server']

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateAppSettingsBody>(event)
  if (body?.theme) {
    if (!themes.includes(body.theme)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid theme'
      })
    }
    appStorage.theme = body.theme
  }

  if (body?.frpMode) {
    if (!frpModes.includes(body.frpMode)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid frpMode'
      })
    }
    appStorage.frpMode = body.frpMode
  }

  return {
    theme: appStorage.theme,
    frpMode: appStorage.frpMode
  }
})
