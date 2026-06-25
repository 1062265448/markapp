<template>
  <div class="page">
    <!-- Header -->
    <header class="header fade-up">
      <h1 class="large-title">标签识别</h1>
      <p class="header-desc">拍照识别镍板标签，AI三模型投票校验</p>
    </header>

    <!-- Image Input -->
    <section class="input-section fade-up fade-up-delay-1">
      <div class="image-preview-card" v-if="previewUrl">
        <div class="image-preview">
          <img :src="previewUrl" alt="预览" />
          <button class="clear-btn" @click="clearImage" aria-label="清除图片">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="image-actions" v-else>
        <button class="action-btn camera" @click="openCamera" :disabled="cameraLoading">
          <div class="action-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <span class="action-label">拍照</span>
          <span class="action-sublabel">使用相机拍摄</span>
        </button>
        <button class="action-btn gallery" @click="openGallery" :disabled="cameraLoading">
          <div class="action-icon-wrap gallery-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <span class="action-label">相册</span>
          <span class="action-sublabel">从相册选择</span>
        </button>
      </div>
    </section>

    <!-- Options -->
    <section class="options-section fade-up fade-up-delay-2">
      <div class="options-card">
        <div class="option-row">
          <label class="option-label">条形码</label>
          <input class="input barcode-input" v-model="barcode" placeholder="手动输入（可选）" />
        </div>
        <div class="option-divider"></div>
        <div class="option-row toggle-row">
          <label class="option-label">启用GLM模型</label>
          <button class="toggle" :class="{ active: enableGLM }" @click="enableGLM = !enableGLM">
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-text">{{ enableGLM ? '开启' : '关闭' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Recognize Button -->
    <section class="action-section fade-up fade-up-delay-3">
      <button class="btn-primary" @click="doRecognize" :disabled="loading || !imageBlob">
        <span v-if="loading" class="spinner" style="margin-right:10px;"></span>
        <span>{{ loading ? '识别中...' : '开始识别' }}</span>
      </button>
    </section>

    <!-- Result -->
    <section class="result-section" v-if="result">
      <ResultCard :result="result" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
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
const cameraLoading = ref(false)
const result = ref<RecognitionResult | null>(null)

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const openCamera = async () => {
  cameraLoading.value = true
  try {
    const blob = await takePhoto()
    if (blob) {
      imageBlob.value = blob
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(blob)
      result.value = null
    }
  } finally {
    cameraLoading.value = false
  }
}

const openGallery = async () => {
  cameraLoading.value = true
  try {
    const blob = await pickFromGallery()
    if (blob) {
      imageBlob.value = blob
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(blob)
      result.value = null
    }
  } finally {
    cameraLoading.value = false
  }
}

const clearImage = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  imageBlob.value = null
  previewUrl.value = null
  result.value = null
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

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
      const thumb = imageBlob.value ? await blobToDataURL(imageBlob.value) : undefined
      historyStore.addRecognize(res, thumb)
    } else {
      danger(res.message)
    }
  } catch (e: unknown) {
    danger(e instanceof Error ? e.message : '识别请求失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--tab-height) + var(--space-8));
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.header {
  padding-top: 0;
  margin-bottom: var(--space-6);
}

.header-title, .large-title {
  font-size: var(--text-hero);
  font-weight: 700;
  letter-spacing: -0.022em;
  line-height: 1.1;
  font-family: var(--font-display);
}

.header-desc {
  font-size: var(--text-subhead);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
  font-weight: 400;
  letter-spacing: 0.01em;
}

.input-section {
  margin-bottom: var(--space-5);
}

/* Image preview card */
.image-preview-card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  animation: scaleIn 0.4s var(--ease-out-expo);
}

.image-preview {
  position: relative;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  background: var(--bg-secondary);
  display: block;
}

.clear-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.clear-btn:active {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.7);
}

/* Image actions grid */
.image-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.action-btn {
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: var(--text-subhead);
  font-weight: 600;
  transition: all var(--duration-micro) var(--ease-out);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent-soft);
  opacity: 0;
  transition: opacity var(--duration-micro) var(--ease-out);
}

.action-btn:active {
  transform: scale(0.97);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-border);
}

.action-btn:active::before {
  opacity: 1;
}

.action-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-1);
  position: relative;
  z-index: 1;
  transition: transform var(--duration-micro) var(--ease-out), background var(--duration-micro) var(--ease-out);
}

.action-btn:active .action-icon-wrap {
  transform: scale(0.95);
  background: var(--accent-glow);
}

.action-icon-wrap.gallery-icon {
  background: var(--green-soft);
  color: var(--green);
}

.action-btn:active .action-icon-wrap.gallery-icon {
  background: rgba(52, 199, 89, 0.2);
}

.action-label {
  font-size: var(--text-subhead);
  font-weight: 600;
  color: var(--text);
  position: relative;
  z-index: 1;
}

.action-sublabel {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  font-weight: 400;
  position: relative;
  z-index: 1;
}

/* Options */
.options-section {
  margin-bottom: var(--space-5);
}

.options-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  padding: var(--space-3) var(--space-4);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
}

.option-divider {
  height: 0.5px;
  background: var(--separator);
  margin: 0 calc(var(--space-4) * -1);
}

.option-label {
  font-size: var(--text-subhead);
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
  margin-right: var(--space-3);
}

.barcode-input {
  flex: 1;
  max-width: 200px;
  height: 40px;
  font-size: var(--text-subhead);
  margin-left: var(--space-3);
  text-align: right;
  padding: 0 var(--space-3);
  border-radius: var(--radius-xs);
}

.toggle-row {
  padding: var(--space-3) 0;
}

.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.toggle-track {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--bg-tertiary);
  position: relative;
  transition: background var(--duration-micro) var(--ease-out);
  flex-shrink: 0;
}

.toggle.active .toggle-track {
  background: var(--accent);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform var(--duration-micro) var(--ease-out);
}

.toggle.active .toggle-thumb {
  transform: translateX(18px);
}

.toggle-text {
  font-size: var(--text-footnote);
  font-weight: 500;
  color: var(--text-tertiary);
  min-width: 28px;
  text-align: right;
}

.toggle.active .toggle-text {
  color: var(--accent);
}

/* Action section */
.action-section {
  margin-bottom: var(--space-5);
}

.btn-primary {
  width: 100%;
}

/* Result section */
.result-section {
  margin-top: var(--space-4);
  animation: fadeUp 0.5s var(--ease-out-expo);
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
