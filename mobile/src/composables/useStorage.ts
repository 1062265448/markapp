/**
 * 统一存储抽象：原生端用 Capacitor Preferences（应用沙箱、SharedPreferences），
 * Web 端降级到 localStorage。token 存于此处避免 localStorage 在 WebView 外的暴露。
 */
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const useNative = Capacitor.isNativePlatform()

export const storage = {
  async get(key: string): Promise<string | null> {
    if (useNative) {
      const { value } = await Preferences.get({ key })
      return value
    }
    return localStorage.getItem(key)
  },

  async set(key: string, value: string): Promise<void> {
    if (useNative) {
      await Preferences.set({ key, value })
    } else {
      localStorage.setItem(key, value)
    }
  },

  async remove(key: string): Promise<void> {
    if (useNative) {
      await Preferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      await this.remove(key)
      return null
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value))
  },
}
