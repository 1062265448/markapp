<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <TabBar v-if="showTabBar" />

    <!-- Toast Notifications -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-container">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
        >
          <div class="toast-icon">
            <svg v-if="t.type === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <svg v-else-if="t.type === 'warning'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <svg v-else-if="t.type === 'danger'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </transition-group>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { toasts } from '@/composables/useToast'

const route = useRoute()

const showTabBar = computed(() => {
  if (route.path === '/login') return false
  if (route.meta.tab) return true
  return false
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
}

.toast-container {
  position: fixed;
  top: calc(52px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
  width: calc(100% - 40px);
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(40, 40, 40, 0.92);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: #fff;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-subhead);
  font-weight: 500;
  pointer-events: auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.toast.success .toast-icon { background: rgba(52, 199, 89, 0.2); color: #34C759; }
.toast.warning .toast-icon { background: rgba(255, 149, 0, 0.2); color: #FF9500; }
.toast.danger .toast-icon { background: rgba(255, 59, 48, 0.2); color: #FF453A; }
.toast-message { line-height: 1.4; }

@media (prefers-color-scheme: dark) {
  .toast {
    background: rgba(60, 60, 60, 0.95);
    border: 0.5px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
