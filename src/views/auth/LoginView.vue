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
        badge: `${BRAND.name} 登录`,
        title: '登录后，直接回到你的路线图',
        summary: '先看路径，再点节点，再看笔记。重要信息会直接出现在第一屏。',
        username: '用户名',
        usernamePlaceholder: 'team-operator',
        password: '密码',
        passwordPlaceholder: '输入你的密码',
        submit: '登录',
        submitting: '登录中...',
        sideTitle: '登录后你会马上看到',
        sideCards: [
          { title: '完整路径', body: '先看清全局，知道当前推进到哪里。' },
          { title: '节点细节', body: '点击节点，继续往下看相关笔记。' },
          { title: '同一空间继续协作', body: '和团队在同一条路径上继续推进。' },
        ],
        helperTitle: '进入后先看什么',
        helperBody: '路线图、当前节点状态，以及节点下面关联的笔记。',
        registerLead: '还没有账号？',
        registerAction: '创建空间',
        error: '登录失败，请稍后重试',
      }
    : {
        badge: `${BRAND.name} Sign in`,
        title: 'Return straight to your roadmap',
        summary: 'See the path first, click a node next, and open the related notes below it.',
        username: 'Username',
        usernamePlaceholder: 'team-operator',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        submit: 'Sign in',
        submitting: 'Signing in...',
        sideTitle: 'After sign-in you will see',
        sideCards: [
          { title: 'The full path', body: 'Understand the current progress at a glance.' },
          { title: 'Node details', body: 'Click a node and continue into the related notes.' },
          { title: 'One shared space', body: 'Keep moving with the team on the same path.' },
        ],
        helperTitle: 'What appears first',
        helperBody: 'The roadmap, node status, and the notes connected to each node.',
        registerLead: 'Need an account?',
        registerAction: 'Create workspace',
        error: 'Unable to sign in right now',
      }
)

const redirectTarget = computed(() => {
  const redirect = router.currentRoute.value.query.redirect
  return typeof redirect === 'string' ? redirect : '/roadmap'
})

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    const session = await authApi.login(form.value)
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
            <div class="text-sm font-bold text-[var(--accent)]">{{ copy.helperTitle }}</div>
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
  </div>
</template>
