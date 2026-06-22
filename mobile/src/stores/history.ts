import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryRecord, HistoryListItem, RecognitionResult, SpraycodeResult, CompareResult, CompareSummary } from '@/types'
import { fetchHistory, deleteHistoryRecord } from '@/api/nickel'

export const useHistoryStore = defineStore('history', () => {
  const records = ref<HistoryRecord[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)

  // 从服务端加载历史记录
  async function load(pageNum?: number, limitNum?: number) {
    if (pageNum !== undefined) page.value = pageNum
    if (limitNum !== undefined) limit.value = limitNum

    loading.value = true
    try {
      const res = await fetchHistory(page.value, limit.value)
      if (res.success && res.data) {
        const items: HistoryListItem[] = res.data.items
        records.value = items.map((item) => ({
          id: item.id,
          type: 'compare' as const,
          timestamp: item.createdAt,
          thumbnail: item.spraycodeImageUrl || undefined,
          summary: item.overallMatch ? '对比一致' : '对比不一致',
          overallMatch: item.overallMatch,
          matchedCount: item.matchedCount,
          totalFields: item.totalFields,
        }))
        total.value = res.data.total
        totalPages.value = res.data.totalPages
      }
    } catch (e: unknown) {
      console.warn('[History] 加载历史记录失败:', e instanceof Error ? e.message : e)
    } finally {
      loading.value = false
    }
  }

  // 加载更多（下一页）
  async function loadMore() {
    if (page.value < totalPages.value) {
      page.value++
      loading.value = true
      try {
        const res = await fetchHistory(page.value, limit.value)
        if (res.success && res.data) {
          const newItems: HistoryListItem[] = res.data.items
          const newRecords = newItems.map((item) => ({
            id: item.id,
            type: 'compare' as const,
            timestamp: item.createdAt,
            thumbnail: item.spraycodeImageUrl || undefined,
            summary: item.overallMatch ? '对比一致' : '对比不一致',
            overallMatch: item.overallMatch,
            matchedCount: item.matchedCount,
            totalFields: item.totalFields,
          }))
          records.value = [...records.value, ...newRecords]
          total.value = res.data.total
          totalPages.value = res.data.totalPages
        }
      } catch (e: unknown) {
        console.warn('[History] 加载更多失败:', e instanceof Error ? e.message : e)
      } finally {
        loading.value = false
      }
    }
  }

  // 添加识别记录（本地缓存，服务端已保存）
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
  }

  // 添加对比记录（使用服务端返回的 id）
  function addCompare(result: CompareResult, thumbnail?: string) {
    const summary = result.data.summary
    const isMatch = summary.matched === summary.totalFields
    records.value.unshift({
      id: result.data.id,
      type: 'compare',
      timestamp: result.timestamp,
      thumbnail,
      summary: isMatch ? '对比一致' : '对比不一致',
      overallMatch: isMatch,
      matchedCount: summary.matched,
      totalFields: summary.totalFields,
      result,
    })
  }

  // 删除记录
  async function remove(id: string) {
    try {
      await deleteHistoryRecord(id)
      records.value = records.value.filter(r => r.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (e: unknown) {
      console.warn('[History] 删除记录失败:', e instanceof Error ? e.message : e)
      // 即使服务端失败，也尝试本地移除
      records.value = records.value.filter(r => r.id !== id)
    }
  }

  // 清空（逐个删除）
  async function clear() {
    const ids = records.value.map(r => r.id)
    for (const id of ids) {
      try {
        await deleteHistoryRecord(id)
      } catch { /* ignore */ }
    }
    records.value = []
    total.value = 0
    totalPages.value = 0
  }

  const recent = computed(() => records.value.slice(0, 20))
  const hasMore = computed(() => page.value < totalPages.value)
  const currentRecord = computed(() => {
    if (records.value.length === 0) return null
    return records.value[0]
  })

  return {
    records, recent, loading, total, page, totalPages, hasMore, currentRecord,
    addRecognize, addSpraycode, addCompare, remove, clear, load, loadMore,
  }
})
