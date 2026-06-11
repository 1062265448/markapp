<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <TabBar v-if="showTabBar" />

    <!-- Toast -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
          {{ t.message }}
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
const showTabBar = computed(() => route.meta.tab !== undefined)
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg);
}
.toast-container {
  position: fixed;
  top: calc(60px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}
.toast {
  background: var(--text);
  color: var(--text-inverse);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
  box-shadow: var(--shadow-lg);
}
.toast.success { background: var(--green); }
.toast.warning { background: var(--amber); }
.toast.danger { background: var(--red); }
</style>
