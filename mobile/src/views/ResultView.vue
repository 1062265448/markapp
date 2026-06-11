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
      <template v-if="record.type === 'recognize' && record.result?.success">
        <ResultCard :result="record.result" />
      </template>

      <!-- Compare result -->
      <template v-if="record.type === 'compare'">
        <CompareResultCard :result="record.result" />
      </template>

      <!-- Spraycode result -->
      <template v-if="record.type === 'spraycode'">
        <div class="spraycode-section card">
          <h3>喷码识别结果</h3>
          <div class="field-list">
            <div class="field-row" v-for="(val, key) in spraycodeFields" :key="key">
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
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ResultCard from '@/components/ResultCard.vue'
import CompareResultCard from '@/components/CompareResultCard.vue'
import type { HistoryRecord } from '@/types'

const router = useRouter()
const route = useRoute()

const record = ref<HistoryRecord | null>(null)

const goBack = () => router.back()

const spraycodeFields = computed(() => {
  if (!record.value || record.value.type !== 'spraycode') return {}
  const d = record.value.result?.data
  if (!d) return {}
  return {
    '批号': d.batchNo,
    '包号': d.packNo,
    '生产日期': d.productionDate,
    '净重': d.netWeight,
    '毛重': d.grossWeight,
    '块数': d.pieces,
  }
})

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('markapp_detail')
    if (raw) record.value = JSON.parse(raw)
  } catch { /* ignore */ }
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
