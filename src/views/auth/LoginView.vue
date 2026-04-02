<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const form = ref({
  username: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        badge: `${BRAND.name} · 欢迎回来`,
        title: '继续推进你的团队空间',
        summary: '登录后直接回到总览台，查看团队进度、最新动态和待处理事项。',
        username: '用户名',
        usernamePlaceholder: 'team-operator',
        password: '密码',
        passwordPlaceholder: '输入你的密码',
        submit: '登录',
        submitting: '登录中...',
        sideTitle: '登录后你会看到',
        sideCards: [
          {
            title: '总览优先',
            body: '先看到完成率、待办和最近动态，不需要先理解整个系统。',
          },
          {
            title: '权限清楚',
            body: '不同角色进入后看到各自该做的事，不会被多余操作打扰。',
          },
          {
            title: '协作连续',
            body: '从同一个空间继续推进路线图、笔记和团队协作，而不是回到零散工具。',
          },
        ],
        helperTitle: '为什么团队会频繁打开',
        helperBody: '因为这里不是单纯的记录页，而是每天看进度、找信息和继续协作的入口。',
        registerLead: '还没有账号？',
        registerAction: '创建团队空间',
        error: '登录失败，请稍后重试',
      }
    : {
        badge: `${BRAND.name} · Welcome back`,
        title: 'Return to your team workspace',
        summary: 'Sign in and jump straight back into the dashboard, recent activity, and next actions.',
        username: 'Username',
        usernamePlaceholder: 'team-operator',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        submit: 'Sign in',
        submitting: 'Signing in...',
        sideTitle: 'What you get after sign-in',
        sideCards: [
          {
            title: 'Dashboard first',
            body: 'See completion, next steps, and recent activity before anything else.',
          },
          {
            title: 'Clear permissions',
            body: 'Each role lands on the right surface without extra noise or wrong prompts.',
          },
          {
            title: 'Continuous collaboration',
            body: 'Keep moving roadmap, notes, and teamwork forward from one shared space.',
          },
        ],
        helperTitle: 'Why teams come back often',
        helperBody: 'This is not just where records live. It is the daily entry point for progress, context, and teamwork.',
        registerLead: 'Need an account?',
        registerAction: 'Create workspace',
        error: 'Unable to sign in right now',
      }
)

const redirectTarget = computed(() => {
  const redirect = router.currentRoute.value.query.redirect
  return typeof redirect === 'string' ? redirect : '/admin/dashboard'
})

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
<<<<<<< HEAD
    const session = await authApi.login(form.value)
    authStore.login(session)
    router.push(redirectTarget.value)
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.error
=======
    const res = await axios.post('/api/auth/login', form.value)
    if (res.data.success) {
      authStore.login(res.data.data.token, res.data.data.user)
      // 💡 登录成功后直接进入画布页面
      router.push('/') 
    }
  } catch (err: any) {
    alert(err.response?.data?.error || "Login Failed")
>>>>>>> 799543ebb89fa502829788d34763b5592c9d36c4
  } finally {
    loading.value = false
  }
}
</script>

<template>
<<<<<<< HEAD
  <div class="page-shell px-5 py-6 md:px-8 md:py-8">
    <div class="product-shell mb-6 flex justify-end">
      <LanguageSwitcher />
    </div>
=======
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
    <!-- 登录卡片主体 -->
    <div class="max-w-md w-full bg-white rounded-[3rem] p-16 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-700">
      <header class="text-center mb-12">
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase">Identity Access</h1>
        <p class="text-[10px] font-bold text-slate-400 mt-2 tracking-[0.3em] uppercase">Secure Learning Environment</p>
      </header>
>>>>>>> 799543ebb89fa502829788d34763b5592c9d36c4

    <div class="product-shell grid min-h-[calc(100vh-7.5rem)] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section class="order-2 lg:order-1">
        <div class="rounded-[2.4rem] bg-[var(--surface-dark)] p-8 text-white shadow-[0_36px_120px_rgba(20,33,43,0.18)] md:p-10">
          <div class="product-eyebrow border border-white/10 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.76)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
            {{ copy.sideTitle }}
          </div>

          <div class="mt-8 space-y-4">
            <article
              v-for="card in copy.sideCards"
              :key="card.title"
              class="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5"
            >
              <h2 class="font-[var(--font-display)] text-2xl font-black tracking-[-0.05em]">{{ card.title }}</h2>
              <p class="mt-3 text-sm leading-7 text-[rgba(255,255,255,0.68)]">{{ card.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="order-1 lg:order-2">
        <div class="product-panel rounded-[2.4rem] p-8 md:p-10">
          <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/80 text-[var(--brand)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
            {{ copy.badge }}
          </div>

          <h1 class="product-title mt-8 text-4xl leading-[0.96] md:text-5xl">{{ copy.title }}</h1>
          <p class="mt-4 max-w-xl text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>

          <form class="mt-10 space-y-5" @submit.prevent="handleLogin">
            <div class="space-y-2">
              <label class="product-label">{{ copy.username }}</label>
              <input v-model="form.username" class="product-input" type="text" :placeholder="copy.usernamePlaceholder" />
            </div>

            <div class="space-y-2">
              <label class="product-label">{{ copy.password }}</label>
              <input
                v-model="form.password"
                class="product-input"
                type="password"
                :placeholder="copy.passwordPlaceholder"
              />
            </div>

            <div v-if="errorMessage" class="product-error px-4 py-3 text-sm font-semibold">
              {{ errorMessage }}
            </div>

            <button class="product-button-primary mt-2 w-full" :disabled="loading" type="submit">
              {{ loading ? copy.submitting : copy.submit }}
            </button>
          </form>

          <div class="product-muted-card mt-6 px-5 py-4">
            <div class="text-sm font-bold text-[var(--accent)]">
              {{ copy.helperTitle }}
            </div>
            <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.helperBody }}</p>
          </div>

          <p class="mt-6 text-sm font-semibold text-[var(--ink-soft)]">
            {{ copy.registerLead }}
            <button class="text-[var(--brand)] transition-colors hover:text-[var(--brand-deep)]" type="button" @click="router.push('/register')">
              {{ copy.registerAction }}
            </button>
          </p>
        </div>
      </section>
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
