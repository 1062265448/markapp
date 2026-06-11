<template>
  <div class="page">
    <header class="header">
      <h1 class="header-title">喷码对比</h1>
      <p class="header-desc">对比喷码与标签信息是否一致</p>
    </header>

    <!-- Spraycode Image -->
    <section class="image-section">
      <h3 class="section-title">喷码图片</h3>
      <div class="image-preview" v-if="sprayPreview">
        <img :src="sprayPreview" alt="喷码" />
        <button class="clear-btn" @click="clearSpray">✕</button>
      </div>
      <div class="image-actions" v-else>
        <button class="action-btn" @click="openSprayCamera">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>拍照/选图</span>
        </button>
      </div>
    </section>

    <!-- Label Image (optional) -->
    <section class="image-section">
      <h3 class="section-title">标签图片 <span class="optional">（可选）</span></h3>
      <div class="image-preview" v-if="labelPreview">
        <img :src="labelPreview" alt="标签" />
        <button class="clear-btn" @click="clearLabel">✕</button>
      </div>
      <div class="image-actions" v-else>
        <button class="action-btn" @click="openLabelCamera">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>拍照/选图</span>
        </button>
      </div>
    </section>

    <!-- Barcode -->
    <section class="options-section">
      <div class="option-row">
        <label class="option-label">条形码(可选)</label>
        <input class="input barcode-input" v-model="barcode" placeholder="手动输入条形码" />
      </div>
    </section>

    <!-- Compare Button -->
    <section class="action-section">
      <button class="btn-primary" @click="doCompare" :disabled="loading || !sprayBlob">
        <span v-if="loading" class="spinner" style="margin-right:8px;"></span>
        {{ loading ? '对比中...' : '开始对比' }}
      </button>
    </section>

    <!-- Compare Result -->
    <section class="result-section" v-if="compareResult">
      <CompareResultCard :result="compareResult" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCamera } from '@/composables/useCamera'
import { useToast } from '@/composables/useToast'
import { useHistoryStore } from '@/stores/history'
import { compareSpraycode } from '@/api/nickel'
import CompareResultCard from '@/components/CompareResultCard.vue'

const { takePhoto, pickFromGallery } = useCamera()
const { success, warning, danger } = useToast()
const historyStore = useHistoryStore()

const sprayBlob = ref<Blob | null>(null)
const sprayPreview = ref<string | null>(null)
const labelBlob = ref<Blob | null>(null)
const labelPreview = ref<string | null>(null)
const barcode = ref('')
const loading = ref(false)
const compareResult = ref<any>(null)

const openSprayCamera = async () => {
  const blob = await takePhoto()
  if (blob) {
    sprayBlob.value = blob
    sprayPreview.value = URL.createObjectURL(blob)
  }
}

const openLabelCamera = async () => {
  const blob = await takePhoto()
  if (blob) {
    labelBlob.value = blob
    labelPreview.value = URL.createObjectURL(blob)
  }
}

const clearSpray = () => {
  if (sprayPreview.value) URL.revokeObjectURL(sprayPreview.value)
  sprayBlob.value = null
  sprayPreview.value = null
  compareResult.value = null
}

const clearLabel = () => {
  if (labelPreview.value) URL.revokeObjectURL(labelPreview.value)
  labelBlob.value = null
  labelPreview.value = null
}

const pickFile = (callback: (blob: Blob) => void) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = (e: any) => {
    const file = e.target.files?.[0]
    if (file) callback(file)
  }
  input.click()
}

const doCompare = async () => {
  if (!sprayBlob.value) return warning('请先选择喷码图片')
  loading.value = true
  compareResult.value = null

  try {
    const res = await compareSpraycode(
      sprayBlob.value,
      labelBlob.value || undefined,
      barcode.value || undefined,
    )
    compareResult.value = res

    if (res.success) {
      if (res.data?.summary?.overallMatch) {
        success('对比一致！')
      } else {
        warning('对比发现不一致项')
      }
      historyStore.addCompare(res, sprayPreview.value || undefined)
    } else {
      danger(res.message || '对比失败')
    }
  } catch (e: any) {
    danger(e.message || '对比请求失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--tab-height) + var(--space-8));
}
.header { padding-top: var(--safe-top); margin-bottom: var(--space-6); }
.header-title { font-size: 24px; font-weight: 700; }
.header-desc { font-size: 13px; color: var(--text-tertiary); margin-top: var(--space-1); }

.image-section { margin-bottom: var(--space-5); }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: var(--space-2); }
.optional { font-size: 12px; color: var(--text-tertiary); font-weight: 400; }

.image-preview {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}
.image-preview img {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  background: #000;
}
.clear-btn {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(0,0,0,0.6); color: #fff;
  font-size: 14px; display: flex; align-items: center; justify-content: center;
}

.image-actions { display: flex; gap: var(--space-4); }
.action-btn {
  flex: 1; height: 80px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-2);
  border: 2px dashed var(--border-strong); border-radius: var(--radius);
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
}
.action-btn:active { border-color: var(--accent); color: var(--accent); }

.options-section { margin-bottom: var(--space-5); }
.option-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-3) 0;
}
.option-label { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
.barcode-input { flex: 1; max-width: 200px; height: 40px; font-size: 14px; margin-left: var(--space-3); }

.action-section { margin-bottom: var(--space-5); }
.result-section { margin-top: var(--space-4); }
</style>
