import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('markapp_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const initAuth = () => {
    const saved = localStorage.getItem('markapp_user')
    if (saved) {
      try { user.value = JSON.parse(saved) } catch { clearAuth() }
    }
  }

  const setAuth = (data: { access_token: string; user: User }) => {
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('markapp_token', data.access_token)
    localStorage.setItem('markapp_user', JSON.stringify(data.user))
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('markapp_token')
    localStorage.removeItem('markapp_user')
  }

  const login = async (credentials: { username: string; password: string }) => {
    loading.value = true
    try {
      // TODO: 替换为真正的后端登录 API
      // 当前为开发模式演示登录
      const demoToken = 'demo_' + Date.now().toString(36)
      setAuth({
        access_token: demoToken,
        user: { id: '1', username: credentials.username },
      })
      return { access_token: demoToken, user: { id: '1', username: credentials.username } }
    } catch (e: unknown) {
      clearAuth()
      throw e instanceof Error ? e : new Error('登录失败')
    } finally {
      loading.value = false
    }
  }

  const logout = () => { clearAuth() }

  initAuth()

  return { token, user, loading, isAuthenticated, login, logout, initAuth }
})
