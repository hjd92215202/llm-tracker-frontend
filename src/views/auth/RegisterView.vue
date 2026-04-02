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
        badge: `${BRAND.name} · 创建团队空间`,
        title: '创建账号，启动你的第一套团队空间',
        summary: '几分钟内完成初始化，立即开始管理成员、路线图、笔记与协作节奏。',
        username: '用户名',
        usernamePlaceholder: 'team-operator',
        email: '邮箱',
        emailPlaceholder: 'team@company.com',
        password: '密码',
        passwordPlaceholder: '至少 6 位',
        confirm: '确认密码',
        confirmPlaceholder: '再次输入密码',
        submit: '创建账号并进入',
        submitting: '正在初始化空间...',
        sideTitle: '开通后立即可用',
        sideCards: [
          {
            title: '空间基础已就绪',
            body: '注册后即可获得可继续扩展的团队空间，不需要再拼装基础协作能力。',
          },
          {
            title: '角色权限已内置',
            body: '所有者、管理员、成员和只读角色都已经准备好，团队协作边界更清楚。',
          },
          {
            title: '总览入口默认可用',
            body: '创建完成后直接进入总览台，先看重点，再决定下一步如何推进。',
          },
        ],
        loginLead: '已经有账号？',
        loginAction: '去登录',
        mismatch: '两次输入的密码不一致',
        error: '创建账号失败，请稍后重试',
      }
    : {
        badge: `${BRAND.name} · Create workspace`,
        title: 'Create an account and launch your first workspace',
        summary: 'Get set up in minutes and start managing members, roadmap, notes, and collaboration rhythm right away.',
        username: 'Username',
        usernamePlaceholder: 'team-operator',
        email: 'Email',
        emailPlaceholder: 'team@company.com',
        password: 'Password',
        passwordPlaceholder: 'At least 6 characters',
        confirm: 'Confirm password',
        confirmPlaceholder: 'Enter password again',
        submit: 'Create account and continue',
        submitting: 'Provisioning workspace...',
        sideTitle: 'Ready on day one',
        sideCards: [
          {
            title: 'Workspace foundation',
            body: 'Start with a team space that already supports the essentials of structured collaboration.',
          },
          {
            title: 'Permissions included',
            body: 'Owner, admin, member, and viewer roles are already built into the product.',
          },
          {
            title: 'Dashboard by default',
            body: 'Land in the overview first so users see the most important information immediately.',
          },
        ],
        loginLead: 'Already have access?',
        loginAction: 'Sign in',
        mismatch: 'Passwords do not match',
        error: 'Unable to create the account right now',
      }
)

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
    router.push('/admin/dashboard')
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
    </div>
  </div>
</template>
