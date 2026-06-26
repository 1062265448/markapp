import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 初始化 API Key（如果未设置）
if (!localStorage.getItem('markapp_api_key')) {
  localStorage.setItem('markapp_api_key', 'markapp2026')
}

app.mount('#app')
