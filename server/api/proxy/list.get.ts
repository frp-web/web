import { defineEventHandler } from 'h3'
import { getFrpsProxiesWithStats } from '~~/server/utils/frps-api'

export default defineEventHandler(async () => {
  const proxies = await getFrpsProxiesWithStats()

  if (!proxies) {
    return {
      success: false,
      error: 'Failed to get proxy list',
      data: []
    }
  }

  // 数据已经是格式化的，直接返回
  return {
    success: true,
    data: proxies
  }
})
