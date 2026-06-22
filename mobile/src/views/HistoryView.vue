<template>
  <div class="page">
    <header class="header">
      <h1 class="header-title">历史记录</h1>
      <button class="clear-all" v-if="records.length > 0" @click="confirmClear">清空</button>
    </header>

    <div class="empty" v-if="records.length === 0 && !loading">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <p>暂无识别记录</p>
    </div>

    <div class="list" v-else>
      <div
        v-for="record in records"
        :key="record.id"
        class="record-card card"
        @click="viewDetail(record)"
      >
        <div class="record-thumb" v-if="record.thumbnail">
          <img :src="record.thumbnail" alt="" />
        </div>
        <div class="record-info">
          <div class="record-type">
            <span class="badge" :class="record.type">{{ typeLabels[record.type] }}</span>
            <span class="record-time">{{ formatTime(record.timestamp) }}</span>
          </div>
          <p class="record-summary">
            {{ record.summary }}
            <span v-if="record.matchedCount != null && record.totalFields != null" class="match-badge" :class="record.overallMatch ? 'pass' : 'fail'">
              {{ record.matchedCount }}/{{ record.totalFields }}
            </span>
          </p>
        </div>
        <button class="delete-btn" @click.stop="removeRecord(record.id)">✕</button>
      </div>

      <!-- Load more -->
      <div class="load-more" v-if="hasMore">
        <button class="btn-load" @click="loadMoreRecords" :disabled="loading">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <!-- Loading spinner for initial load -->
    <div class="loading" v-if="loading && records.length === 0">
      <span class="spinner"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { useToast } from '@/composables/useToast'
import { fetchRecordDetail } from '@/api/nickel'
import type { HistoryRecord } from '@/types'

const router = useRouter()
const historyStore = useHistoryStore()
const { danger, success } = useToast()

const typeLabels: Record<string, string> = {
  recognize: '标签识别',
  spraycode: '喷码OCR',
  compare: '喷码对比',
}

const records = computed(() => historyStore.records)
const loading = computed(() => historyStore.loading)
const hasMore = computed(() => historyStore.hasMore)

// 按需加载：在 HistoryView 挂载时触发，而非 store 初始化时
onMounted(() => {
  if (historyStore.records.length === 0) {
    historyStore.load()
  }
})

const formatTime = (ts: string) => {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `今天 ${time}`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + time
}

const viewDetail = async (record: HistoryRecord) => {
  // 从服务端获取完整记录详情
  try {
    const res = await fetchRecordDetail(record.id)
    if (res.success && res.data) {
      const detail = {
        id: res.data.id,
        type: 'compare',
        timestamp: res.data.createdAt,
        thumbnail: res.data.images?.find(i => i.imageType === 'spraycode')?.url || undefined,
        summary: res.data.summary?.overallMatch ? '对比一致' : '对比不一致',
        result: {
          success: true,
          data: {
            id: res.data.id,
            compareResults: res.data.compareResults,
            summary: res.data.summary,
            sprayCodeData: res.data.sprayCodeData,
          },
          message: res.data.message,
          timestamp: res.data.createdAt,
        },
      }
      sessionStorage.setItem('markapp_detail', JSON.stringify(detail))
      router.push('/result/' + record.id)
    }
  } catch (e) {
    // 降级：使用本地缓存
    sessionStorage.setItem('markapp_detail', JSON.stringify(record))
    router.push('/result/' + record.id)
  }
}

const removeRecord = (id: string) => {
  historyStore.remove(id)
}

const confirmClear = () => {
  if (confirm('确认清空所有历史记录？')) {
    historyStore.clear()
    success('历史记录已清空')
  }
}

const loadMoreRecords = () => {
  historyStore.loadMore()
}
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--tab-height) + var(--space-8));
}
.header {
  padding-top: var(--safe-top);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}
.header-title { font-size: 24px; font-weight: 700; }
.clear-all {
  font-size: 13px;
  color: var(--red);
  font-weight: 500;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: var(--space-4);
  color: var(--text-tertiary);
  font-size: 14px;
}

.record-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.record-thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  flex-shrink: 0;
}
.record-thumb img { width: 100%; height: 100%; object-fit: cover; }
.record-info { flex: 1; min-width: 0; }
.record-type {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 2px;
}
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.badge.recognize { background: var(--accent-soft); color: var(--accent); }
.badge.spraycode { background: var(--amber-soft); color: var(--amber); }
.badge.compare { background: var(--green-soft); color: var(--green); }
.record-time { font-size: 11px; color: var(--text-tertiary); }
.record-summary {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.match-badge {
  font-size: 11px;
  font-weight: 600;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
}
.match-badge.pass { background: var(--green-soft); color: var(--green); }
.match-badge.fail { background: var(--red-soft); color: var(--red); }
.delete-btn {
  width: 24px; height: 24px;
  color: var(--text-tertiary);
  font-size: 12px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.delete-btn:active { color: var(--red); }

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--space-4) 0;
}
.btn-load {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
  padding: var(--space-2) var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.btn-load:disabled { opacity: 0.5; }

.loading {
  display: flex;
  justify-content: center;
  padding: var(--space-8);
}
</style>
