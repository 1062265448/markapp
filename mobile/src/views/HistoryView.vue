<template>
  <div class="page">
    <header class="header">
      <h1 class="title-1">历史记录</h1>
      <button class="clear-btn-text" v-if="records.length > 0" @click="confirmClear">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>清空</span>
      </button>
    </header>

    <!-- Empty state -->
    <div class="empty-state" v-if="records.length === 0 && !loading">
      <div class="empty-state-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div class="empty-state-title">暂无记录</div>
      <div class="empty-state-text">识别或对比后的记录将显示在这里</div>
    </div>

    <!-- Records list -->
    <div class="list" v-else>
      <div
        v-for="(record, index) in records"
        :key="record.id"
        class="record-card"
        :class="{ 'stagger-delay': index < 10 }"
        :style="index < 10 ? { animationDelay: `${index * 0.04}s` } : {}"
        @click="viewDetail(record)"
      >
        <div class="record-thumb" v-if="record.thumbnail">
          <img :src="record.thumbnail" alt="" />
        </div>
        <div class="record-thumb-placeholder" v-else>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
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
        <button class="delete-btn" @click.stop="removeRecord(record.id)" aria-label="删除记录">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Load more -->
      <div class="load-more" v-if="hasMore">
        <button class="btn-load" @click="loadMoreRecords" :disabled="loading">
          <span v-if="loading" class="spinner" style="margin-right:8px;"></span>
          <span>{{ loading ? '加载中...' : '加载更多' }}</span>
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div class="loading-state" v-if="loading && records.length === 0">
      <span class="spinner spinner-lg"></span>
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

onMounted(() => {
  if (historyStore.records.length === 0) {
    historyStore.load()
  }
})

const formatTime = (ts: string) => {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `今天 ${time}`
  if (isYesterday) return `昨天 ${time}`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + time
}

const viewDetail = async (record: HistoryRecord) => {
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
    success('历史记录已清除')
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
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.header {
  padding-top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.title-1 {
  font-size: var(--text-large-title);
  font-weight: 700;
  letter-spacing: -0.021em;
  font-family: var(--font-display);
  background: linear-gradient(135deg, var(--text) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.clear-btn-text {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-subhead);
  color: var(--red);
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-xs);
  transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}

.clear-btn-text:active {
  background: var(--red-soft);
  transform: scale(0.95);
}

/* Record cards */
.record-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  box-shadow: var(--shadow-xs);
  opacity: 0;
  transform: translateY(10px);
  animation: staggerItem 0.45s var(--ease-out-expo) forwards;
}

.record-card.stagger-delay {
  /* animation-delay is set inline */
}

.record-card:active {
  transform: scale(0.985);
  background: var(--surface-pressed);
  box-shadow: var(--shadow-md);
}

@keyframes staggerItem {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.record-thumb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-inner);
}

.record-thumb img { width: 100%; height: 100%; object-fit: cover; }

.record-thumb-placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xs);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  flex-shrink: 0;
  box-shadow: var(--shadow-inner);
}

.record-info { flex: 1; min-width: 0; }

.record-type {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 3px;
}

.badge {
  font-size: var(--text-caption-2);
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  letter-spacing: 0.01em;
  border: 0.5px solid transparent;
}

.badge.recognize { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-border); }
.badge.spraycode { background: var(--amber-soft); color: var(--amber); border-color: var(--amber-border); }
.badge.compare { background: var(--green-soft); color: var(--green); border-color: var(--green-border); }

.record-time {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  font-weight: 400;
}

.record-summary {
  font-size: var(--text-footnote);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}

.match-badge {
  font-size: var(--text-caption-2);
  font-weight: 600;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  letter-spacing: 0.01em;
  border: 0.5px solid transparent;
}

.match-badge.pass { background: var(--green-soft); color: var(--green); border-color: var(--green-border); }
.match-badge.fail { background: var(--red-soft); color: var(--red); border-color: var(--red-border); }

.delete-btn {
  width: 28px;
  height: 28px;
  color: var(--text-quaternary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  padding: 0;
}

.delete-btn:active {
  color: var(--red);
  background: var(--red-soft);
  transform: scale(0.9);
}

/* Load more */
.load-more {
  display: flex;
  justify-content: center;
  padding: var(--space-4) 0;
}

.btn-load {
  font-size: var(--text-subhead);
  color: var(--accent);
  font-weight: 600;
  padding: var(--space-2) var(--space-5);
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-xs);
}

.btn-load:active {
  transform: scale(0.97);
  background: var(--accent-soft);
  border-color: var(--accent-border);
  box-shadow: var(--shadow-sm);
}

.btn-load:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Loading state */
.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--space-10) 0;
}
</style>
