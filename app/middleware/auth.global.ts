export default defineNuxtRouteMiddleware(async (to) => {
  // 登录页不需要认证
  if (to.path === '/login') {
    return
  }

  // 只在客户端执行认证检查
  if (!import.meta.client) {
    return
  }

  const authStore = useAuthStore()

  // 如果已经认证，直接通过
  if (authStore.isAuthenticated) {
    return
  }

  // 如果还未初始化，执行初始化检查
  if (!authStore.isInitialized) {
    try {
      await authStore.checkAuth()
    }
    catch {
      // 验证失败，清除 localStorage 并跳转到登录页
      if (import.meta.client) {
        localStorage.removeItem('isAuthenticated')
      }
      return navigateTo('/login')
    }
  }

  // 初始化完成后，检查认证状态
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
