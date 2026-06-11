<template>
  <nav class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tab"
      :class="{ active: currentTab === tab.name }"
      @click="switchTab(tab.name)"
    >
      <svg class="tab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="tab.name === 'home'">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </template>
        <template v-else-if="tab.name === 'compare'">
          <rect x="2" y="3" width="8" height="18" rx="1"/>
          <rect x="14" y="3" width="8" height="18" rx="1"/>
          <path d="M6 12h2"/>
          <path d="M6 8h2"/>
          <path d="M16 12h2"/>
          <path d="M16 8h2"/>
        </template>
        <template v-else-if="tab.name === 'history'">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </template>
      </svg>
      <span class="tab-label">{{ tab.label }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const tabs = [
  { name: 'home', label: '标签识别', path: '/' },
  { name: 'compare', label: '喷码对比', path: '/compare' },
  { name: 'history', label: '历史记录', path: '/history' },
]

const router = useRouter()
const route = useRoute()

const currentTab = computed(() => route.meta.tab as string | undefined || '')

const switchTab = (name: string) => {
  const tab = tabs.find(t => t.name === name)
  if (tab) router.push(tab.path)
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  z-index: 50;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--text-tertiary);
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  min-height: 44px;
  padding: 6px 0 12px;
  position: relative;
}
.tab.active { color: var(--accent); }
.tab.active::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
.tab-icon { width: 22px; height: 22px; }
.tab-label { font-weight: 500; font-size: 10px; letter-spacing: 0.2px; }
.tab.active .tab-label { font-weight: 600; }
</style>
