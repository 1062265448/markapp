<template>
  <div class="page">
    <header class="header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="header-title">识别结果</h1>
    </header>

    <div class="empty" v-if="!record">
      <p>未找到记录</p>
    </div>

    <template v-else>
      <!-- Thumbnail -->
      <div class="thumb-section" v-if="record.thumbnail">
        <img :src="record.thumbnail" alt="" class="thumb" />
      </div>

      <!-- Recognize result -->
      <template v-if="record.type === 'recognize' && isRecognitionResult(record.result) && record.result.success">
        <ResultCard :result="record.result" />
      </template>

      <!-- Recognize failure -->
      <template v-if="record.type === 'recognize' && isRecognitionResult(record.result) && !record.result.success">
        <div class="spraycode-section card">
          <h3>识别失败</h3>
          <p style="color: var(--text-tertiary); font-size: 14px;">{{ record.result.message }}</p>
        </div>
      </template>

      <!-- Compare result -->
      <template v-if="record.type === 'compare'">
        <CompareResultCard :result="record.result" />
      </template>

      <!-- Spraycode result -->
      <template v-if="record.type === 'spraycode' && isSpraycodeResult(record.result)">
        <div class="spraycode-section card">
          <h3>喷码识别结果</h3>
          <div class="field-list">
            <div class="field-row" v-for="(val, key) in spraycodeFields(record.result.data)" :key="key">
              <span class="field-label">{{ key }}</span>
              <span class="field-value">{{ val ?? '-' }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ResultCard from '@/components/ResultCard.vue'
import CompareResultCard from '@/components/CompareResultCard.vue'
import type { HistoryRecord, RecognitionResult, SpraycodeResult, CompareResult } from '@/types'

const router = useRouter()

const record = ref<HistoryRecord | null>(null)

const goBack = () => router.back()

function isRecognitionResult(r: RecognitionResult | SpraycodeResult | CompareResult | undefined): r is RecognitionResult {
  return !!r && 'rawData' in (r as RecognitionResult).data || 'allPassed' in (r as RecognitionResult).data
}

function isSpraycodeResult(r: RecognitionResult | SpraycodeResult | CompareResult | undefined): r is SpraycodeResult {
  return !!r && 'batchNo' in (r as SpraycodeResult).data || 'ocrEngine' in ((r as SpraycodeResult).data._aiMeta || {})
}

function spraycodeFields(data: SpraycodeResult['data']) {
  return {
    '批号': data.batchNo,
    '包号': data.packNo,
    '生产日期': data.productionDate,
    '净重': data.netWeight,
    '毛重': data.grossWeight,
    '块数': data.pieces,
  }
}

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('markapp_detail')
    if (raw) record.value = JSON.parse(raw)
  } catch (e) {
    console.warn('[ResultView] 加载记录失败:', e)
  }
})
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: var(--space-8);
}
.header {
  padding-top: var(--safe-top);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.back-btn { color: var(--accent); display: flex; align-items: center; }
.header-title { font-size: 20px; font-weight: 700; }

.empty {
  display: flex; justify-content: center; padding: 80px 0;
  color: var(--text-tertiary); font-size: 14px;
}

.thumb-section { margin-bottom: var(--space-4); }
.thumb {
  width: 100%; max-height: 200px; object-fit: contain;
  border-radius: var(--radius-sm); background: #000;
}

.spraycode-section { padding: var(--space-4); margin-top: var(--space-3); }
.spraycode-section h3 { font-size: 16px; font-weight: 600; margin-bottom: var(--space-3); }
.field-list { display: flex; flex-direction: column; gap: var(--space-2); }
.field-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.field-row:last-child { border-bottom: none; }
.field-label { font-size: 13px; color: var(--text-secondary); }
.field-value { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }
</style>
