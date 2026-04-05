<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import WorkspaceCommandPalette from '@/components/WorkspaceCommandPalette.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const isCollapsed = ref(false)
const isCommandPaletteOpen = ref(false)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        brandLine: '路线图协作空间',
        workspaceLabel: '当前空间',
        searchHint: 'Ctrl + K',
        quickOpen: '快速打开',
        accountLabel: '账号',
        logout: '退出',
        collapse: '收起导航',
        expand: '展开导航',
        nav: [
          { to: '/admin/dashboard', short: '览', label: '总览' },
          { to: '/admin/roadmap', short: '编', label: '编辑' },
          { to: '/admin/notes', short: '记', label: '笔记' },
          { to: '/admin/workspace', short: '员', label: '成员管理' },
        ],
      }
    : {
        brandLine: 'Roadmap workspace',
        workspaceLabel: 'Current workspace',
        searchHint: 'Ctrl + K',
        quickOpen: 'Quick open',
        accountLabel: 'Account',
        logout: 'Log out',
        collapse: 'Collapse navigation',
        expand: 'Expand navigation',
        nav: [
          { to: '/admin/dashboard', short: 'OV', label: 'Overview' },
          { to: '/admin/roadmap', short: 'ED', label: 'Edit' },
          { to: '/admin/notes', short: 'NT', label: 'Notes' },
          { to: '/admin/workspace', short: 'MB', label: 'Members' },
        ],
      },
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
      },
)

const hasMultipleWorkspaces = computed(() => authStore.workspaces.length > 1)

const workspaceSwitcher = computed({
  get: () => (authStore.activeWorkspaceId ? String(authStore.activeWorkspaceId) : ''),
  set: (value: string) => authStore.setActiveWorkspace(Number(value)),
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fbfbf9_0%,#f3f5f7_100%)]">
    <div class="flex min-h-screen">
      <aside
        :class="[isCollapsed ? 'w-[82px]' : 'w-[310px]']"
        class="border-r border-[rgba(15,23,42,0.05)] bg-[rgba(248,248,246,0.82)] backdrop-blur transition-all duration-300"
      >
        <div class="flex h-full flex-col gap-3 px-3 pb-4 pt-4 md:px-4 md:pb-5">
          <div class="flex items-center justify-between gap-3 px-1">
            <router-link to="/" class="flex min-w-0 items-center gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.08)] bg-white text-sm font-black text-[var(--ink-strong)]">
                {{ BRAND.mark }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0">
                <div class="truncate text-sm font-bold text-[var(--ink-strong)]">{{ BRAND.name }}</div>
                <div class="truncate text-[11px] text-[var(--ink-soft)]">{{ copy.brandLine }}</div>
              </div>
            </router-link>

            <button
              :aria-label="isCollapsed ? copy.expand : copy.collapse"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(15,23,42,0.06)] bg-white text-sm text-[var(--ink-soft)] transition-all hover:text-[var(--ink-strong)]"
              type="button"
              @click="isCollapsed = !isCollapsed"
            >
              {{ isCollapsed ? '+' : '-' }}
            </button>
          </div>

          <div
            :class="
              isCollapsed
                ? 'justify-center rounded-[18px] px-0 py-2.5'
                : 'items-center justify-between gap-3 rounded-[22px] px-4 py-3.5'
            "
            class="admin-sidebar-card flex shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
          >
            <div :class="isCollapsed ? 'justify-center' : 'gap-3'" class="flex min-w-0 items-center">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(15,23,42,0.06)] text-sm font-bold text-[var(--ink-strong)]">
                {{ authStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0">
                <div class="admin-sidebar-label">{{ copy.accountLabel }}</div>
                <div class="mt-1 truncate text-sm font-semibold text-[var(--ink-strong)]">{{ authStore.user?.username }}</div>
              </div>
            </div>

            <button
              v-if="!isCollapsed"
              class="text-xs font-semibold text-[var(--danger)] transition-opacity hover:opacity-78"
              type="button"
              @click="handleLogout"
            >
              {{ copy.logout }}
            </button>
          </div>

          <div v-if="!isCollapsed" class="admin-sidebar-card !p-3">
            <div class="admin-sidebar-label">{{ copy.workspaceLabel }}</div>
            <div class="mt-2 flex items-center justify-between gap-3">
              <div class="min-w-0 truncate text-sm font-semibold text-[var(--ink-strong)]">
                {{ authStore.activeWorkspace?.workspace_name || '--' }}
              </div>
              <span v-if="authStore.activeRole" class="admin-chip">
                {{ roleLabelMap[authStore.activeRole] }}
              </span>
            </div>
            <select
              v-if="hasMultipleWorkspaces"
              v-model="workspaceSwitcher"
              class="admin-select mt-3 !rounded-[14px] !px-3 !py-2.5 !text-sm"
            >
              <option
                v-for="workspace in authStore.workspaces"
                :key="workspace.workspace_id"
                :value="String(workspace.workspace_id)"
              >
                {{ workspace.workspace_name }}
              </option>
            </select>
          </div>

          <div
            :class="isCollapsed ? 'justify-center' : 'justify-between'"
            class="flex items-center gap-2 px-1"
          >
            <button
              class="flex h-10 items-center gap-2 rounded-[14px] border border-[rgba(15,23,42,0.06)] bg-white/86 px-3 text-left text-sm font-semibold text-[var(--ink-main)] transition-colors hover:border-[rgba(15,23,42,0.12)] hover:text-[var(--ink-strong)]"
              :class="isCollapsed ? 'w-10 justify-center px-0' : 'min-w-0 flex-1'"
              type="button"
              @click="isCommandPaletteOpen = true"
            >
              <span class="text-base leading-none">/</span>
              <span v-if="!isCollapsed" class="truncate">{{ copy.quickOpen }}</span>
            </button>

            <div
              v-if="!isCollapsed"
              class="rounded-full border border-[rgba(15,23,42,0.06)] bg-white/72 px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-soft)]"
            >
              {{ copy.searchHint }}
            </div>
          </div>

          <nav class="space-y-1 px-1">
            <router-link
              v-for="item in copy.nav"
              :key="item.to"
              :to="item.to"
              class="admin-nav-link"
              active-class="admin-nav-link-active"
            >
              <span class="admin-nav-icon">{{ item.short }}</span>
              <div v-if="!isCollapsed" class="min-w-0 text-sm font-semibold">
                {{ item.label }}
              </div>
            </router-link>
          </nav>

          <div class="mt-auto"></div>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <div class="min-h-screen px-2.5 py-2.5 md:px-3.5 md:py-3.5">
          <router-view />
        </div>
      </main>
    </div>
  </div>

  <WorkspaceCommandPalette :open="isCommandPaletteOpen" @close="isCommandPaletteOpen = false" />
</template>
