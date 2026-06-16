<template>
  <div class="page">
    <!-- Header -->
    <header class="header fade-up">
      <div class="header-badge">
        <div class="badge-dot"></div>
        <span>喷码对比</span>
      </div>
      <p class="header-desc">对比喷码与标签信息是否一致</p>
    </header>

    <!-- Spraycode Image -->
    <section class="image-section fade-up">
      <div class="section-label">
        <span class="label-dot"></span>
        喷码图片
      </div>
      <div class="image-dropzone" v-if="!sprayPreview" @click="showSprayActions = true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="dropzone-icon">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="dropzone-text">点击上传喷码图片</span>
      </div>
      <div class="image-preview" v-else>
        <img :src="sprayPreview" alt="喷码" />
        <button class="clear-btn" @click="clearSpray">✕</button>
      </div>
    </section>

    <!-- Label Image (optional) -->
    <section class="image-section fade-up">
      <div class="section-label">
        <span class="label-dot secondary"></span>
        标签图片
        <span class="optional">可选</span>
      </div>
      <div class="image-dropzone" v-if="!labelPreview" @click="showLabelActions = true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="dropzone-icon">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <span class="dropzone-text">点击上传标签图片</span>
      </div>
      <div class="image-preview small" v-else>
        <img :src="labelPreview" alt="标签" />
        <button class="clear-btn" @click="clearLabel">✕</button>
      </div>
    </section>

    <!-- Barcode -->
    <section class="options-section fade-up">
      <input class="input barcode-input" v-model="barcode" placeholder="输入条形码（可选）" />
    </section>

    <!-- Compare Button -->
    <section class="action-section fade-up">
      <button class="btn-primary" @click="doCompare" :disabled="loading || !sprayBlob">
        <span v-if="loading" class="spinner" style="margin-right:8px;"></span>
        {{ loading ? '对比中...' : '开始对比' }}
      </button>
    </section>

    <!-- Compare Result -->
    <section class="result-section fade-up" v-if="compareResult">
      <CompareResultCard :result="compareResult" />
    </section>

    <!-- Action Sheet (Camera / Gallery) -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showSprayActions || showLabelActions" class="sheet-overlay" @click="closeSheet">
          <div class="action-sheet" @click.stop>
            <div class="sheet-handle"></div>
            <div class="sheet-title">选择图片来源</div>
            <button class="sheet-option" @click="sprayMode ? openSprayCamera() : openLabelCamera()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>拍照</span>
            </button>
            <button class="sheet-option" @click="sprayMode ? openSprayGallery() : openLabelGallery()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
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
  max-width: 480px;
  margin: 0 auto;
}

/* ── Header ── */
.header {
  padding-top: var(--safe-top);
  margin-bottom: var(--space-8);
}
.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.header-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: var(--space-1);
  letter-spacing: 0.01em;
}

/* ── Section Labels ── */
.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
.label-dot.secondary { background: var(--text-tertiary); }
.optional {
  font-weight: 400;
  color: var(--text-tertiary);
  text-transform: none;
  letter-spacing: 0;
}

/* ── Image Dropzone ── */
.image-dropzone {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--bg-elevated);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color var(--duration-micro), background var(--duration-micro);
  -webkit-tap-highlight-color: transparent;
}
.image-dropzone:active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dropzone-icon {
  color: var(--text-tertiary);
  transition: color var(--duration-micro);
}
.image-dropzone:active .dropzone-icon { color: var(--accent); }
.dropzone-text {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

/* ── Image Preview ── */
.image-section { margin-bottom: var(--space-5); }
.image-preview {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}
.image-preview.small { max-height: 140px; }
.image-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: #1A1A1A;
  display: block;
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
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: transform var(--duration-fast);
}
.clear-btn:active { transform: scale(0.9); }

/* ── Options ── */
.options-section { margin-bottom: var(--space-5); }
.barcode-input {
  height: 42px;
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.05em;
}

/* ── Action Button ── */
.action-section { margin-bottom: var(--space-6); }

/* ── Result ── */
.result-section { margin-top: var(--space-4); }

/* ── Action Sheet ── */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.action-sheet {
  width: 100%;
  max-width: 480px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--space-4) var(--space-4);
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: sheetIn 0.35s var(--ease-out);
}
@keyframes sheetIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-handle {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-strong);
  margin: 0 auto var(--space-3);
}
.sheet-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: var(--space-2);
}
.sheet-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 50px;
  padding: 0 var(--space-4);
  background: var(--bg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: background var(--duration-fast);
  font-family: var(--font-body);
}
.sheet-option:active { background: var(--bg-secondary); }
.sheet-spacer { height: var(--space-2); }
.sheet-cancel {
  height: 50px;
  background: var(--bg);
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  transition: background var(--duration-fast);
}
.sheet-cancel:active { background: var(--bg-secondary); }

.sheet-enter-active { animation: sheetFadeIn 0.2s ease; }
.sheet-leave-active { animation: sheetFadeOut 0.15s ease-in; }
@keyframes sheetFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sheetFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
