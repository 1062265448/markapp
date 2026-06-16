<template>
  <div class="login-page">
    <div class="login-content">
      <div class="login-header">
        <div class="brand-dot"></div>
        <div class="brand-label">MARKAPP</div>
        <h1 class="brand-title">镍板标签识别</h1>
        <p class="brand-sub">喷码对比 · AI 识别 · 质量追踪</p>
      </div>

      <div class="login-form">
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

        <button class="btn-primary" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" class="spinner" style="margin-right:8px;"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
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
  padding: 40px var(--space-6);
  padding-top: calc(40px + var(--safe-top));
}
.login-content {
  width: 100%;
  max-width: 340px;
}
.login-header {
  text-align: center;
  margin-bottom: var(--space-10);
}
.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  margin: 0 auto var(--space-4);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
.brand-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: var(--space-2);
}
.brand-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: var(--text);
  font-family: var(--font-display);
}
.brand-sub {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: var(--space-2);
  font-weight: 400;
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
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-input {
  height: 48px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-4);
  font-size: 15px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  font-family: var(--font-body);
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
}
.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.form-input::placeholder {
  color: var(--text-tertiary);
}
.btn-primary {
  height: 50px;
  background: var(--accent);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-2);
  transition: transform var(--duration-micro) var(--ease-out);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  width: 100%;
  font-family: var(--font-body);
}
.btn-primary:active { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.5; pointer-events: none; }
</style>
