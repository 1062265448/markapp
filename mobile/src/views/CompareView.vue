<template>
  <div class="page">
    <!-- Header -->
    <header class="header fade-up">
      <div class="header-badge">
        <div class="badge-dot"></div>
        <span class="title-2">喷码对比</span>
      </div>
      <p class="header-desc">对比喷码与标签信息是否一致</p>
    </header>

    <!-- Spraycode Image -->
    <section class="image-section fade-up fade-up-delay-1">
      <div class="section-label-wrap">
        <span class="label-dot primary"></span>
        <span class="section-label-text">喷码图片</span>
      </div>
      <div class="image-dropzone" v-if="!sprayPreview" @click="showSheet('spray')">
        <div class="dropzone-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <span class="dropzone-text">点击上传喷码图片</span>
        <span class="dropzone-subtext">支持拍照或从相册选择</span>
      </div>
      <div class="image-preview-card" v-else>
        <div class="image-preview">
          <img :src="sprayPreview" alt="喷码" />
          <button class="clear-btn" @click="clearSpray" aria-label="清除图片">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Label Image (optional) -->
    <section class="image-section fade-up fade-up-delay-2">
      <div class="section-label-wrap">
        <span class="label-dot secondary"></span>
        <span class="section-label-text">标签图片</span>
        <span class="optional-badge">可选</span>
      </div>
      <div class="image-dropzone" v-if="!labelPreview" @click="showSheet('label')">
        <div class="dropzone-icon-wrap secondary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>
        <span class="dropzone-text">点击上传标签图片</span>
        <span class="dropzone-subtext">可选，用于与喷码对比</span>
      </div>
      <div class="image-preview-card small" v-else>
        <div class="image-preview">
          <img :src="labelPreview" alt="标签" />
          <button class="clear-btn" @click="clearLabel" aria-label="清除图片">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Barcode -->
    <section class="options-section fade-up fade-up-delay-3">
      <div class="options-card">
        <input class="input barcode-input" v-model="barcode" placeholder="输入条形码（可选）" />
      </div>
    </section>

    <!-- Compare Button -->
    <section class="action-section fade-up fade-up-delay-4">
      <button class="btn-primary" @click="doCompare" :disabled="loading || cameraLoading || !sprayBlob">
        <span v-if="loading" class="spinner" style="margin-right:10px;"></span>
        <span>{{ loading ? '对比中...' : '开始对比' }}</span>
      </button>
    </section>

    <!-- Compare Result -->
    <section class="result-section" v-if="compareResult">
      <CompareResultCard :result="compareResult" />
    </section>

    <!-- Action Sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showSprayActions || showLabelActions" class="sheet-overlay" @click="closeSheet">
          <div class="action-sheet" @click.stop>
            <div class="sheet-handle"></div>
            <div class="sheet-title">选择图片来源</div>
            <button class="sheet-option" :disabled="cameraLoading" @click="sprayMode ? openSprayCamera() : openLabelCamera()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>拍照</span>
            </button>
            <button class="sheet-option" :disabled="cameraLoading" @click="sprayMode ? openSprayGallery() : openLabelGallery()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span>从相册选择</span>
            </button>
            <div class="sheet-spacer"></div>
            <button class="sheet-cancel" @click="closeSheet">取消</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useCamera } from '@/composables/useCamera'
import { useToast } from '@/composables/useToast'
import { useHistoryStore } from '@/stores/history'
import { compareSpraycode } from '@/api/nickel'
import CompareResultCard from '@/components/CompareResultCard.vue'
import type { CompareResult } from '@/types'

const { takePhoto, pickFromGallery } = useCamera()
const { success, warning, danger } = useToast()
const historyStore = useHistoryStore()

const sprayBlob = ref<Blob | null>(null)
const sprayPreview = ref<string | null>(null)
const labelBlob = ref<Blob | null>(null)
const labelPreview = ref<string | null>(null)
const barcode = ref('')
const loading = ref(false)
const cameraLoading = ref(false)
const compareResult = ref<CompareResult | null>(null)
const showSprayActions = ref(false)
const showLabelActions = ref(false)
const sprayMode = ref(true)

const showSheet = (mode: 'spray' | 'label') => {
  if (mode === 'spray') {
    sprayMode.value = true
    showSprayActions.value = true
  } else {
    sprayMode.value = false
    showLabelActions.value = true
  }
}

const closeSheet = () => {
  showSprayActions.value = false
  showLabelActions.value = false
}

