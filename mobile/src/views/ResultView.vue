<template>
  <div class="page">
    <!-- Header -->
    <header class="header fade-up">
      <button class="back-btn" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="page-title">对比结果</h1>
    </header>

    <!-- Status Card -->
    <section class="status-card fade-up" v-if="record">
      <div class="status-icon" :class="overallMatch ? 'success' : 'fail'">
        <svg v-if="overallMatch" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>
      <div class="status-text">
        <span class="status-title">{{ overallMatch ? '完全一致' : '发现不一致' }}</span>
        <span class="status-desc">{{ summaryText }}</span>
      </div>
    </section>

    <!-- Field Comparison -->
    <section class="comparison fade-up">
      <div class="comp-title">字段对比</div>
      <div v-for="item in compareItems" :key="item.label" class="comp-row" :class="item.status">
        <div class="comp-label">{{ item.label }}</div>
        <div class="comp-values">
          <span class="comp-val spray">{{ item.spraycode || '—' }}</span>
          <span class="comp-val label">{{ item.labelValue || '—' }}</span>
        </div>
        <div class="comp-badge" :class="item.status">
          {{ item.status === 'match' ? '✓' : '✕' }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import type { CompareResult, CompareSummary, CompareResultItem } from '@/types'

const router = useRouter()
const historyStore = useHistoryStore()

const record = computed(() => {
  const r = historyStore.records.find(rec => rec.type === 'compare' && rec.result)
  return r || null
})

const compareData = computed(() => (record.value?.result as CompareResult)?.data || null)
const overallMatch = computed(() => compareData.value?.summary?.overallMatch ?? false)
const summaryText = computed(() => {
  const s = compareData.value?.summary as CompareSummary | undefined
  if (!s) return ''
  return `${s.matched} 项匹配${s.mismatched > 0 ? `, ${s.mismatched} 项不一致` : ''}`
})

const compareItems = computed(() => {
  const results = compareData.value?.compareResults as CompareResultItem[] | undefined
  if (!results || !Array.isArray(results)) return []
  return results.map((r) => ({
    label: r.fieldLabelCn || r.field,
    spraycode: r.sprayCodeValue ?? '—',
    labelValue: r.labelValue ?? '—',
    status: r.matched ? 'match' : 'mismatch',
  }))
})
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: var(--space-8);
}
.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--safe-top);
  margin-bottom: var(--space-6);
}
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  transition: background var(--duration-fast);
  flex-shrink: 0;
}
.back-btn:active { background: var(--bg-secondary); }
.page-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }

/* ── Status Card ── */
.status-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-5);
}
.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
.status-title { display: block; font-size: 16px; font-weight: 600; }
.status-desc { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }

/* ── Comparison Rows ── */
.comparison {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.comp-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  padding: var(--space-3) var(--space-4);
  background: var(--bg);
}
.comp-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 0.5px solid var(--border);
}
.comp-row:last-child { border-bottom: none; }
.comp-row.mismatch { background: var(--red-soft); }
.comp-label {
  min-width: 60px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.comp-values { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.comp-val {
  font-size: 14px;
  font-family: var(--font-mono);
  font-weight: 500;
  letter-spacing: 0.03em;
}
.comp-val.spray { color: var(--text); }
.comp-val.label { color: var(--text-secondary); font-size: 13px; }
.comp-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
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
</style>
