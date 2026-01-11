import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

/**
 * 格式化运行时间
 * @param uptimeMs 运行时间（毫秒）
 * @param t i18n 翻译函数
 * @returns 格式化后的时间字符串，如 "2小时15分30秒"
 */
export function formatUptime(uptimeMs: number, t: (key: string) => string): string {
  if (uptimeMs <= 0)
    return ''

  const dur = dayjs.duration(uptimeMs)
  const parts: string[] = []

  const days = dur.days()
  const hours = dur.hours()
  const minutes = dur.minutes()
  const seconds = dur.seconds()

  if (days > 0)
    parts.push(`${days}${t('common.day')}`)
  if (hours > 0)
    parts.push(`${hours}${t('common.hour')}`)
  if (minutes > 0)
    parts.push(`${minutes}${t('common.minute')}`)
  if (seconds > 0 || parts.length === 0)
    parts.push(`${seconds}${t('common.second')}`)

  return parts.join(' ')
}
