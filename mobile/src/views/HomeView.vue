<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <h1 class="header-title">标签识别</h1>
      <p class="header-desc">拍照识别镍板标签，AI三模型投票校验</p>
    </header>

    <!-- Image Input -->
    <section class="input-section">
      <div class="image-preview" v-if="previewUrl">
        <img :src="previewUrl" alt="预览" />
        <button class="clear-btn" @click="clearImage">✕</button>
      </div>
      <div class="image-actions" v-else>
        <button class="action-btn camera" @click="openCamera">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>拍照</span>
        </button>
        <button class="action-btn gallery" @click="openGallery">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <span>相册</span>
        </button>
      </div>
    </section>

    <!-- Options -->
    <section class="options-section">
      <div class="option-row">
        <label class="option-label">条形码(可选)</label>
        <input class="input barcode-input" v-model="barcode" placeholder="手动输入条形码" />
      </div>
      <div class="option-row">
        <label class="option-label">启用GLM模型</label>
        <button class="toggle" :class="{ active: enableGLM }" @click="enableGLM = !enableGLM">
          {{ enableGLM ? '开' : '关' }}
        </button>
      </div>
    </section>

    <!-- Recognize Button -->
    <section class="action-section">
      <button class="btn-primary" @click="doRecognize" :disabled="loading || !imageBlob">
        <span v-if="loading" class="spinner" style="margin-right:8px;"></span>
        {{ loading ? '识别中...' : '开始识别' }}
      </button>
    </section>

    <!-- Result -->
    <section class="result-section" v-if="result">
      <ResultCard :result="result" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCamera } from '@/composables/useCamera'
import { useToast } from '@/composables/useToast'
import { useHistoryStore } from '@/stores/history'
import { recognizeLabel } from '@/api/nickel'
import ResultCard from '@/components/ResultCard.vue'
import type { RecognitionResult } from '@/types'

const { takePhoto, pickFromGallery } = useCamera()
const { success, warning, danger } = useToast()
const historyStore = useHistoryStore()

const imageBlob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const barcode = ref('')
const enableGLM = ref(true)
const loading = ref(false)
const result = ref<RecognitionResult | null>(null)

const openCamera = async () => {
  const blob = await takePhoto()
  if (blob) {
    imageBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
  }
}

const openGallery = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = (e: any) => {
    const file = e.target.files?.[0]
    if (file) {
      imageBlob.value = file
      previewUrl.value = URL.createObjectURL(file)
    }
  }
  input.click()
}

const clearImage = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  imageBlob.value = null
  previewUrl.value = null
  result.value = null
}

const doRecognize = async () => {
  if (!imageBlob.value) return warning('请先选择图片')
  loading.value = true
  result.value = null

  try {
    const res = await recognizeLabel(
      imageBlob.value,
      barcode.value || undefined,
      enableGLM.value,
    )
    result.value = res

    if (res.success) {
      if (res.data.allPassed) {
        success('识别成功，全部校验通过！')
      } else {
        warning(`发现${res.data.errorCount}个错误和${res.data.warningCount}个警告`)
      }
      historyStore.addRecognize(res, previewUrl.value || undefined)
    } else {
      danger(res.message)
    }
  } catch (e: any) {
    danger(e.message || '识别请求失败')
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

.header {
  padding-top: var(--safe-top);
  margin-bottom: var(--space-6);
}
.header-title {
  font-size: 24px;
  font-weight: 700;
}
.header-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.input-section {
  margin-bottom: var(--space-5);
}

.image-preview {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}
.image-preview img {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  background: #000;
}
.clear-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-actions {
  display: flex;
  gap: var(--space-4);
}
.action-btn {
  flex: 1;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: border-color var(--duration-micro);
}
.action-btn:active { border-color: var(--accent); color: var(--accent); }

.options-section {
  margin-bottom: var(--space-5);
}
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
}
.option-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.barcode-input {
  flex: 1;
  max-width: 200px;
  height: 40px;
  font-size: 14px;
  margin-left: var(--space-3);
}
.toggle {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  background: var(--surface-alt);
  color: var(--text-tertiary);
  border: 1px solid var(--border);
}
.toggle.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}

.action-section {
  margin-bottom: var(--space-5);
}

.result-section {
  margin-top: var(--space-4);
}
</style>
