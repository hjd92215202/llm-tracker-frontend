import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/marketing/HomeView.vue') },
    {
      path: '/roadmap',
      name: 'roadmap',
      component: () => import('@/views/roadmap/RoadmapView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/note/:id',
      name: 'note-detail',
      component: () => import('@/views/note/NoteDetail.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterView.vue') },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      redirect: '/admin/workspace',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'workspace',
          name: 'admin-workspace',
          component: () => import('@/views/admin/WorkspaceManager.vue'),
        },
        { path: 'roadmap', name: 'admin-roadmap', component: () => import('@/views/admin/NodeManager.vue') },
        { path: 'notes', name: 'admin-notes', component: () => import('@/views/admin/NoteManager.vue') },
        {
          path: 'note/create',
          name: 'admin-note-create',
          component: () => import('@/views/note/NoteEditor.vue'),
          meta: { requiresWriteAccess: true },
        },
        {
          path: 'note/edit/:id',
          name: 'admin-note-edit',
          component: () => import('@/views/note/NoteEditor.vue'),
          meta: { requiresWriteAccess: true },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresWriteAccess && !authStore.hasWriteAccess) {
    return { name: 'admin-notes' }
  }

  if (authStore.isLoggedIn && (to.name === 'login' || to.name === 'register')) {
    return { name: 'admin-workspace' }
  }
})

export default router