const setSprayImage = (blob: Blob) => {
  sprayBlob.value = blob
  if (sprayPreview.value) URL.revokeObjectURL(sprayPreview.value)
  sprayPreview.value = URL.createObjectURL(blob)
}

const setLabelImage = (blob: Blob) => {
  labelBlob.value = blob
  if (labelPreview.value) URL.revokeObjectURL(labelPreview.value)
  labelPreview.value = URL.createObjectURL(blob)
}

const openSprayCamera = async () => {
  cameraLoading.value = true
  closeSheet()
  try {
    const blob = await takePhoto()
    if (blob) { setSprayImage(blob); compareResult.value = null }
  } finally { cameraLoading.value = false }
}

const openSprayGallery = async () => {
  cameraLoading.value = true
  closeSheet()
  try {
    const blob = await pickFromGallery()
    if (blob) { setSprayImage(blob); compareResult.value = null }
  } finally { cameraLoading.value = false }
}

const openLabelCamera = async () => {
  cameraLoading.value = true
  closeSheet()
  try {
    const blob = await takePhoto()
    if (blob) { setLabelImage(blob) }
  } finally { cameraLoading.value = false }
}

const openLabelGallery = async () => {
  cameraLoading.value = true
  closeSheet()
  try {
    const blob = await pickFromGallery()
    if (blob) { setLabelImage(blob) }
  } finally { cameraLoading.value = false }
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

onUnmounted(() => {
  if (sprayPreview.value) URL.revokeObjectURL(sprayPreview.value)
  if (labelPreview.value) URL.revokeObjectURL(labelPreview.value)
})

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
  } catch (e: unknown) {
    danger(e instanceof Error ? e.message : '对比请求失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--tab-height) + var(--space-8) + env(safe-area-inset-bottom, 0px));
  max-width: var(--content-max-width);
  margin: 0 auto;
}

/* Header */
.header {
  padding-top: 0;
  margin-bottom: var(--space-6);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: var(--text-large-title);
  font-weight: 700;
  letter-spacing: -0.022em;
  color: var(--text);
}

.badge-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.header-desc {
  font-size: var(--text-subhead);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
  letter-spacing: 0.01em;
}

/* Section Labels */
.section-label-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-2);
}

.label-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.label-dot.secondary { background: var(--text-quaternary); }

.section-label-text {
  font-size: var(--text-footnote);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.optional-badge {
  font-size: var(--text-caption-2);
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  text-transform: none;
  letter-spacing: 0;
  margin-left: auto;
}

/* Image Dropzone */
.image-dropzone {
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  background: var(--surface);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

.image-dropzone::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent-soft);
  opacity: 0;
  transition: opacity var(--duration-micro) var(--ease-out);
}

.image-dropzone:active {
  border-color: var(--accent-border);
  border-style: solid;
}

.image-dropzone:active::before {
  opacity: 1;
}

.dropzone-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: transform var(--duration-micro) var(--ease-out);
}

.image-dropzone:active .dropzone-icon-wrap {
  transform: scale(0.95);
}

.dropzone-icon-wrap.secondary {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
}

.dropzone-text {
  font-size: var(--text-subhead);
  color: var(--text);
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.dropzone-subtext {
  font-size: var(--text-caption-2);
  color: var(--text-tertiary);
  font-weight: 400;
  position: relative;
  z-index: 1;
}

/* Image Preview Card */
.image-section { margin-bottom: var(--space-5); }

.image-preview-card {
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  animation: scaleIn 0.35s var(--ease-out-expo);
}

.image-preview-card.small { max-height: 160px; }

.image-preview {
  position: relative;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  max-height: 220px;
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

/* Options */
.options-section { margin-bottom: var(--space-5); }

.options-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  padding: var(--space-3) var(--space-4);
}

.barcode-input {
  height: 42px;
  font-family: var(--font-mono);
  font-size: var(--text-subhead);
  letter-spacing: 0.05em;
  border: none;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.barcode-input:focus {
  box-shadow: none;
  background: transparent;
}

/* Action */
.action-section { margin-bottom: var(--space-6); }

.btn-primary { width: 100%; }

/* Result */
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

/* Sheet transitions */
.sheet-enter-active { animation: sheetFadeIn 0.25s ease; }
.sheet-leave-active { animation: sheetFadeOut 0.18s ease-in forwards; }
@keyframes sheetFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sheetFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
