<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceRole } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const isCollapsed = ref(false)
const searchInput = ref('')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        brandLine: '团队工作台',
        summary: '把总览、动态、搜索、路线图和笔记放在一个清晰入口里。',
        searchLabel: '快速搜索',
        searchPlaceholder: '搜索路线图、笔记或成员',
        searchAction: '搜索',
        workspaceLabel: '当前空间',
        workspaceHint: '切换空间后，总览、动态和搜索结果会一起刷新。',
        accountLabel: '当前账号',
        marketing: '返回首页',
        logout: '退出登录',
        collapse: '收起导航',
        expand: '展开导航',
        nav: [
          { to: '/admin/dashboard', short: '总', label: '总览', meta: '先看关键数据和下一步' },
          { to: '/admin/activity', short: '动', label: '动态', meta: '查看团队最近的变化' },
          { to: '/admin/search', short: '搜', label: '搜索', meta: '快速找到需要的信息' },
          { to: '/admin/workspace', short: '空', label: '空间', meta: '管理成员与协作边界' },
          { to: '/admin/roadmap', short: '图', label: '路线图', meta: '推进任务与执行节奏' },
          { to: '/admin/notes', short: '记', label: '笔记', meta: '沉淀研究与过程记录' },
        ],
      }
    : {
        brandLine: 'Team workspace',
        summary: 'Keep overview, activity, search, roadmap, and notes in one clear operating surface.',
        searchLabel: 'Quick search',
        searchPlaceholder: 'Search roadmap, notes, or members',
        searchAction: 'Search',
        workspaceLabel: 'Active workspace',
        workspaceHint: 'Changing workspace refreshes overview, activity, and search results together.',
        accountLabel: 'Account',
        marketing: 'Home',
        logout: 'Logout',
        collapse: 'Collapse navigation',
        expand: 'Expand navigation',
        nav: [
          { to: '/admin/dashboard', short: 'DB', label: 'Overview', meta: 'Key metrics and next steps' },
          { to: '/admin/activity', short: 'AC', label: 'Activity', meta: 'See recent team changes' },
          { to: '/admin/search', short: 'SR', label: 'Search', meta: 'Find information quickly' },
          { to: '/admin/workspace', short: 'WS', label: 'Workspace', meta: 'Members and collaboration rules' },
          { to: '/admin/roadmap', short: 'RM', label: 'Roadmap', meta: 'Execution path and delivery rhythm' },
          { to: '/admin/notes', short: 'NT', label: 'Notes', meta: 'Research and working records' },
        ],
      }
)

