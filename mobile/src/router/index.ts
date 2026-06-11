import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '标签识别', tab: 'home' },
  },
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/views/CompareView.vue'),
    meta: { title: '喷码对比', tab: 'compare' },
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '历史记录', tab: 'history' },
  },
  {
    path: '/result/:id',
    name: 'Result',
    component: () => import('@/views/ResultView.vue'),
    meta: { title: '识别结果' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || 'MarkApp'} — 镍板标签识别`
  next()
})

export default router
