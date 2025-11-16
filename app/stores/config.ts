import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref } from 'vue'

interface FrpConfigResponse {
  config?: string
  updatedAt?: string
}

interface FrpApplyResponse {
  config?: string
  updatedAt?: string
}

export type ThemeMode = 'system' | 'light' | 'dark'

type FrpPackageStatus = 'idle' | 'updating'

interface FrpPackageState {
  version: string | null
  releaseName: string | null
  updatedAt: string | null
  downloadUrl: string | null
  status: FrpPackageStatus
  installed?: boolean
  binaryExists?: boolean
  configExists?: boolean
}

interface AppSettingsResponse {
  theme: ThemeMode
  frp: FrpPackageState
}

export interface AccountDraft {
  username: string
  password: string
  confirmPassword: string
}

const DEFAULT_ACCOUNT_DRAFT: AccountDraft = {
  username: '',
  password: '',
  confirmPassword: ''
}

export const useConfigStore = defineStore('config', () => {
  const frpOriginal = ref('')
  const frpDraft = ref('')
  const frpLoading = ref(false)
  const frpSaving = ref(false)
  const frpError = ref<string | null>(null)
  const frpUpdatedAt = ref<string | null>(null)

  const theme = ref<ThemeMode>('system')
  const themeSaving = ref(false)

  const frpPackage = reactive<FrpPackageState>({
    version: null,
    releaseName: null,
    updatedAt: null,
    downloadUrl: null,
    status: 'idle',
    installed: false,
    binaryExists: false,
    configExists: false
  })
  const frpPackageLoading = ref(false)

  const accountDraft = reactive<AccountDraft>({ ...DEFAULT_ACCOUNT_DRAFT })
  const accountSaving = ref(false)
  const accountSavedAt = ref<string | null>(null)

  const isFrpDirty = computed(() => frpDraft.value !== frpOriginal.value)

  const frpHasError = computed(() => Boolean(frpError.value))

  async function fetchFrpConfig() {
    frpLoading.value = true
    frpError.value = null
    try {
      const { data } = await useFetch<FrpConfigResponse>('/api/config/frp')
      frpOriginal.value = data.value?.config ?? ''
      frpDraft.value = frpOriginal.value
      frpUpdatedAt.value = data.value?.updatedAt ?? null
    }
    catch (error) {
      frpError.value = extractErrorMessage(error)
      throw error
    }
    finally {
      frpLoading.value = false
    }
  }

  async function saveFrpConfig(options: { restart?: boolean } = {}) {
    if (!isFrpDirty.value || frpSaving.value) {
      return
    }
    frpSaving.value = true
    frpError.value = null
    try {
      const payload = {
        config: frpDraft.value,
        restart: options.restart !== false
      }
      const { data } = await useFetch<FrpApplyResponse>('/api/config/frp', {
        method: 'PUT',
        body: payload
      })
      frpOriginal.value = data.value?.config ?? frpDraft.value
      frpDraft.value = frpOriginal.value
      frpUpdatedAt.value = data.value?.updatedAt ?? new Date().toISOString()
    }
    catch (error) {
      frpError.value = extractErrorMessage(error)
      throw error
    }
    finally {
      frpSaving.value = false
    }
  }

  function setFrpDraft(value: string) {
    frpDraft.value = value
  }

  function resetFrpDraft() {
    frpDraft.value = frpOriginal.value
  }

  async function fetchAppSettings() {
    const data = await $fetch<AppSettingsResponse>('/api/config/app')
    theme.value = data.theme
    Object.assign(frpPackage, data.frp)
  }

  async function updateTheme(value: ThemeMode) {
    if (themeSaving.value) {
      return
    }
    themeSaving.value = true
    try {
      const data = await $fetch<{ theme: ThemeMode }>('/api/config/app', {
        method: 'PUT',
        body: { theme: value }
      })
      theme.value = data.theme
    }
    finally {
      themeSaving.value = false
    }
  }

  async function refreshFrpPackage() {
    if (frpPackageLoading.value) {
      return
    }
    frpPackageLoading.value = true
    frpPackage.status = 'updating'
    try {
      const data = await $fetch<FrpPackageState>('/api/config/frp-version', {
        method: 'POST'
      })
      Object.assign(frpPackage, data)
    }
    finally {
      frpPackageLoading.value = false
    }
  }

  function updateAccountDraft(partial: Partial<AccountDraft>) {
    Object.assign(accountDraft, partial)
  }

  async function saveAccountDraft() {
    if (accountSaving.value) {
      return
    }
    accountSaving.value = true
    await nextTick()
    accountSaving.value = false
    accountSavedAt.value = new Date().toISOString()
  }

  function resetAccountDraft() {
    Object.assign(accountDraft, DEFAULT_ACCOUNT_DRAFT)
    accountSavedAt.value = null
  }

  return {
    frpOriginal,
    frpDraft,
    frpLoading,
    frpSaving,
    frpError,
    frpUpdatedAt,
    theme,
    themeSaving,
    frpPackage,
    frpPackageLoading,
    accountDraft,
    accountSaving,
    accountSavedAt,
    isFrpDirty,
    frpHasError,
    fetchFrpConfig,
    fetchAppSettings,
    saveFrpConfig,
    setFrpDraft,
    resetFrpDraft,
    updateTheme,
    refreshFrpPackage,
    updateAccountDraft,
    saveAccountDraft,
    resetAccountDraft
  }
})

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
