<template>
  <div class="page">
    <header class="header">
      <div class="header-badge">
        <div class="badge-dot"></div>
        <h1 class="title-2">我的</h1>
      </div>
    </header>

    <!-- User Card -->
    <section class="user-card fade-up">
      <div class="avatar">
        <span>{{ userInitial }}</span>
      </div>
      <div class="user-info">
        <span class="user-name">{{ displayName }}</span>
        <span class="user-role">操作员</span>
      </div>
      <div class="user-chevron">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </section>

    <!-- Menu -->
    <section class="menu-section fade-up fade-up-delay-1">
      <div class="menu-card">
        <button class="menu-item" @click="showSettings()">
          <div class="menu-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </div>
          <span class="menu-text">设置</span>
          <div class="menu-chevron">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" @click="viewStats()">
          <div class="menu-icon-wrap stats-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
          </div>
          <span class="menu-text">统计</span>
          <div class="menu-chevron">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </button>
      </div>
    </section>

    <!-- Logout -->
    <section class="action-section fade-up fade-up-delay-2">
      <button class="btn-logout" @click="handleLogout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>退出登录</span>
      </button>
    </section>

    <!-- App version -->
    <section class="version-section fade-up fade-up-delay-3">
      <p class="version-text">MarkApp v1.0.0</p>
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
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--tab-height) + var(--space-8));
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: 0;
  margin-bottom: var(--space-6);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

.title-2 {
  font-size: var(--text-large-title);
  font-weight: 700;
  letter-spacing: -0.022em;
  font-family: var(--font-display);
}

/* User Card */
.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  margin-bottom: var(--space-5);
  transition: all var(--duration-micro) var(--ease-out);
  cursor: pointer;
}

.user-card:active {
  transform: scale(0.985);
  background: var(--surface-pressed);
  box-shadow: var(--shadow-md);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-display);
  flex-shrink: 0;
  transition: transform var(--duration-micro) var(--ease-out);
}

.user-card:active .avatar {
  transform: scale(0.95);
}

.user-name { display: block; font-size: var(--text-title-2); font-weight: 600; letter-spacing: -0.01em; }
.user-role { display: block; font-size: var(--text-footnote); color: var(--text-tertiary); margin-top: 3px; }

.user-chevron {
  margin-left: auto;
  color: var(--text-quaternary);
  flex-shrink: 0;
}

/* Menu */
.menu-section { margin-bottom: var(--space-5); }

.menu-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-4) var(--space-4);
  font-size: var(--text-body);
  font-weight: 400;
  color: var(--text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
  font-family: var(--font-body);
}

.menu-item:active { background: var(--surface-pressed); }

.menu-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon-wrap.stats-icon {
  background: var(--green-soft);
  color: var(--green);
}

.menu-text { flex: 1; text-align: left; }

.menu-chevron {
  color: var(--text-quaternary);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-out);
}

.menu-item:active .menu-chevron {
  transform: translateX(2px);
}

.menu-divider {
  height: 0.5px;
  background: var(--separator);
  margin: 0 var(--space-4);
}

/* Logout */
.action-section { margin-top: var(--space-2); }

.btn-logout {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--red);
  font-size: var(--text-subhead);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  font-family: var(--font-body);
  box-shadow: var(--shadow-sm);
}

.btn-logout:active {
  transform: scale(0.97);
  background: var(--red-soft);
  border-color: var(--red-border);
  box-shadow: var(--shadow-md);
}

/* Version */
.version-section {
  text-align: center;
  margin-top: var(--space-8);
}

.version-text {
  font-size: var(--text-caption-2);
  color: var(--text-quaternary);
  letter-spacing: 0.04em;
}
</style>
