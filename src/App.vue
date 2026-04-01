<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'

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
  <router-view />
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  background-color: #ffffff;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
}

#app {
  width: 100%;
}

body {
  overflow-y: auto;
}
</style>
