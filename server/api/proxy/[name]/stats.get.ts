import { defineEventHandler } from 'h3'
import { getFrpsProxyStats } from '~~/server/utils/frps-api'

export default defineEventHandler(async (event) => {
  const name = event.context.params?.name

  if (!name) {
    return {
      success: false,
      error: 'Proxy name is required'
    }
  }

  const stats = await getFrpsProxyStats(name)

  if (!stats) {
    return {
      success: false,
      error: 'Failed to get proxy stats'
    }
  }

  return {
    success: true,
    data: stats
  }
})
