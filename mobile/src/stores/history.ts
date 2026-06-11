import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryRecord, RecognitionResult, SpraycodeResult } from '@/types'

const STORAGE_KEY = 'markapp_history'

export const useHistoryStore = defineStore('history', () => {
  const records = ref<HistoryRecord[]>([])

  // 从 localStorage 加载
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) records.value = JSON.parse(raw)
    } catch { /* ignore */ }
  }

  // 保存到 localStorage
  function persist() {
    try {
      // 只保留最近100条
      const toSave = records.value.slice(0, 100)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch { /* ignore */ }
  }

  // 添加识别记录
  function addRecognize(result: RecognitionResult, thumbnail?: string) {
    const summary = result.success
      ? (result.data.allPassed ? '校验全部通过' : `发现${result.data.errorCount}错误/${result.data.warningCount}警告`)
      : '识别失败'

    records.value.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'recognize',
      timestamp: result.timestamp,
      thumbnail,
      summary,
      result,
    })
    persist()
  }

  // 添加喷码识别记录
  function addSpraycode(result: SpraycodeResult, thumbnail?: string) {
    records.value.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'spraycode',
      timestamp: result.timestamp,
      thumbnail,
      summary: result.success ? '喷码识别成功' : '喷码识别失败',
      result,
    })
    persist()
  }

  // 添加对比记录
  function addCompare(result: any, thumbnail?: string) {
    const summary = result.data?.summary?.overallMatch ? '对比一致' : '对比不一致'
    records.value.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'compare',
      timestamp: result.timestamp,
      thumbnail,
      summary,
      result,
    })
    persist()
  }

  // 删除记录
  function remove(id: string) {
    records.value = records.value.filter(r => r.id !== id)
    persist()
  }

  // 清空
  function clear() {
    records.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  const recent = computed(() => records.value.slice(0, 20))

  // 初始化加载
  load()

  return { records, recent, addRecognize, addSpraycode, addCompare, remove, clear, load }
})
