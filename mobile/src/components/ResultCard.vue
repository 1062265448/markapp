<template>
  <div class="result-card" :class="status">
    <!-- Header with confidence -->
    <div class="card-header">
      <div class="confidence-badge" :class="confidenceLevel">
        <span class="confidence-value">{{ confidencePercent }}</span>
        <span class="confidence-unit">%</span>
        <span class="confidence-label">可信度</span>
      </div>
      <div class="status-tag" :class="status">
        <span v-if="status === 'clean'">校验通过</span>
        <span v-else>有错误</span>
      </div>
    </div>

    <!-- Data Fields -->
    <div class="card-body">
      <div v-for="field in displayFields" :key="field.key" class="field-row">
        <span class="field-label">{{ field.label }}</span>
        <span class="field-value" :class="{ 'value-empty': !field.value }">{{ field.value || '未识别' }}</span>
      </div>
    </div>

    <!-- OCR Meta -->
    <div class="card-footer" v-if="ocrMeta">
      <div class="meta-row">
        <span class="meta-label">识别引擎</span>
        <span class="meta-tag">{{ ocrMeta.engine }}</span>
      </div>
      <div class="meta-row" v-if="ocrMeta.ocrLatency">
        <span class="meta-label">耗时</span>
        <span class="meta-tag">{{ ocrMeta.ocrLatency }}ms</span>
      </div>
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
  box-shadow: var(--shadow-md);
  border: 0.5px solid var(--border);
  animation: cardAppear 0.6s var(--ease-out-expo) both;
  transition: transform var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
}

.result-card.has-errors { 
  border-color: var(--accent-border); 
  box-shadow: var(--shadow-md), 0 0 0 1px var(--accent-border);
}

.result-card:active {
  transform: scale(0.985);
  box-shadow: var(--shadow-lg);
}

@keyframes cardAppear {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  padding-bottom: var(--space-3);
  border-bottom: 0.5px solid var(--separator);
  background: var(--gradient-surface);
}

.confidence-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  transition: all var(--duration-micro) var(--ease-out);
  border: 0.5px solid var(--border);
}

.confidence-badge.high { background: var(--green-soft); border-color: var(--green-border); }
.confidence-badge.medium { background: var(--amber-soft); border-color: var(--amber-border); }
.confidence-badge.low { background: var(--red-soft); border-color: var(--red-border); }
.confidence-badge.unknown { background: var(--bg-secondary); border-color: var(--border); }

.confidence-value {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

.confidence-unit {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-right: var(--space-2);
}

.confidence-badge.high .confidence-value { color: var(--green); }
.confidence-badge.medium .confidence-value { color: var(--amber); }
.confidence-badge.low .confidence-value { color: var(--red); }
.confidence-badge.unknown .confidence-value { color: var(--text-tertiary); }

.confidence-label {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.status-tag {
  font-size: var(--text-caption-2);
  font-weight: 600;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 0.5px solid transparent;
  transition: all var(--duration-micro) var(--ease-out);
}

.status-tag.clean {
  background: var(--green-soft);
  color: var(--green);
  border-color: var(--green-border);
}

.status-tag.has-errors {
  background: var(--red-soft);
  color: var(--red);
  border-color: var(--red-border);
}

.card-body { padding: var(--space-2) var(--space-5) var(--space-4); }

.field-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 0.5px solid var(--separator);
  transition: background var(--duration-fast) var(--ease-out);
}

.field-row:last-child { border-bottom: none; }
.field-row:active { background: var(--surface-pressed); }

.field-label {
  font-size: var(--text-footnote);
  color: var(--text-secondary);
  font-weight: 500;
}

.field-value {
  font-size: var(--text-subhead);
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.value-empty { color: var(--text-placeholder); font-weight: 400; }

.card-footer {
  padding: var(--space-3) var(--space-5);
  background: var(--bg-secondary);
  border-top: 0.5px solid var(--separator);
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}

.meta-row:last-child { margin-bottom: 0; }

.meta-label {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  font-weight: 500;
}

.meta-tag {
  font-size: var(--text-caption-2);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
  font-weight: 500;
}
</style>
