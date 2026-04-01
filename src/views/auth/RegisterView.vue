<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const errorMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''

  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    await authApi.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
    })

    const session = await authApi.login({
      username: form.value.username,
      password: form.value.password,
    })

    authStore.login(session)
    router.push('/admin/workspace')
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to create account'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_100%)] px-6 py-10">
    <div class="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="w-full max-w-xl rounded-[2.5rem] border border-white/80 bg-white/92 p-10 shadow-[0_30px_100px_rgba(37,99,235,0.12)] backdrop-blur lg:p-14">
        <header class="mb-10">
          <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">Start your workspace</div>
          <h1 class="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950">Create an account and launch your first team space</h1>
          <p class="mt-3 text-sm leading-6 text-slate-500">
            Set up one shared place for roadmap planning, research notes, and execution assets.
          </p>
        </header>

        <div class="space-y-5">
          <div class="space-y-2">
            <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Username</label>
            <input v-model="form.username" type="text" class="admin-input" placeholder="team-operator" />
          </div>

          <div class="space-y-2">
            <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Email</label>
            <input v-model="form.email" type="email" class="admin-input" placeholder="team@company.com" />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Password</label>
              <input v-model="form.password" type="password" class="admin-input" placeholder="At least 6 characters" />
            </div>
            <div class="space-y-2">
              <label class="ml-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Confirm</label>
              <input v-model="form.confirmPassword" type="password" class="admin-input" placeholder="Repeat password" />
            </div>
          </div>

          <div v-if="errorMessage" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {{ errorMessage }}
          </div>

          <button
            @click="handleRegister"
            :disabled="loading"
            class="mt-4 w-full rounded-2xl bg-blue-600 py-4 text-xs font-black uppercase tracking-[0.32em] text-white shadow-[0_20px_50px_rgba(37,99,235,0.25)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading ? 'Provisioning workspace...' : 'Create account' }}
          </button>

          <p class="text-center text-sm font-semibold text-slate-400">
            Already have access?
            <span class="cursor-pointer text-blue-600 hover:underline" @click="router.push('/login')">Sign in</span>
          </p>
        </div>
      </div>

      <section class="hidden lg:block px-6">
        <div class="rounded-[2.75rem] border border-white/70 bg-slate-950 p-10 text-white shadow-[0_35px_120px_rgba(15,23,42,0.18)]">
          <div class="text-[11px] font-black uppercase tracking-[0.3em] text-blue-300">What you unlock</div>
          <h2 class="mt-6 text-5xl font-black leading-none tracking-[-0.06em]">
            A commercial-grade foundation for AI teams.
          </h2>
          <div class="mt-10 space-y-5">
            <div class="benefit-card">
              <div class="benefit-label">Workspace structure</div>
              <p class="benefit-copy">
                Every user starts with a dedicated workspace that can grow into a team operating hub.
              </p>
            </div>
            <div class="benefit-card">
              <div class="benefit-label">Role-based collaboration</div>
              <p class="benefit-copy">
                Invite admins, members, and viewers with clear access boundaries from day one.
              </p>
            </div>
            <div class="benefit-card">
              <div class="benefit-label">Execution memory</div>
              <p class="benefit-copy">
                Keep roadmaps, notes, and research artifacts connected so the team compounds knowledge instead of losing it.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.benefit-card {
  @apply rounded-[1.8rem] border border-white/10 bg-white/5 p-6;
}

.benefit-label {
  @apply text-[11px] font-black uppercase tracking-[0.24em] text-blue-200;
}

.benefit-copy {
  @apply mt-3 text-sm leading-7 text-slate-300;
}

.admin-input {
  display: block;
  width: 100%;
  background-color: #f8fbff;
  border: 2px solid #dbeafe !important;
  border-radius: 1rem;
  padding: 1rem 1.15rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.admin-input:focus {
  background-color: white;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.1);
}
</style>
