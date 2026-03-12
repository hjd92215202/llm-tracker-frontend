<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <!-- 左侧管理菜单 -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col shrink-0">
      <div class="p-8">
        <h2 class="text-xl font-black tracking-tighter">BACKSTAGE</h2>
        <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Management Console</p>
      </div>

      <nav class="flex-1 px-4 space-y-2">
        <router-link to="/admin/roadmap" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors font-bold text-xs uppercase tracking-widest text-slate-400" active-class="bg-blue-600! text-white!">
          Nodes Management
        </router-link>
        <router-link to="/admin/notes" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors font-bold text-xs uppercase tracking-widest text-slate-400" active-class="bg-blue-600! text-white!">
          Research Notes
        </router-link>
      </nav>

      <div class="p-8 border-t border-white/5">
        <button @click="router.push('/')" class="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
          ← Back to Site
        </button>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>