import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { storage } from '@/composables/useStorage'
import { authToken } from '@/composables/authToken'

export interface User {
  id: string
  username: string
}

interface LoginApiResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

const TOKEN_KEY = 'markapp_token'
const USER_KEY = 'markapp_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  const initAuth = async () => {
    const [savedToken, savedUser] = await Promise.all([
      storage.get(TOKEN_KEY),
      storage.getJson<User>(USER_KEY),
    ])
    token.value = savedToken
    authToken.set(savedToken)
    user.value = savedUser
    // 启动时校验 token（API 失败则清空）
    if (token.value) {
      void verifyToken()
    }
  }

  const verifyToken = async (): Promise<boolean> => {
    if (!token.value) return false
    try {
      const baseURL = axios.defaults.baseURL || ''
      const res = await axios.get<{ data: User }>(`${baseURL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
        timeout: 5000,
      })
      if (res.data?.data) {
        user.value = res.data.data
        await storage.setJson(USER_KEY, res.data.data)
        return true
      }
      await clearAuth()
      return false
    } catch {
      await clearAuth()
      return false
    }
  }

  const setAuth = async (data: LoginApiResponse) => {
    token.value = data.access_token
    authToken.set(data.access_token)
    user.value = data.user
    await Promise.all([
      storage.set(TOKEN_KEY, data.access_token),
      storage.setJson(USER_KEY, data.user),
    ])
    error.value = null
  }

  const clearAuth = async () => {
    token.value = null
    authToken.set(null)
    user.value = null
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)])
  }

  const login = async (credentials: { username: string; password: string }) => {
    loading.value = true
    error.value = null
    try {
      const baseURL = axios.defaults.baseURL || ''
      const res = await axios.post<{ success: boolean; data: LoginApiResponse; message?: string }>(
        `${baseURL}/api/auth/login`,
        credentials,
        { timeout: 10000 },
      )
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.message || '登录失败')
      }
      await setAuth(res.data.data)
      return res.data.data
    } catch (e: unknown) {
      await clearAuth()
      const msg = e instanceof Error ? e.message : '登录失败'
      error.value = msg
      throw new Error(msg)
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    await clearAuth()
  }

  // 启动初始化（首次进入异步加载 token）
  void initAuth()

  return { token, user, loading, error, isAuthenticated, login, logout, initAuth, verifyToken }
})
