<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const form = ref({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

const redirectTarget = computed(() => {
  const redirect = router.currentRoute.value.query.redirect
  return typeof redirect === 'string' ? redirect : '/admin/workspace'
})

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    const session = await authApi.login(form.value)
    authStore.login(session)
    router.push(redirectTarget.value)
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to sign in'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-6 py-10">
    <div class="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
      <section class="hidden lg:block px-6">
        <div class="inline-flex items-center rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-blue-600 shadow-sm">
          Team Operating System for AI Research
        </div>
        <h1 class="mt-8 max-w-2xl text-6xl font-black leading-none tracking-[-0.06em] text-slate-950">
          Turn scattered LLM experiments into one shared workspace.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          Capture roadmap decisions, research notes, and artifacts in one system your team can actually operate.
        </p>
        <div class="mt-10 grid max-w-2xl grid-cols-3 gap-4">
          <div class="feature-card">
            <div class="feature-label">Shared context</div>
            <div class="feature-value">Roadmap plus notes plus assets</div>
          </div>
          <div class="feature-card">
            <div class="feature-label">Workspace roles</div>
            <div class="feature-value">Owner, admin, member, viewer</div>
          </div>
          <div class="feature-card">
            <div class="feature-label">Faster execution</div>
            <div class="feature-value">Less chaos, more shipping</div>
          </div>
        </div>
      </section>

      <div class="w-full max-w-xl justify-self-center rounded-[2.5rem] border border-white/80 bg-white/92 p-10 shadow-[0_30px_100px_rgba(37,99,235,0.12)] backdrop-blur lg:p-14">
        <header class="mb-10">
          <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">Welcome back</div>
          <h2 class="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950">Sign in to your workspace</h2>
          <p class="mt-3 text-sm leading-6 text-slate-500">
            Continue your team&apos;s research operations, planning pipeline, and execution workflow.
          </p>
        </header>

        <div class="space-y-5">
          <div class="space-y-2">
            <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Username</label>
            <input v-model="form.username" type="text" class="admin-input" placeholder="your-team-handle" />
          </div>
          <div class="space-y-2">
            <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Password</label>
            <input
              v-model="form.password"
              type="password"
              class="admin-input"
              placeholder="Enter your password"
              @keyup.enter="handleLogin"
            />
          </div>

          <div v-if="errorMessage" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {{ errorMessage }}
          </div>

          <button
            @click="handleLogin"
            :disabled="loading"
            class="mt-4 w-full rounded-2xl bg-blue-600 py-4 text-xs font-black uppercase tracking-[0.32em] text-white shadow-[0_20px_50px_rgba(37,99,235,0.25)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading ? 'Signing in...' : 'Enter workspace' }}
          </button>

          <div class="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-5 py-4">
            <div class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Why teams use it</div>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              Replace fragmented docs, private notes, and disconnected AI experiments with one operating layer.
            </p>
          </div>

          <p class="text-center text-sm font-semibold text-slate-400">
            New here?
            <span class="cursor-pointer text-blue-600 hover:underline" @click="router.push('/register')">Create your workspace account</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.feature-card {
  @apply rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur;
}

.feature-label {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-slate-400;
}

.feature-value {
  @apply mt-4 text-2xl font-black tracking-tight text-slate-900;
}

.admin-input {
  display: block;
  width: 100%;
  border: 2px solid #dbeafe !important;
  background-color: #f8fbff;
  border-radius: 1rem;
  padding: 1rem 1.15rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.admin-input:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.1);
  background-color: white;
}
</style>
