<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceInvitePreview } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const invite = ref<WorkspaceInvitePreview | null>(null)
const loading = ref(true)
const accepting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const token = computed(() => String(route.params.token || ''))
const redirectPath = computed(() => route.fullPath)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        badge: '空间邀请',
        title: '加入新的协作空间',
        summary: '加入后就能直接看到路线图、节点内容和当前推进状态。',
        inviter: '邀请人',
        role: '加入身份',
        expires: '失效时间',
        accept: '加入这个空间',
        accepting: '加入中...',
        login: '先登录',
        register: '注册后加入',
        success: '已加入空间，正在进入路线图...',
        loadError: '邀请链接无效或已失效',
        stepsTitle: '加入后会发生什么',
        steps: ['进入这套空间的路线图', '继续查看节点下的笔记和资料', '按分配的身份开始协作'],
      }
    : {
        badge: 'Workspace invite',
        title: 'Join a new workspace',
        summary: 'Open the roadmap, notes, and current progress after joining.',
        inviter: 'Invited by',
        role: 'Role',
        expires: 'Expires',
        accept: 'Join workspace',
        accepting: 'Joining...',
        login: 'Sign in first',
        register: 'Register to join',
        success: 'Workspace joined. Opening roadmap...',
        loadError: 'The invite link is invalid or expired',
        stepsTitle: 'What happens next',
        steps: ['Open the roadmap in this workspace', 'Continue into the notes and linked materials', 'Start working with the assigned role'],
      }
)

const roleLabel = computed(() =>
  localeStore.isChinese
    ? {
        owner: '所有者',
        admin: '管理员',
        member: '成员',
        viewer: '只读',
      }
    : {
        owner: 'Owner',
        admin: 'Admin',
        member: 'Member',
        viewer: 'Viewer',
      }
)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const openLogin = () => {
  router.push({ name: 'login', query: { redirect: redirectPath.value } })
}

const openRegister = () => {
  router.push({ name: 'register', query: { redirect: redirectPath.value } })
}

const loadInvite = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    invite.value = await workspaceApi.previewInviteLink(token.value)
  } catch (error: any) {
    invite.value = null
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const acceptInvite = async () => {
  if (!authStore.isLoggedIn) {
    openLogin()
    return
  }

  accepting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const membership = await workspaceApi.acceptInviteLink(token.value)
    const session = await authApi.getMe()
    authStore.setSession(session)
    authStore.setActiveWorkspace(membership.workspace_id)
    successMessage.value = copy.value.success
    router.push('/roadmap')
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    accepting.value = false
  }
}

onMounted(() => {
  loadInvite()
})
</script>

<template>
  <div class="page-shell px-5 py-6 md:px-8 md:py-8">
    <div class="product-shell mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section class="product-panel rounded-[2.4rem] p-8 md:p-10">
        <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/80 text-[var(--brand)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
          {{ copy.badge }}
        </div>

        <h1 class="product-title mt-8 text-4xl leading-[0.96] md:text-5xl">{{ copy.title }}</h1>
        <p class="mt-4 text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>

        <div v-if="loading" class="admin-empty mt-10">...</div>

        <div v-else-if="invite" class="mt-10 space-y-5">
          <article class="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.88)] p-6">
            <div class="text-3xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">
              {{ invite.workspace_name }}
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{{ copy.inviter }}</div>
                <div class="mt-2 text-sm font-semibold text-[var(--ink-strong)]">{{ invite.inviter_name }}</div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{{ copy.role }}</div>
                <div class="mt-2 text-sm font-semibold text-[var(--ink-strong)]">
                  {{ roleLabel[invite.role] }}
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{{ copy.expires }}</div>
                <div class="mt-2 text-sm font-semibold text-[var(--ink-strong)]">{{ formatDate(invite.expires_at) }}</div>
              </div>
            </div>
          </article>

          <div v-if="successMessage" class="rounded-[18px] bg-[rgba(20,33,43,0.06)] px-5 py-4 text-sm font-semibold text-[var(--ink-strong)]">
            {{ successMessage }}
          </div>

          <div v-if="errorMessage" class="product-error px-5 py-4 text-sm font-semibold">
            {{ errorMessage }}
          </div>

          <button class="product-button-dark w-full" type="button" :disabled="accepting" @click="acceptInvite">
            {{ accepting ? copy.accepting : copy.accept }}
          </button>

          <div v-if="!authStore.isLoggedIn" class="grid gap-3 md:grid-cols-2">
            <button class="product-button-secondary" type="button" @click="openLogin">
              {{ copy.login }}
            </button>
            <button class="product-button-secondary" type="button" @click="openRegister">
              {{ copy.register }}
            </button>
          </div>
        </div>

        <div v-else-if="errorMessage" class="product-error mt-10 px-5 py-4 text-sm font-semibold">
          {{ errorMessage }}
        </div>
      </section>

      <aside class="rounded-[2.4rem] bg-[var(--surface-dark)] p-8 text-white shadow-[0_36px_120px_rgba(20,33,43,0.18)] md:p-10">
        <div class="product-eyebrow border border-white/10 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.76)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.stepsTitle }}
        </div>

        <div class="mt-8 space-y-3">
          <article
            v-for="(step, index) in copy.steps"
            :key="step"
            class="flex gap-4 rounded-[1.4rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-4"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/88">
              {{ index + 1 }}
            </span>
            <p class="pt-1 text-sm font-semibold leading-7 text-[rgba(255,255,255,0.78)]">
              {{ step }}
            </p>
          </article>
        </div>
      </aside>
    </div>
  </div>
</template>
