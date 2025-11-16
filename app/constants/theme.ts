/**
 * 主题颜色配置
 * 用于 UnoCSS 和 Ant Design Vue 的统一颜色管理
 */

import { theme } from 'ant-design-vue'

export const themeColors = {
  light: {
    primary: '#6040ec',
    secondary: '#7c5cff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    // 背景色
    bgBase: '#f5f5f5', // 页面背景
    bgContainer: '#ffffff', // 容器背景
    bgElevated: '#ffffff', // 悬浮容器
    // 文字色
    textPrimary: '#000000d9', // 主要文字
    textSecondary: '#00000073', // 次要文字
    textTertiary: '#00000045', // 辅助文字
    // 边框色
    borderBase: '#d9d9d9',
    borderLight: '#f0f0f0'
  },
  dark: {
    primary: '#7c5cff',
    secondary: '#9575ff',
    success: '#73d13d',
    warning: '#ffc53d',
    error: '#ff7875',
    info: '#40a9ff',
    // 背景色 - 使用更柔和的深色
    bgBase: '#141414', // 页面背景
    bgContainer: '#1f1f1f', // 容器背景
    bgElevated: '#2a2a2a', // 悬浮容器
    // 文字色
    textPrimary: '#ffffffd9', // 主要文字
    textSecondary: '#ffffff73', // 次要文字
    textTertiary: '#ffffff45', // 辅助文字
    // 边框色
    borderBase: '#434343',
    borderLight: '#303030'
  }
} as const

/**
 * 获取当前主题的颜色配置
 */
export function getThemeColors(isDark: boolean) {
  return isDark ? themeColors.dark : themeColors.light
}

/**
 * Ant Design Vue 主题配置
 */
export function getAntdTheme(isDark: boolean) {
  const colors = getThemeColors(isDark)
  return {
    // 使用 Ant Design 的深色算法
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      colorError: colors.error,
      colorInfo: colors.info,
      colorBgBase: colors.bgBase,
      colorBgContainer: colors.bgContainer,
      colorBgElevated: colors.bgElevated,
      colorText: colors.textPrimary,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textTertiary,
      colorBorder: colors.borderBase,
      colorBorderSecondary: colors.borderLight
    },
    components: {
      Menu: {
        itemSelectedBg: isDark ? colors.bgElevated : '#f5f0ff',
        itemSelectedColor: colors.primary
      }
    }
  }
}
