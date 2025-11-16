import { defineStore } from 'pinia'
import { ref } from 'vue'

interface AuthCheckResponse {
  hasUser: boolean
  username: string | null
}

interface AuthResponse {
  success: boolean
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const username = ref<string | null>(null)
  const hasUser = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  async function checkAuth() {
    try {
      const data = await $fetch<AuthCheckResponse>('/api/auth/check')
      hasUser.value = data.hasUser
      username.value = data.username
      // 只在客户端检查 localStorage
      if (data.hasUser && import.meta.client && localStorage.getItem('isAuthenticated') === 'true') {
        isAuthenticated.value = true
      }
      return data
    }
    catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function register(credentials: { username: string, password: string, frpMode: 'client' | 'server' }) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: credentials
      })
      isAuthenticated.value = true
      username.value = data.username
      hasUser.value = true
      if (import.meta.client) {
        localStorage.setItem('isAuthenticated', 'true')
      }
      return data
    }
    catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function login(credentials: { username: string, password: string }) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: credentials
      })
      isAuthenticated.value = true
      username.value = data.username
      if (import.meta.client) {
        localStorage.setItem('isAuthenticated', 'true')
      }
      return data
    }
    catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  function logout() {
    isAuthenticated.value = false
    username.value = null
    if (import.meta.client) {
      localStorage.removeItem('isAuthenticated')
    }
  }

  return {
    isAuthenticated,
    username,
    hasUser,
    loading,
    error,
    isInitialized,
    checkAuth,
    register,
    login,
    logout
  }
})

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as any).data
    if (data && typeof data === 'object' && 'message' in data) {
      return String(data.message)
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
