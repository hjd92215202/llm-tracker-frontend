<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const form = ref({ username: '', password: '' })
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await axios.post('/api/auth/login', form.value)
    if (res.data.success) {
      authStore.login(res.data.data.token, res.data.data.user)
      // 💡 登录成功后直接进入画布页面
      router.push('/') 
    }
  } catch (err: any) {
    alert(err.response?.data?.error || "Login Failed")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
    <!-- 登录卡片主体 -->
    <div class="max-w-md w-full bg-white rounded-[3rem] p-16 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-700">
      <header class="text-center mb-12">
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase">Identity Access</h1>
        <p class="text-[10px] font-bold text-slate-400 mt-2 tracking-[0.3em] uppercase">Secure Learning Environment</p>
      </header>

      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
          <input v-model="form.username" type="text" class="admin-input" placeholder="Enter identity..." />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input v-model="form.password" type="password" class="admin-input" placeholder="••••••••" @keyup.enter="handleLogin" />
        </div>

        <button @click="handleLogin" :disabled="loading" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-900 transition-all mt-8 shadow-xl shadow-blue-500/20 active:scale-95">
          {{ loading ? 'Authenticating...' : 'Establish Connection' }}
        </button>
        
        <p class="text-center mt-8 text-xs font-bold text-slate-300">
          No account? <span class="text-blue-500 cursor-pointer hover:underline" @click="router.push('/register')">Request Access</span>
        </p>
      </div>
    </div>

    <!-- 💡 ICP 备案信息 -->
    <footer class="mt-12 flex flex-col items-center gap-2">
      <a href="https://beian.miit.gov.cn/" target="_blank" class="text-[10px] font-bold text-slate-300 hover:text-blue-500 transition-colors tracking-widest uppercase">
        陕ICP备2026003348号-2
      </a>
      <p class="text-[8px] font-black text-slate-200 tracking-[0.4em] uppercase">Neural Infrastructure Control</p>
    </footer>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";
.admin-input {
  display: block; width: 100%; background-color: #f8fafc; border: 2px solid #e2e8f0!important; 
  border-radius: 1rem; padding: 1.25rem 1.5rem; font-size: 0.875rem; font-weight: 700; color: #1e293b; outline: none;
}
.admin-input:focus { border-color: #2563eb!important; box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08); background-color: white; }
</style>