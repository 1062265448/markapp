<template>
  <nav class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tab"
      :class="{ active: currentTab === tab.name }"
      @click="switchTab(tab.name)"
    >
      <div class="tab-icon-wrap">
        <svg class="tab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="tab.name === 'home'">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
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
          <template v-else-if="tab.name === 'profile'">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </template>
        </svg>
      </div>
      <span class="tab-label">{{ tab.label }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const tabs = [
  { name: 'home', label: '识别', path: '/' },
  { name: 'compare', label: '对比', path: '/compare' },
  { name: 'history', label: '历史', path: '/history' },
  { name: 'profile', label: '我的', path: '/profile' },
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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
  border-top: 0.5px solid var(--separator);
  z-index: 50;
  transition: background var(--duration-normal) var(--ease-out);
}

@media (prefers-color-scheme: dark) {
  .tab-bar {
    background: rgba(18, 18, 18, 0.88);
    border-top-color: rgba(255, 255, 255, 0.06);
  }
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
  min-height: 48px;
  padding: 4px 0 8px;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out);
}

.tab.active {
  color: var(--accent);
}

.tab-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.tab-icon {
  width: 22px;
  height: 22px;
  transition: transform var(--duration-micro) var(--ease-out);
}

.tab:active .tab-icon {
  transform: scale(0.85);
}

.tab-label {
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 0.01em;
  transition: font-weight var(--duration-fast) var(--ease-out);
}

.tab.active .tab-label {
  font-weight: 600;
  color: var(--accent);
}

/* Active indicator dot */
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: dotAppear 0.3s var(--ease-out-expo) 0.1s forwards;
}

@keyframes dotAppear {
  from { opacity: 0; transform: translateX(-50%) scale(0); }
  to { opacity: 1; transform: translateX(-50%) scale(1); }
}
</style>
