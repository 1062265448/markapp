import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'warning' | 'danger' | 'info'
}

export const toasts = ref<ToastItem[]>([])
let nextId = 0

export function useToast() {
  const show = (message: string, type: ToastItem['type'] = 'info', duration = 2500) => {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  const success = (message: string) => show(message, 'success')
  const warning = (message: string) => show(message, 'warning')
  const danger = (message: string) => show(message, 'danger')

  return { toasts, show, success, warning, danger }
}
