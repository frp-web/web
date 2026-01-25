/**
 * 将进度值 (0-1) 转换为百分比整数 (0-100)
 */
export function toPercent(progress: number): number {
  return Math.round(progress * 100)
}

/**
 * 将进度值 (0-1) 转换为保留两位小数的百分比 (0-100)
 */
export function toPercentFixed(progress: number): number {
  return Math.round(progress * 10000) / 100
}
