import { BaseStorage } from './base'
import { useStorage } from './use-storage'

export type ThemeMode = 'system' | 'light' | 'dark'
export type FrpMode = 'client' | 'server'

class AppStorage extends BaseStorage<{
  theme: ThemeMode
  frpMode: FrpMode
  username: string
  hashedPassword: string
  githubToken: string
}> {
  theme: ThemeMode = 'system'
  frpMode: FrpMode = 'server'
  username = ''
  hashedPassword = ''
  githubToken = ''
}

export const appStorage = useStorage(AppStorage)
