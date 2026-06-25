<template>
  <div class="login-page">
    <div class="login-content">
      <!-- Brand -->
      <div class="login-header fade-up">
        <div class="brand-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7l9-5.2a2 2 0 0 1 2 0l9 5.2A2 2 0 0 1 23 8z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div class="brand-label">MarkApp</div>
        <h1 class="brand-title">镍板标签识别</h1>
        <p class="brand-sub">喷码对比 · AI 识别 · 质量追踪</p>
      </div>

      <!-- Form -->
      <div class="login-form fade-up fade-up-delay-1">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="handleSubmit"
          />
        </div>

        <button class="btn-login" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" class="spinner" style="margin-right: 10px;"></span>
          <span>{{ loading ? '登录中...' : '登录' }}</span>
        </button>
      </div>

      <!-- Footer hint -->
      <div class="login-footer fade-up fade-up-delay-2">
        <p>安全登录，数据加密传输</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { success, danger } = useToast()

const loading = ref(false)
const form = reactive({ username: '', password: '' })

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    danger('请填写用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login({ username: form.username, password: form.password })
    success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '登录失败'
    danger(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 40px var(--space-5);
  padding-top: calc(40px + var(--safe-top));
}

.login-content {
  width: 100%;
  max-width: 360px;
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-10);
}

.brand-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-5);
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.brand-label {
  font-size: var(--text-caption-2);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--accent);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.brand-title {
  font-size: var(--text-large-title);
  font-weight: 700;
  letter-spacing: -0.022em;
  color: var(--text);
  font-family: var(--font-display);
}

.brand-sub {
  font-size: var(--text-subhead);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
  font-weight: 400;
  letter-spacing: 0.02em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-footnote);
  font-weight: 600;
  color: var(--text-secondary);
  padding-left: 2px;
  letter-spacing: 0.02em;
}

.form-input {
  height: 52px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-4);
  font-size: var(--text-body);
  color: var(--text);
  background: var(--surface);
  outline: none;
  font-family: var(--font-body);
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out), background var(--duration-micro) var(--ease-out);
  width: 100%;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background: var(--bg);
}

.form-input::placeholder {
  color: var(--text-quaternary);
}

.btn-login {
  height: 52px;
  background: var(--accent);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-subhead);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-2);
  transition: transform var(--duration-micro) var(--ease-out), background var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  width: 100%;
  font-family: var(--font-body);
  letter-spacing: -0.01em;
}

.btn-login:active {
  transform: scale(0.97);
  background: var(--accent-hover);
  box-shadow: var(--shadow-md);
}

.btn-login:disabled {
  opacity: 0.4;
  pointer-events: none;
  box-shadow: none;
}

.login-footer {
  text-align: center;
  margin-top: var(--space-8);
}

.login-footer p {
  font-size: var(--text-caption-2);
  color: var(--text-quaternary);
  letter-spacing: 0.04em;
}
</style>
