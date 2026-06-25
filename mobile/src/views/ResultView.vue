<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="router.back()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="title-3">对比结果</h1>
    </header>

    <!-- Status Card -->
    <section class="status-card" v-if="record">
      <div class="status-icon" :class="overallMatch ? 'success' : 'fail'">
        <svg v-if="overallMatch" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <div class="status-text">
        <span class="status-title">{{ overallMatch ? '完全一致' : '发现不一致' }}</span>
        <span class="status-desc">{{ summaryText }}</span>
      </div>
      <div class="status-indicator" :class="overallMatch ? 'success' : 'fail'">
        <span v-if="overallMatch" class="indicator-text">通过</span>
        <span v-else class="indicator-text">异常</span>
      </div>
    </section>

    <!-- Field Comparison -->
    <section class="comparison-card">
      <div class="comp-header">
        <span class="comp-header-title">字段对比</span>
        <span class="comp-header-count" v-if="compareItems.length > 0">{{ compareItems.length }} 项</span>
      </div>
      <div v-for="item in compareItems" :key="item.label" class="comp-row" :class="item.status">
        <div class="comp-label">{{ item.label }}</div>
        <div class="comp-values">
          <span class="comp-val spray">{{ item.spraycode || '-' }}</span>
          <span class="comp-val label">{{ item.labelValue || '-' }}</span>
        </div>
        <div class="comp-badge" :class="item.status">
          <svg v-if="item.status === 'match'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchRecordDetail } from '@/api/nickel'
import type { CompareResult, CompareSummary, CompareResultItem, HistoryRecord } from '@/types'

const router = useRouter()
const route = useRoute()

const record = ref<HistoryRecord | null>(null)

onMounted(async () => {
  const cached = sessionStorage.getItem('markapp_detail')
  if (cached) {
    try {
      record.value = JSON.parse(cached)
    } catch { /* ignore parse error */ }
    sessionStorage.removeItem('markapp_detail')
  }

  const id = route.params.id as string
  if (!record.value && id) {
    try {
      const res = await fetchRecordDetail(id)
      if (res.success && res.data) {
        record.value = {
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
          } as CompareResult,
        }
      }
    } catch (e) {
      console.warn('[ResultView] 获取记录详情失败:', e instanceof Error ? e.message : e)
    }
  }
})

const compareData = computed(() => (record.value?.result as CompareResult)?.data || null)
const overallMatch = computed(() => compareData.value?.summary?.overallMatch ?? false)
const summaryText = computed(() => {
  const s = compareData.value?.summary as CompareSummary | undefined
  if (!s) return ''
  return `${s.matched} 项匹配${s.mismatched > 0 ? `，${s.mismatched} 项不一致` : ''}`
})

const compareItems = computed(() => {
  const results = compareData.value?.compareResults as CompareResultItem[] | undefined
  if (!results || !Array.isArray(results)) return []
  return results.map((r) => ({
    label: r.fieldLabelCn || r.field,
    spraycode: r.sprayCodeValue ?? '-',
    labelValue: r.labelValue ?? '-',
    status: r.matched ? 'match' : 'mismatch',
  }))
})
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: var(--space-8);
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: 0;
  margin-bottom: var(--space-6);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 50%;
  color: var(--accent);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
  border: none;
}

.back-btn:active {
  background: var(--bg-tertiary);
  transform: scale(0.92);
}

.title-3 {
  font-size: var(--text-title-1);
  font-weight: 700;
  letter-spacing: -0.021em;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-5);
  animation: fadeUp 0.4s var(--ease-out-expo);
}

.status-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--duration-micro) var(--ease-out);
}

.status-icon:active {
  transform: scale(0.95);
}

.status-icon.success {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid var(--green-border);
}

.status-icon.fail {
  background: var(--red-soft);
  color: var(--red);
  border: 1px solid var(--red-border);
}

.status-title { display: block; font-size: var(--text-title-2); font-weight: 700; }
.status-desc { display: block; font-size: var(--text-footnote); color: var(--text-tertiary); margin-top: 3px; }

.status-indicator {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-caption-2);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-indicator.success {
  background: var(--green-soft);
  color: var(--green);
}

.status-indicator.fail {
  background: var(--red-soft);
  color: var(--red);
}

/* Comparison */
.comparison-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  animation: fadeUp 0.5s var(--ease-out-expo) 0.1s both;
}

.comp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 0.5px solid var(--separator);
}

.comp-header-title {
  font-size: var(--text-caption-1);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.comp-header-count {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  font-weight: 500;
}

.comp-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 0.5px solid var(--separator);
  transition: background var(--duration-fast) var(--ease-out);
}

.comp-row:last-child { border-bottom: none; }
.comp-row:active { background: var(--surface-pressed); }

.comp-row.mismatch {
  background: var(--red-soft);
}

.comp-label {
  min-width: 60px;
  font-size: var(--text-caption-2);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.comp-values { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.comp-val {
  font-size: var(--text-subhead);
  font-family: var(--font-mono);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.comp-val.spray { color: var(--text); }
.comp-val.label { color: var(--text-tertiary); font-size: var(--text-footnote); }

.comp-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-out);
}

.comp-badge:active {
  transform: scale(0.9);
}

.comp-badge.match {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid var(--green-border);
}

.comp-badge.mismatch {
  background: var(--red-soft);
  color: var(--red);
  border: 1px solid var(--red-border);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
