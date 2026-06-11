<template>
  <div class="compare-card">
    <!-- Summary -->
    <div class="summary-banner" :class="overallMatch ? 'passed' : 'failed'">
      <span class="summary-icon">{{ overallMatch ? '✓' : '✗' }}</span>
      <span class="summary-text">{{ overallMatch ? '对比一致' : '对比不一致' }}</span>
      <span class="summary-rate" v-if="summary">
        通过率 {{ (summary.passRate * 100).toFixed(0) }}%
        ({{ summary.matched }}/{{ summary.total }})
      </span>
    </div>

    <!-- Compare Details -->
    <div class="compare-section" v-if="compareResults && compareResults.length > 0">
      <h3 class="section-title">对比详情</h3>
      <div class="compare-list">
        <div
          v-for="(item, i) in compareResults"
          :key="i"
          class="compare-row"
          :class="{ match: item.match, mismatch: !item.match }"
        >
          <span class="compare-icon">{{ item.match ? '✓' : '✗' }}</span>
          <div class="compare-content">
            <span class="compare-field">{{ item.field }}</span>
            <div class="compare-values">
              <span class="val-spray">喷码: {{ item.sprayValue ?? '-' }}</span>
              <span class="val-label">标签: {{ item.labelValue ?? '-' }}</span>
            </div>
            <span class="compare-msg" v-if="item.message">{{ item.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Spraycode Data -->
    <div class="spray-section" v-if="sprayData">
      <h3 class="section-title">喷码识别数据</h3>
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

const props = defineProps<{ result: any }>()

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
.compare-card { margin-bottom: var(--space-4); }

.summary-banner {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-4); border-radius: var(--radius-sm);
  font-weight: 600; font-size: 15px; margin-bottom: var(--space-4);
}
.summary-banner.passed { background: var(--green-soft); color: var(--green); }
.summary-banner.failed { background: var(--red-soft); color: var(--red); }
.summary-icon { font-size: 20px; }
.summary-text { flex: 1; }
.summary-rate { font-size: 13px; font-weight: 500; font-family: var(--font-mono); }

.section-title { font-size: 14px; font-weight: 600; margin-bottom: var(--space-2); }

.compare-section, .spray-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.compare-list { display: flex; flex-direction: column; gap: 6px; }
.compare-row {
  display: flex; gap: var(--space-2); align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.compare-row:last-child { border-bottom: none; }
.compare-row.mismatch { background: var(--red-soft); margin: 0 -12px; padding: 8px 12px; border-radius: 6px; }
.compare-icon { font-size: 14px; flex-shrink: 0; }
.compare-row.match .compare-icon { color: var(--green); }
.compare-row.mismatch .compare-icon { color: var(--red); }
.compare-content { flex: 1; }
.compare-field { font-size: 12px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; }
.compare-values { display: flex; gap: var(--space-4); margin-top: 2px; }
.val-spray, .val-label { font-size: 13px; font-family: var(--font-mono); }
.val-spray::before { content: ''; }
.val-label::before { content: ''; }
.compare-msg { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; display: block; }

.field-list { display: flex; flex-direction: column; }
.field-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.field-row:last-child { border-bottom: none; }
.field-label { font-size: 13px; color: var(--text-secondary); }
.field-value { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }
</style>
