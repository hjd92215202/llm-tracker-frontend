<script setup lang="ts">
import { onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.token && (!authStore.user || authStore.workspaces.length === 0 || !authStore.activeWorkspaceId)) {
    try {
      const session = await authApi.getMe()
      authStore.setSession(session)
    } catch {
      authStore.logout()
    }
  }
})
</script>

<template>
  <div class="page-shell">
    <router-view />
  </div>
</template>

<style>
html,
body {
  scrollbar-width: thin;
  scrollbar-color: rgba(42, 58, 68, 0.24) transparent;
}

body::-webkit-scrollbar {
  width: 10px;
}

body::-webkit-scrollbar-track {
  background: transparent;
}

body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(42, 58, 68, 0.18);
}
</style>
