<template>
  <div class="result-card" :class="status">
    <!-- Confidence Badge -->
    <div class="card-header">
      <div class="confidence-badge" :class="confidenceLevel">
        <span class="confidence-value">{{ confidencePercent }}%</span>
        <span class="confidence-label">可信度</span>
      </div>
    </div>

    <!-- Data Fields -->
    <div class="card-body">
      <div v-for="field in displayFields" :key="field.key" class="field-row">
        <span class="field-label">{{ field.label }}</span>
        <span class="field-value" :class="{ 'value-empty': !field.value }">{{ field.value || '—' }}</span>
      </div>
    </div>

    <!-- OCR Meta -->
    <div class="card-footer" v-if="ocrMeta">
      <span class="meta-tag">{{ ocrMeta.engine }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecognitionResult, RecognitionData, NickelLabelData } from '@/types'

const props = defineProps<{ result: RecognitionResult }>()

const data = computed(() => props.result?.data || {} as RecognitionData)
const corrected = computed(() => data.value?.correctedData || {} as NickelLabelData)
const confidence = computed(() => data.value?.confidence?.score ?? null)
const ocrMeta = computed(() => data.value?._ocrMeta)

const confidenceLevel = computed(() => {
  const c = confidence.value
  if (c === null || c === undefined) return 'unknown'
  if (c >= 80) return 'high'
  if (c >= 60) return 'medium'
  return 'low'
})

const confidencePercent = computed(() => {
  const c = confidence.value
  return c !== null && c !== undefined ? Math.round(c) : '—'
})

const status = computed(() => {
  const errors = data.value?.errorCount || 0
  return errors > 0 ? 'has-errors' : 'clean'
})

const displayFields = computed(() => {
  const d = corrected.value
  return [
    { key: 'batchNo', label: '批号', value: d?.batchNo },
    { key: 'packNo', label: '包号', value: d?.packNo },
    { key: 'productionDate', label: '日期', value: d?.productionDate },
    { key: 'netWeight', label: '净重', value: d?.netWeight ? `${d.netWeight} Kg` : undefined },
    { key: 'grossWeight', label: '毛重', value: d?.grossWeight ? `${d.grossWeight} Kg` : undefined },
    { key: 'pieces', label: '块数', value: d?.pieces?.toString() },
  ]
})
</script>

<style scoped>
.result-card {
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  animation: fadeUp 0.4s var(--ease-out) backwards;
}
.result-card.has-errors { border-color: var(--accent-border); }

.card-header { padding: var(--space-4) var(--space-4) var(--space-2); }
.confidence-badge {
  display: inline-flex; flex-direction: column; align-items: center;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}
.confidence-badge.high { background: var(--green-soft); }
.confidence-badge.medium { background: var(--amber-soft); }
.confidence-badge.low { background: var(--red-soft); }
.confidence-value {
  font-family: var(--font-display);
  font-size: 24px; font-weight: 700;
  line-height: 1.1;
}
.confidence-badge.high .confidence-value { color: var(--green); }
.confidence-badge.medium .confidence-value { color: var(--amber); }
.confidence-badge.low .confidence-value { color: var(--red); }
.confidence-label { font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.1em; }

.card-body { padding: var(--space-2) var(--space-4) var(--space-4); }
.field-row {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 0.5px solid var(--border);
}
.field-row:last-child { border-bottom: none; }
.field-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.field-value {
  font-size: 14px; font-weight: 600; font-family: var(--font-mono);
  letter-spacing: 0.02em;
}
.value-empty { color: var(--text-tertiary); font-weight: 400; }

.card-footer {
  padding: var(--space-2) var(--space-4) var(--space-3);
  background: var(--bg-secondary);
}
.meta-tag {
  font-size: 10px; color: var(--text-tertiary);
  font-family: var(--font-mono); letter-spacing: 0.05em;
}
</style>
