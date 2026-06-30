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
          :class="rowClass(item)"
          :style="i < 8 ? { animationDelay: `${i * 0.04}s` } : {}"
        >
          <div class="compare-status" :class="statusClass(item)">
            <svg v-if="item.matched === true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else-if="item.matched === false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span v-else class="status-dash">—</span>
          </div>
          <div class="compare-content">
            <div class="compare-field-row">
              <span class="compare-field">{{ item.fieldLabelCn }}</span>
              <span class="compare-field-en">{{ item.fieldLabelEn }}</span>
            </div>

            <div v-if="item.matched === true || item.matched === false" class="compare-sides">
              <div class="compare-side">
                <span class="side-label">喷码</span>
                <span class="side-value" :class="{ 'val-err': item.matched === false }">{{ item.sprayCodeValue ?? '-' }}</span>
              </div>
              <span class="side-sep">{{ item.matched === true ? '=' : '≠' }}</span>
              <div class="compare-side">
                <span class="side-label">标签</span>
                <span class="side-value" :class="{ 'val-err': item.matched === false }">
                  {{ item.labelValueCn ?? '-' }}
                  <template v-if="item.labelValueEn && item.labelValueEn !== item.labelValueCn"> / {{ item.labelValueEn }}</template>
                </span>
              </div>
            </div>

            <div v-else-if="item.diffType === 'both-missing'" class="compare-missing">
              <span class="missing-text">均未识别</span>
            </div>

            <div v-else class="compare-sides">
              <div class="compare-side">
                <span class="side-label">喷码</span>
                <span class="side-value" :class="{ 'val-missing': item.missingIn === 'spraycode' }">
                  {{ item.missingIn === 'spraycode' ? '未识别' : (item.sprayCodeValue ?? '-') }}
                </span>
              </div>
              <span class="side-sep">/</span>
              <div class="compare-side">
                <span class="side-label">标签</span>
                <span class="side-value" :class="{ 'val-missing': item.missingIn === 'label' }">
                  <template v-if="item.missingIn === 'label'">未识别</template>
                  <template v-else>
                    {{ item.labelValueCn ?? '-' }}
                    <template v-if="item.labelValueEn && item.labelValueEn !== item.labelValueCn"> / {{ item.labelValueEn }}</template>
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Spraycode Data -->
    <div class="detail-section" v-if="sprayData">
      <div class="section-header">
        <span class="section-title">喷码识别结果</span>
      </div>
      <div class="field-list">
        <div class="field-row" v-for="(val, key) in sprayDisplay" :key="key">
          <span class="field-label">{{ fieldLabels[key as string] || key }}</span>
          <span class="field-value" :class="{ 'val-empty': !val }">{{ val ?? '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Label Data -->
    <div class="detail-section" v-if="labelData && hasLabelData">
      <div class="section-header">
        <span class="section-title">标签识别结果</span>
      </div>
      <div class="field-list">
        <div class="field-row" v-for="(val, key) in labelDisplay" :key="key">
          <span class="field-label">{{ fieldLabels[key as string] || key }}</span>
          <span class="field-value" :class="{ 'val-empty': !val }">{{ val ?? '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompareResult, CompareResultItem } from '@/types'

const props = defineProps<{ result: CompareResult }>()

const compareResults = computed(() => props.result?.data?.compareResults || [])
const summary = computed(() => props.result?.data?.summary || null)
const overallMatch = computed(() => summary.value?.overallMatch ?? false)
const sprayData = computed(() => props.result?.data?.sprayCodeData || null)
const labelData = computed(() => props.result?.data?.labelCodeData || null)

const fieldLabels: Record<string, string> = {
  batchNo: '批号 / BATCH NO.',
  packNo: '包号 / PACK NO.',
  productionDate: '日期 / DATE',
  netWeight: '净重 / NET',
  grossWeight: '毛重 / GROSS',
  pieces: '块数 / PCS',
}

const sprayDisplay = computed(() => {
  if (!sprayData.value) return {}
  return {
    batchNo: sprayData.value.batchNo,
    packNo: sprayData.value.packNo,
    productionDate: sprayData.value.productionDate,
    netWeight: sprayData.value.netWeight,
    grossWeight: sprayData.value.grossWeight,
    pieces: sprayData.value.pieces,
  }
})

const labelDisplay = computed(() => {
  if (!labelData.value) return {}
  const d = labelData.value
  return {
    batchNo: d.batchNo?.cn ?? null,
    packNo: d.packNo?.cn ?? null,
    productionDate: d.productionDate?.cn ?? null,
    netWeight: d.netWeight?.cn ?? null,
  }
})

const hasLabelData = computed(() => {
  const d = labelDisplay.value
  return Object.values(d).some(v => v !== null && v !== undefined && v !== '')
})

const rowClass = (item: CompareResultItem) => {
  if (item.matched === true) return 'match'
  if (item.matched === false) return 'mismatch'
  if (item.diffType === 'both-missing') return 'both-missing'
  return 'missing'
}

const statusClass = (item: CompareResultItem) => {
  if (item.matched === true) return 'match'
  if (item.matched === false) return 'mismatch'
  return 'neutral'
}
</script>

<style scoped>
.compare-card { margin-bottom: var(--space-4); animation: cardAppear 0.6s var(--ease-out-expo) both; }

@keyframes cardAppear {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Summary Banner */
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
  border: 0.5px solid var(--border);
  transition: all var(--duration-micro) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.summary-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.06;
  pointer-events: none;
}

.summary-banner:active { transform: scale(0.985); }

.summary-banner.passed {
  background: var(--green-soft);
  color: var(--green);
  border-color: var(--green-border);
}
.summary-banner.passed::before { background: var(--gradient-green); }

.summary-banner.failed {
  background: var(--red-soft);
  color: var(--red);
  border-color: var(--red-border);
}
.summary-banner.failed::before { background: var(--gradient-red); }

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(4px) saturate(120%);
  -webkit-backdrop-filter: blur(4px) saturate(120%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.summary-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.summary-text { font-size: var(--text-title-2); font-weight: 700; }
.summary-rate { font-size: var(--text-footnote); font-weight: 500; opacity: 0.8; font-family: var(--font-mono); }

/* Section Header */
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

/* Compare Section */
.compare-section, .detail-section {
  background: var(--surface);
  border: 0.5px solid var(--border);
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
.compare-row.mismatch:active { background: rgba(255, 59, 48, 0.12); }
.compare-row.missing { background: var(--amber-soft, rgba(255, 149, 0, 0.04)); }
.compare-row.both-missing { background: var(--bg-secondary); }

/* Status Icon */
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
  box-shadow: var(--shadow-xs);
}

.compare-status:active { transform: scale(0.9); }
.compare-status.match { background: var(--green-soft); color: var(--green); border: 0.5px solid var(--green-border); }
.compare-status.mismatch { background: var(--red-soft); color: var(--red); border: 0.5px solid var(--red-border); }
.compare-status.neutral { background: var(--bg-secondary); color: var(--text-tertiary); border: 0.5px solid var(--border); }

.status-dash { font-size: 14px; color: var(--text-quaternary); }

/* Compare Content */
.compare-content { flex: 1; min-width: 0; }

.compare-field-row { display: flex; align-items: baseline; gap: var(--space-2); }
.compare-field { font-size: var(--text-footnote); color: var(--text-secondary); font-weight: 600; }
.compare-field-en { font-size: var(--text-caption-2); color: var(--text-tertiary); font-weight: 500; letter-spacing: 0.03em; }

/* Two-side comparison */
.compare-sides { display: flex; align-items: center; gap: var(--space-2); margin-top: 6px; flex-wrap: wrap; }

.compare-side { display: flex; flex-direction: column; gap: 1px; }
.side-label { font-size: 10px; color: var(--text-quaternary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.side-value { font-size: var(--text-subhead); font-family: var(--font-mono); font-weight: 500; color: var(--text); }
.side-value.val-err { color: var(--red); font-weight: 700; }
.side-value.val-missing { color: var(--text-tertiary); font-style: italic; font-family: inherit; }

.side-sep { font-size: var(--text-footnote); color: var(--text-quaternary); font-weight: 500; margin: 0 2px; }

/* Missing states */
.compare-missing { margin-top: 6px; }
.missing-text { font-size: var(--text-caption-1); color: var(--text-tertiary); font-style: italic; }

/* Detail field list */
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
.field-value { font-size: var(--text-subhead); font-weight: 600; font-family: var(--font-mono); letter-spacing: 0.02em; color: var(--text); }
.field-value.val-empty { color: var(--text-placeholder); font-family: inherit; font-weight: 400; }
</style>