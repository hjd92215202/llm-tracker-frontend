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
  email: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const errorMessage = ref('')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        badge: `${BRAND.name} 注册`,
        title: '创建账号，直接开始整理路线图',
        summary: '注册后直接进入产品，把目标拆成节点，再把过程沉淀成内容。',
        username: '用户名',
        usernamePlaceholder: 'team-operator',
        email: '邮箱',
        emailPlaceholder: 'team@company.com',
        password: '密码',
        passwordPlaceholder: '至少 6 位',
        confirm: '确认密码',
        confirmPlaceholder: '再输入一次密码',
        submit: '创建账号',
        submitting: '创建中...',
        sideTitle: '创建后第一步',
        sideCards: [
          { title: '先画主线', body: '把复杂任务先整理成一条清晰路径。' },
          { title: '再补节点内容', body: '方法、结论和过程都挂在对应节点下面。' },
          { title: '需要时再邀请别人', body: '先把自己的推进理顺，再把协作者拉进来。' },
        ],
        loginLead: '已经有账号？',
        loginAction: '去登录',
        mismatch: '两次输入的密码不一致',
        error: '创建账号失败，请稍后重试',
      }
    : {
        badge: `${BRAND.name} Register`,
        title: 'Create an account and start with the roadmap',
        summary: 'Sign up and begin turning goals into nodes and connected content right away.',
        username: 'Username',
        usernamePlaceholder: 'team-operator',
        email: 'Email',
        emailPlaceholder: 'team@company.com',
        password: 'Password',
        passwordPlaceholder: 'At least 6 characters',
        confirm: 'Confirm password',
        confirmPlaceholder: 'Enter password again',
        submit: 'Create account',
        submitting: 'Creating...',
        sideTitle: 'What happens first',
        sideCards: [
          { title: 'Draw the main path', body: 'Turn complex work into one visible roadmap first.' },
          { title: 'Add content under nodes', body: 'Keep methods, findings, and decisions where they belong.' },
          { title: 'Invite later when needed', body: 'Get your own flow right before bringing others in.' },
        ],
        loginLead: 'Already have an account?',
        loginAction: 'Sign in',
        mismatch: 'Passwords do not match',
        error: 'Unable to create the account right now',
      }
)

const redirectTarget = computed(() => {
  const redirect = router.currentRoute.value.query.redirect
  return typeof redirect === 'string' ? redirect : '/roadmap'
})

const handleRegister = async () => {
  errorMessage.value = ''

  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = copy.value.mismatch
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
    router.push(redirectTarget.value)
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.error
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell px-5 py-6 md:px-8 md:py-8">
    <div class="product-shell mb-6 flex justify-end">
      <LanguageSwitcher />
    </div>

    <div class="product-shell grid min-h-[calc(100vh-7.5rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section>
        <div class="product-panel rounded-[2.4rem] p-8 md:p-10">
          <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/80 text-[var(--brand)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
            {{ copy.badge }}
          </div>

          <h1 class="product-title mt-8 text-4xl leading-[0.96] md:text-5xl">{{ copy.title }}</h1>
          <p class="mt-4 max-w-xl text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>

          <form class="mt-10 space-y-5" @submit.prevent="handleRegister">
            <div class="space-y-2">
              <label class="product-label">{{ copy.username }}</label>
              <input v-model="form.username" class="product-input" type="text" :placeholder="copy.usernamePlaceholder" />
            </div>

            <div class="space-y-2">
              <label class="product-label">{{ copy.email }}</label>
              <input v-model="form.email" class="product-input" type="email" :placeholder="copy.emailPlaceholder" />
            </div>

            <div class="grid gap-5 md:grid-cols-2">
              <div class="space-y-2">
                <label class="product-label">{{ copy.password }}</label>
                <input v-model="form.password" class="product-input" type="password" :placeholder="copy.passwordPlaceholder" />
              </div>

              <div class="space-y-2">
                <label class="product-label">{{ copy.confirm }}</label>
                <input
                  v-model="form.confirmPassword"
                  class="product-input"
                  type="password"
                  :placeholder="copy.confirmPlaceholder"
                />
              </div>
            </div>

            <div v-if="errorMessage" class="product-error px-4 py-3 text-sm font-semibold">
              {{ errorMessage }}
            </div>

            <button class="product-button-primary mt-2 w-full" :disabled="loading" type="submit">
              {{ loading ? copy.submitting : copy.submit }}
            </button>
          </form>

          <p class="mt-6 text-sm font-semibold text-[var(--ink-soft)]">
            {{ copy.loginLead }}
            <button class="text-[var(--brand)] transition-colors hover:text-[var(--brand-deep)]" type="button" @click="router.push('/login')">
              {{ copy.loginAction }}
            </button>
          </p>
        </div>
      </section>

      <section>
        <div class="rounded-[2.4rem] bg-[linear-gradient(180deg,#15242c_0%,#122029_100%)] p-8 text-white shadow-[0_36px_120px_rgba(20,33,43,0.18)] md:p-10">
          <div class="product-eyebrow border border-white/10 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.76)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
            {{ copy.sideTitle }}
          </div>

          <div class="mt-8 space-y-3">
            <article
              v-for="(card, index) in copy.sideCards"
              :key="card.title"
              class="flex gap-4 rounded-[1.4rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-4"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/88">
                {{ index + 1 }}
              </span>
              <div>
                <h2 class="font-[var(--font-display)] text-xl font-black tracking-[-0.05em]">{{ card.title }}</h2>
                <p class="mt-2 text-sm leading-7 text-[rgba(255,255,255,0.68)]">{{ card.body }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