const roleLabelMap = computed<Record<WorkspaceRole, string>>(() =>
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

const currentRoleLabel = computed(() => {
  if (!authStore.activeRole) {
    return '--'
  }

  return roleLabelMap.value[authStore.activeRole]
})

watch(
  () => route.query.q,
  (value) => {
    searchInput.value = typeof value === 'string' ? value : ''
  },
  { immediate: true }
)

const workspaceSwitcher = computed({
  get: () => (authStore.activeWorkspaceId ? String(authStore.activeWorkspaceId) : ''),
  set: (value: string) => authStore.setActiveWorkspace(Number(value)),
})

const submitSearch = () => {
  const q = searchInput.value.trim()
  router.push({
    name: 'admin-search',
    query: q ? { q } : {},
  })
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)]">
    <div class="flex min-h-screen">
      <aside
        :class="[isCollapsed ? 'w-[92px]' : 'w-[286px]']"
        class="flex shrink-0 flex-col border-r border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] backdrop-blur transition-all duration-300"
      >
        <div class="flex h-full flex-col px-4 pb-4 pt-5">
          <div class="flex items-start justify-between gap-3">
            <router-link to="/" class="flex min-w-0 items-center gap-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ink-strong)] text-sm font-black text-white">
                {{ BRAND.mark }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0">
                <div class="truncate text-base font-black text-[var(--ink-strong)]">{{ BRAND.name }}</div>
                <div class="mt-1 truncate text-xs font-semibold text-[var(--ink-soft)]">{{ copy.brandLine }}</div>
              </div>
            </router-link>

            <button
              :aria-label="isCollapsed ? copy.expand : copy.collapse"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-sm font-black text-[var(--ink-main)] transition-all hover:border-[rgba(15,23,42,0.16)] hover:text-[var(--ink-strong)]"
              type="button"
              @click="isCollapsed = !isCollapsed"
            >
              {{ isCollapsed ? '+' : '-' }}
            </button>
          </div>

          <div v-if="!isCollapsed" class="mt-5 rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-black text-[var(--ink-strong)]">{{ copy.brandLine }}</div>
                <p class="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{{ copy.summary }}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          <div v-else class="mt-5 flex justify-center">
            <LanguageSwitcher />
          </div>

          <div v-if="!isCollapsed" class="mt-4 rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div class="text-sm font-semibold text-[var(--ink-main)]">{{ copy.searchLabel }}</div>
            <div class="mt-3 flex gap-2">
              <input
                v-model="searchInput"
                class="sidebar-input"
                type="text"
                :placeholder="copy.searchPlaceholder"
                @keyup.enter="submitSearch"
              />
              <button class="sidebar-action" type="button" @click="submitSearch">{{ copy.searchAction }}</button>
            </div>
          </div>

          <div v-if="!isCollapsed" class="mt-4 rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-[var(--ink-main)]">{{ copy.workspaceLabel }}</div>
              <span class="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-deep)]">
                {{ currentRoleLabel }}
              </span>
            </div>

            <select v-model="workspaceSwitcher" class="workspace-select mt-3 w-full">
              <option
                v-for="workspace in authStore.workspaces"
                :key="workspace.workspace_id"
                :value="String(workspace.workspace_id)"
              >
                {{ workspace.workspace_name }} / {{ roleLabelMap[workspace.role] }}
              </option>
            </select>

            <p class="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{{ copy.workspaceHint }}</p>
          </div>

          <nav class="mt-5 flex-1 space-y-1.5">
            <router-link
              v-for="item in copy.nav"
              :key="item.to"
              :to="item.to"
              class="nav-item"
              active-class="nav-item-active"
            >
              <div class="nav-code">{{ item.short }}</div>
              <div v-if="!isCollapsed" class="min-w-0">
                <div class="truncate text-sm font-semibold text-[var(--ink-strong)]">{{ item.label }}</div>
                <div class="mt-0.5 truncate text-xs text-[var(--ink-soft)]">{{ item.meta }}</div>
              </div>
            </router-link>
          </nav>

          <div class="mt-4 rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ink-strong)] text-sm font-black text-white">
                {{ authStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>

              <div v-if="!isCollapsed" class="min-w-0">
                <div class="text-xs font-semibold text-[var(--ink-soft)]">{{ copy.accountLabel }}</div>
                <div class="mt-1 truncate text-sm font-semibold text-[var(--ink-strong)]">{{ authStore.user?.username }}</div>
                <div class="mt-1 truncate text-xs text-[var(--ink-soft)]">{{ authStore.user?.email }}</div>
              </div>
            </div>

            <div v-if="!isCollapsed" class="mt-4 grid grid-cols-2 gap-2">
              <router-link class="footer-link" to="/">{{ copy.marketing }}</router-link>
              <button class="footer-link footer-link-danger" type="button" @click="handleLogout">{{ copy.logout }}</button>
            </div>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <div class="min-h-screen p-4 md:p-5">
          <div class="min-h-[calc(100vh-2rem)] rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.76)] shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
            <router-view />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.sidebar-input {
  @apply min-w-0 flex-1 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition-all;
}

.sidebar-input:focus {
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.sidebar-action {
  @apply rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all;
  background: var(--brand);
}

.sidebar-action:hover {
  background: var(--brand-deep);
}

.workspace-select {
  @apply rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink-strong)] outline-none transition-all;
}

.workspace-select:focus {
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.nav-item {
  @apply flex items-center gap-3 rounded-3xl border border-transparent px-3 py-3 transition-all hover:border-[rgba(15,23,42,0.08)] hover:bg-white/88;
}

.nav-item-active {
  @apply border-[rgba(15,23,42,0.08)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)];
}

.nav-code {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(15,23,42,0.06)] text-xs font-black text-[var(--ink-main)];
}

.footer-link {
  @apply inline-flex items-center justify-center rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink-main)] transition-all hover:border-[rgba(15,23,42,0.14)] hover:bg-white;
}

.footer-link-danger {
  @apply text-[var(--danger)];
}
</style>
