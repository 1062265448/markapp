import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { Capacitor } from '@capacitor/core'
import { authToken } from '@/composables/authToken'

const DEV_API_URL = 'http://localhost:3003'

// 原生端优先使用环境变量配置，回退到开发地址
const NATIVE_API_URL = import.meta.env.VITE_NATIVE_API_URL || DEV_API_URL

const BASE_URL = Capacitor.isNativePlatform()
  ? NATIVE_API_URL
  : (import.meta.env.VITE_API_BASE_URL || DEV_API_URL)

interface RequestInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<R = any>(url: string, config?: AxiosRequestConfig): Promise<R>
  post<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  put<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  delete<R = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
}

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // AI识别需要较长超时
}) as RequestInstance

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 用户 JWT（登录后由 auth store 同步注入内存缓存）
    const token = authToken.get()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    console.error('[API Error]', msg)
    return Promise.reject(new Error(msg))
  }
)

export default request
