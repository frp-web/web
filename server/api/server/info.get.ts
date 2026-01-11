import { defineEventHandler } from 'h3'
import { getFrpsServerInfo } from '~~/server/utils/frps-api'

export default defineEventHandler(async () => {
  const info = await getFrpsServerInfo()

  if (!info) {
    return {
      success: false,
      error: 'Failed to get FRPS server info'
    }
  }

  return {
    success: true,
    data: info
  }
})
