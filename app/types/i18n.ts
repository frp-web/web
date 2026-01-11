/**
 * 支持的语言代码
 */
export type LocaleCode = 'zh-CN' | 'en-US'

/**
 * 语言配置对象
 */
export interface LocaleObject {
  code: LocaleCode
  name: string
  file?: string
}

/**
 * 语言列表类型
 */
export type LocaleList = LocaleObject[]
