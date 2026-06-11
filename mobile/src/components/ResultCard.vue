<template>
  <div class="result-card">
    <!-- Status Banner -->
    <div class="status-banner" :class="statusClass">
      <span class="status-icon">{{ statusIcon }}</span>
      <span class="status-text">{{ result.data.allPassed ? '全部通过' : `${result.data.errorCount}错误 / ${result.data.warningCount}警告` }}</span>
      <span class="confidence" v-if="result.data.confidence">
        {{ result.data.confidence.overall }}% {{ result.data.confidence.level }}
      </span>
    </div>

    <!-- Fields -->
    <div class="fields-section">
      <h3 class="section-title">识别字段</h3>
      <div class="field-list">
        <div
          v-for="field in displayFields"
          :key="field.key"
          class="field-row"
          :class="{ error: field.hasError, warning: field.hasWarning }"
        >
          <div class="field-left">
            <span class="field-label">{{ field.label }}</span>
            <span class="field-value">{{ field.displayValue }}</span>
            <span class="corrected" v-if="field.corrected && field.corrected !== field.original">
              ← {{ field.original }}
            </span>
          </div>
          <div class="field-right" v-if="field.hasError || field.hasWarning">
            <span class="field-badge" :class="field.hasError ? 'error' : 'warning'">
              {{ field.hasError ? '✗' : '⚠' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Check Results -->
    <div class="checks-section" v-if="result.data.checkResults.length > 0">
      <h3 class="section-title">规则校验 <span class="count">{{ result.data.checkResults.length }}项</span></h3>
      <div class="check-list">
        <div
          v-for="(check, i) in result.data.checkResults"
          :key="i"
          class="check-row"
          :class="check.severity"
        >
          <span class="check-icon">{{ check.passed ? '✓' : (check.severity === 'error' ? '✗' : '⚠') }}</span>
          <div class="check-content">
            <span class="check-field">{{ check.field }}</span>
            <span class="check-msg">{{ check.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Barcode Parsed -->
    <div class="barcode-section" v-if="result.data.barcodeParsed">
      <h3 class="section-title">条形码解析</h3>
      <div class="barcode-info">
        <div class="field-row" v-for="(val, key) in barcodeDisplay" :key="key">
          <span class="field-label">{{ key }}</span>
          <span class="field-value">{{ val }}</span>
        </div>
      </div>
    </div>

    <!-- AI Meta -->
    <div class="meta-section" v-if="result.data._aiMeta">
      <h3 class="section-title">AI信息</h3>
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">模型</span><span class="meta-val">{{ result.data._aiMeta.model }}</span></div>
        <div class="meta-item"><span class="meta-label">主模型</span><span class="meta-val">{{ result.data._aiMeta.primaryLatency }}ms</span></div>
        <div class="meta-item"><span class="meta-label">Volc</span><span class="meta-val">{{ result.data._aiMeta.volcLatency }}ms</span></div>
        <div class="meta-item"><span class="meta-label">Qwen</span><span class="meta-val">{{ result.data._aiMeta.qwenLatency }}ms</span></div>
        <div class="meta-item"><span class="meta-label">GLM</span><span class="meta-val">{{ result.data._aiMeta.glmLatency }}ms</span></div>
      </div>
    </div>

    <!-- Merge Stats -->
    <div class="merge-section" v-if="result.data.mergeStats && (result.data.mergeStats.conflicts > 0 || result.data.mergeStats.volcFilled > 0)">
      <h3 class="section-title">投票合并</h3>
      <div class="merge-stats">
        <span class="merge-item green">一致: {{ result.data.mergeStats.consistent }}</span>
        <span class="merge-item amber">填充: {{ result.data.mergeStats.volcFilled }}</span>
        <span class="merge-item red">冲突: {{ result.data.mergeStats.conflicts }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecognitionResult, CheckResult } from '@/types'

const props = defineProps<{ result: RecognitionResult }>()

const statusClass = computed(() => {
  if (!props.result.success) return 'failed'
  if (props.result.data.allPassed) return 'passed'
  if (props.result.data.errorCount > 0) return 'error'
  return 'warning'
})

const statusIcon = computed(() => {
  if (!props.result.success) return '✗'
  if (props.result.data.allPassed) return '✓'
  return '⚠'
})

// 字段映射
const fieldMap: Array<{ key: string; label: string }> = [
  { key: 'brand', label: '品牌' },
  { key: 'standard', label: '标准' },
  { key: 'productName', label: '产品名称' },
  { key: 'specification', label: '规格' },
  { key: 'batchNo', label: '批号' },
  { key: 'packNo', label: '包号' },
  { key: 'netWeight', label: '净重' },
  { key: 'grossWeight', label: '毛重' },
  { key: 'pieces', label: '块数' },
  { key: 'productionDate', label: '生产日期' },
  { key: 'weightBy', label: '过磅员' },
  { key: 'address', label: '地址' },
  { key: 'barcode', label: '条形码' },
]

const displayFields = computed(() => {
  const data = props.result.data.correctedData || props.result.data.rawData
  if (!data) return []

  const corrections = props.result.data.corrections
  const checks = props.result.data.checkResults

  return fieldMap.map(({ key, label }) => {
    const original = (props.result.data.rawData as any)?.[key]
    const corrected = (data as any)?.[key]
    const displayValue = corrected ?? original ?? '-'

    const fieldChecks = checks.filter((c: CheckResult) => c.field === key)
    const hasError = fieldChecks.some((c: CheckResult) => c.severity === 'error')
    const hasWarning = fieldChecks.some((c: CheckResult) => c.severity === 'warning')
    const correction = corrections.find((c: any) => c.field === key)

    return {
      key,
      label,
      displayValue,
      original: original ?? null,
      corrected: correction ? correction.corrected : null,
      hasError,
      hasWarning,
    }
  })
})

const barcodeDisplay = computed(() => {
  const bp = props.result.data.barcodeParsed
  if (!bp) return {}
  return {
    '条形码': bp.barcode,
    '前缀': bp.prefix,
    '车间': `${bp.workshopCode} (${bp.workshopName})`,
    '生产日期': bp.productionDate,
    '包号编码': bp.packCode,
    '预期包号': bp.expectedPackNo,
    '预期净重': bp.expectedNetWeight ? `${bp.expectedNetWeight}kg` : '-',
  }
})
</script>

<style scoped>
.result-card { margin-bottom: var(--space-4); }

.status-banner {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-4); border-radius: var(--radius-sm);
  font-weight: 600; font-size: 15px; margin-bottom: var(--space-4);
}
.status-banner.passed { background: var(--green-soft); color: var(--green); }
.status-banner.warning { background: var(--amber-soft); color: var(--amber); }
.status-banner.error, .status-banner.failed { background: var(--red-soft); color: var(--red); }
.status-icon { font-size: 20px; }
.status-text { flex: 1; }
.confidence { font-size: 13px; font-weight: 500; font-family: var(--font-mono); }

.section-title {
  font-size: 14px; font-weight: 600; margin-bottom: var(--space-2);
  display: flex; align-items: center; gap: var(--space-2);
}
.count { font-size: 11px; color: var(--text-tertiary); font-weight: 400; }

.fields-section, .checks-section, .barcode-section, .meta-section, .merge-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.field-list { display: flex; flex-direction: column; }
.field-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.field-row:last-child { border-bottom: none; }
.field-row.error { background: var(--red-soft); margin: 0 -12px; padding: 8px 12px; border-radius: 6px; }
.field-row.warning { background: var(--amber-soft); margin: 0 -12px; padding: 8px 12px; border-radius: 6px; }
.field-left { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.field-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.3px; }
.field-value { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }
.corrected { font-size: 11px; color: var(--amber); }
.field-badge { font-size: 14px; }
.field-badge.error { color: var(--red); }
.field-badge.warning { color: var(--amber); }

.check-list { display: flex; flex-direction: column; gap: 6px; }
.check-row {
  display: flex; gap: var(--space-2); align-items: flex-start;
  padding: 6px 0;
}
.check-icon { font-size: 14px; flex-shrink: 0; }
.check-row.error .check-icon { color: var(--red); }
.check-row.warning .check-icon { color: var(--amber); }
.check-row.info .check-icon { color: var(--green); }
.check-content { flex: 1; }
.check-field { font-size: 12px; color: var(--text-tertiary); margin-right: var(--space-1); }
.check-msg { font-size: 13px; }

.barcode-info .field-row { padding: var(--space-2) 0; }

.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 11px; color: var(--text-tertiary); }
.meta-val { font-size: 13px; font-weight: 500; font-family: var(--font-mono); }

.merge-stats { display: flex; gap: var(--space-3); }
.merge-item { font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: var(--radius-full); }
.merge-item.green { background: var(--green-soft); color: var(--green); }
.merge-item.amber { background: var(--amber-soft); color: var(--amber); }
.merge-item.red { background: var(--red-soft); color: var(--red); }
</style>
