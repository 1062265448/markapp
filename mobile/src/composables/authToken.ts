/**
 * 同步访问当前 JWT token 的内存缓存。
 * 供 axios 拦截器使用（拦截器无法 await Promise）。
 * 与 storage（Capacitor Preferences / localStorage）配合：auth store 更新时同步刷新这里。
 */
let currentToken: string | null = null

export const authToken = {
  get: () => currentToken,
  set: (token: string | null) => {
    currentToken = token
  },
}
