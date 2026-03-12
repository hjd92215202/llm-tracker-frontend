import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 前台展示
    {
      path: '/',
      name: 'roadmap',
      component: () => import('@/views/roadmap/RoadmapView.vue')
    },
    {
      path: '/note/:id',
      name: 'note-detail',
      component: () => import('@/views/note/NoteDetail.vue')
    },
    // 后台管理
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'), // 需创建布局组件
      redirect: '/admin/roadmap',
      children: [
        {
          path: 'roadmap',
          name: 'admin-roadmap',
          component: () => import('@/views/admin/NodeManager.vue')
        },
        {
          path: 'note/create',
          name: 'admin-note-create',
          component: () => import('@/views/note/NoteEditor.vue')
        }
      ]
    }
  ]
})

export default router