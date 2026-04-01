<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()
const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const workspaceSwitcher = computed({
  get: () => (authStore.activeWorkspaceId ? String(authStore.activeWorkspaceId) : ''),
  set: (value: string) => authStore.setActiveWorkspace(Number(value)),
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <aside
      :class="[isCollapsed ? 'w-20' : 'w-80']"
      class="relative flex shrink-0 flex-col overflow-hidden border-r border-slate-900/5 bg-slate-950 text-white transition-all duration-500 ease-in-out"
    >
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_34%)] opacity-70"></div>

      <button
        @click="toggleSidebar"
        class="absolute -right-3 top-10 z-50 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-blue-600 text-[11px] font-black text-white transition-all hover:bg-white hover:text-blue-600"
      >
        <span :class="[isCollapsed ? 'rotate-180' : '']" class="transition-transform duration-500">&gt;</span>
      </button>

      <div class="relative px-8 pb-8 pt-9">
        <div class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">
          Ops Console
        </div>
        <h2 class="mt-5 text-3xl font-black tracking-[-0.08em] text-white">
          A<span v-show="!isCollapsed">I Workspace</span>
        </h2>
        <p v-show="!isCollapsed" class="mt-3 max-w-[14rem] text-sm leading-6 text-slate-400">
          Run planning, notes, and team execution from one commercial-grade control layer.
        </p>
      </div>

      <div v-show="!isCollapsed" class="relative px-6">
        <div class="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
          <div class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Active workspace</div>
          <select v-model="workspaceSwitcher" class="workspace-select mt-3 w-full">
            <option v-for="workspace in authStore.workspaces" :key="workspace.workspace_id" :value="String(workspace.workspace_id)">
              {{ workspace.workspace_name }} / {{ workspace.role }}
            </option>
          </select>
          <div class="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>{{ authStore.activeWorkspace?.workspace_slug }}</span>
            <span class="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
              {{ authStore.activeRole }}
            </span>
          </div>
        </div>
      </div>

      <nav class="relative mt-8 flex-1 px-4">
        <router-link to="/admin/workspace" class="admin-nav-item" active-class="active">
          <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"></div>
          <span v-show="!isCollapsed">Workspace and team</span>
        </router-link>
        <router-link to="/admin/roadmap" class="admin-nav-item" active-class="active">
          <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"></div>
          <span v-show="!isCollapsed">Roadmap operations</span>
        </router-link>
        <router-link to="/admin/notes" class="admin-nav-item" active-class="active">
          <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"></div>
          <span v-show="!isCollapsed">Research notes</span>
        </router-link>
      </nav>

      <div class="relative mt-auto p-4">
        <div class="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
          <div class="flex items-center gap-4" :class="[isCollapsed ? 'justify-center' : '']">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black shadow-lg shadow-blue-600/30">
              {{ authStore.user?.username?.charAt(0)?.toUpperCase() }}
            </div>
            <div v-show="!isCollapsed" class="min-w-0">
              <div class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Account</div>
              <div class="mt-1 truncate text-sm font-black text-slate-100">{{ authStore.user?.username }}</div>
              <div class="mt-1 truncate text-xs text-slate-400">{{ authStore.user?.email }}</div>
            </div>
          </div>

          <div v-show="!isCollapsed" class="mt-5 grid grid-cols-2 gap-3">
            <router-link to="/" class="footer-link">Site</router-link>
            <button @click="handleLogout" class="footer-link text-red-300 hover:bg-red-500 hover:text-white">Logout</button>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
@reference "@/style.css";

.admin-nav-item {
  @apply mb-2 flex items-center gap-4 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 transition-all duration-300 hover:bg-white/5;
}

.admin-nav-item.active {
  @apply bg-blue-600 text-white shadow-xl shadow-blue-500/20;
}

.workspace-select {
  @apply appearance-none rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none transition-all;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6' /%3E%3C/svg%3E");
  background-position: right 0.9rem center;
  background-repeat: no-repeat;
  background-size: 0.9rem;
}

.workspace-select:focus {
  @apply border-blue-400;
}

.footer-link {
  @apply flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-200 transition-all hover:bg-white hover:text-slate-950;
}
</style>
