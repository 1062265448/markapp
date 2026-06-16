<template>
  <div class="page">
    <header class="header fade-up">
      <div class="header-dot"></div>
      <h1 class="header-title">我的</h1>
    </header>

    <!-- User Card -->
    <section class="user-card fade-up">
      <div class="avatar">{{ userInitial }}</div>
      <div class="user-info">
        <span class="user-name">{{ displayName }}</span>
        <span class="user-role">操作员</span>
      </div>
    </section>

    <!-- Menu -->
    <section class="menu fade-up">
      <button class="menu-item" @click="showSettings()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        <span>设置</span>
      </button>
      <button class="menu-item" @click="viewStats()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        <span>统计</span>
      </button>
    </section>

    <!-- Logout -->
    <section class="action-section fade-up">
      <button class="btn-ghost danger" @click="handleLogout">退出登录</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const displayName = computed(() => authStore.user?.username || '未登录')
const userInitial = computed(() => displayName.value.charAt(0).toUpperCase())

const handleLogout = () => {
  authStore.logout()
  router.replace('/login')
}

const showSettings = () => {
  // TODO: 实现设置页面
}
const viewStats = () => {
  // TODO: 实现统计页面
}
</script>

<style scoped>
.page { padding: var(--space-4); padding-bottom: calc(var(--tab-height) + var(--space-8)); max-width: 480px; margin: 0 auto; }
.header { display: flex; align-items: center; gap: var(--space-3); padding-top: var(--safe-top); margin-bottom: var(--space-6); }
.header-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.header-title { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }

.user-card {
  display: flex; align-items: center; gap: var(--space-4);
  padding: var(--space-5);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: var(--space-5);
}
.avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; font-family: var(--font-display);
}
.user-name { display: block; font-size: 16px; font-weight: 600; }
.user-role { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }

.menu { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; margin-bottom: var(--space-5); }
.menu-item {
  display: flex; align-items: center; gap: var(--space-3);
  width: 100%; height: 50px; padding: 0 var(--space-4);
  font-size: 15px; font-weight: 500; color: var(--text);
  background: transparent; border: none; cursor: pointer;
  border-bottom: 0.5px solid var(--border);
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: var(--surface-alt); }

.action-section { margin-top: var(--space-2); }
.btn-ghost.danger { color: var(--red); border-color: var(--red-soft); width: 100%; }
.btn-ghost.danger:active { background: var(--red-soft); }

@media (prefers-color-scheme: dark) {
  .user-card { background: #141414; border: 0.5px solid #2A2A2A; }
  .menu { background: #141414; border: 0.5px solid #2A2A2A; }
  .menu-item { border-bottom-color: #2A2A2A; }
}
</style>
