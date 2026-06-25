<template>
  <div class="compare-card">
    <!-- Summary Banner -->
    <div class="summary-banner" :class="overallMatch ? 'passed' : 'failed'">
      <div class="summary-icon">
        <svg v-if="overallMatch" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <div class="summary-content">
        <span class="summary-text">{{ overallMatch ? '对比一致' : '对比不一致' }}</span>
        <span class="summary-rate" v-if="summary">
          通过率 {{ ((summary.matched / summary.totalFields) * 100).toFixed(0) }}%
        </span>
      </div>
    </div>

    <!-- Compare Details -->
    <div class="compare-section" v-if="compareResults && compareResults.length > 0">
      <div class="section-header">
        <span class="section-title">对比详情</span>
        <span class="section-count">{{ compareResults.length }} 项</span>
      </div>
      <div class="compare-list">
        <div
          v-for="(item, i) in compareResults"
          :key="i"
          class="compare-row"
          :class="{ match: item.matched, mismatch: !item.matched }"
          :style="i < 8 ? { animationDelay: `${i * 0.04}s` } : {}"
        >
          <div class="compare-status" :class="item.matched ? 'match' : 'mismatch'">
            <svg v-if="item.matched" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div class="compare-content">
            <span class="compare-field">{{ item.field }}</span>
            <div class="compare-values">
              <span class="val-spray">{{ item.sprayCodeValue ?? '-' }}</span>
              <span class="val-divider">/</span>
              <span class="val-label">{{ item.labelValue ?? '-' }}</span>
            </div>
            <span class="compare-msg" v-if="item.diffType">{{ item.diffType }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Spraycode Data -->
    <div class="spray-section" v-if="sprayData">
      <div class="section-header">
        <span class="section-title">喷码识别数据</span>
      </div>
      <div class="field-list">
        <div class="field-row" v-for="(val, key) in sprayDisplay" :key="key">
          <span class="field-label">{{ key }}</span>
          <span class="field-value">{{ val ?? '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompareResult } from '@/types'

const props = defineProps<{ result: CompareResult }>()

const compareResults = computed(() => props.result?.data?.compareResults || [])
const summary = computed(() => props.result?.data?.summary || null)
const overallMatch = computed(() => summary.value?.overallMatch ?? false)
const sprayData = computed(() => props.result?.data?.sprayCodeData || null)

const sprayDisplay = computed(() => {
  if (!sprayData.value) return {}
  return {
    '批号': sprayData.value.batchNo,
    '包号': sprayData.value.packNo,
    '生产日期': sprayData.value.productionDate,
    '净重': sprayData.value.netWeight,
    '毛重': sprayData.value.grossWeight,
    '块数': sprayData.value.pieces,
  }
})
</script>

<style scoped>
.compare-card { margin-bottom: var(--space-4); animation: cardAppear 0.5s var(--ease-out-expo); }

@keyframes cardAppear {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.summary-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius);
  font-weight: 600;
  font-size: var(--text-subhead);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  transition: all var(--duration-micro) var(--ease-out);
}

.summary-banner:active {
  transform: scale(0.985);
}

.summary-banner.passed { background: var(--green-soft); color: var(--green); border-color: var(--green-border); }
.summary-banner.failed { background: var(--red-soft); color: var(--red); border-color: var(--red-border); }

.summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.summary-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.summary-text { font-size: var(--text-title-2); font-weight: 700; }
.summary-rate { font-size: var(--text-footnote); font-weight: 500; opacity: 0.8; font-family: var(--font-mono); }

/* Section */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 0.5px solid var(--separator);
}

.section-title { font-size: var(--text-footnote); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); }
.section-count { font-size: var(--text-caption-2); color: var(--text-tertiary); font-weight: 500; }

.compare-section, .spray-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.compare-list { display: flex; flex-direction: column; }
.compare-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border-bottom: 0.5px solid var(--separator);
  transition: background var(--duration-fast) var(--ease-out);
  opacity: 0;
  animation: staggerRow 0.4s var(--ease-out-expo) forwards;
}

@keyframes staggerRow {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.compare-row:last-child { border-bottom: none; }
.compare-row:active { background: var(--surface-pressed); }
.compare-row.mismatch { background: var(--red-soft); }
.compare-row.mismatch:active { background: rgba(255, 59, 48, 0.15); }

.compare-status {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: transform var(--duration-fast) var(--ease-out);
}

.compare-status:active { transform: scale(0.9); }

.compare-status.match { background: var(--green-soft); color: var(--green); border: 1px solid var(--green-border); }
.compare-status.mismatch { background: var(--red-soft); color: var(--red); border: 1px solid var(--red-border); }

.compare-content { flex: 1; min-width: 0; }
.compare-field { font-size: var(--text-caption-2); color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: block; }

.compare-values { display: flex; align-items: center; gap: var(--space-2); margin-top: 4px; flex-wrap: wrap; }

.val-spray, .val-label { font-size: var(--text-subhead); font-family: var(--font-mono); font-weight: 500; }
.val-spray { color: var(--text); }
.val-label { color: var(--text-tertiary); }
.val-divider { color: var(--text-quaternary); font-size: var(--text-footnote); }

.compare-msg { font-size: var(--text-caption-2); color: var(--text-tertiary); margin-top: 3px; display: block; }

/* Spray data field list */
.field-list { display: flex; flex-direction: column; }
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 0.5px solid var(--separator);
  transition: background var(--duration-fast) var(--ease-out);
}
.field-row:last-child { border-bottom: none; }
.field-row:active { background: var(--surface-pressed); }

.field-label { font-size: var(--text-footnote); color: var(--text-secondary); font-weight: 500; }
.field-value { font-size: var(--text-subhead); font-weight: 500; font-family: var(--font-mono); letter-spacing: 0.02em; }
</style>
