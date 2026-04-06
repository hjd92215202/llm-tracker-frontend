<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceOverview, WorkspaceRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const loading = ref(false)
const errorMessage = ref('')
const overview = ref<WorkspaceOverview | null>(null)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        kicker: '总览',
        title: '把当前空间继续往前推',
        summary: '这里只保留现在最该看的东西：节点、笔记、完成度和关键入口。',
        roadmapAction: '进入路线图',
        primaryAction: authStore.hasWriteAccess ? '进入编辑台' : '查看路线图',
        secondaryAction: authStore.hasWriteAccess ? '进入笔记' : '查看笔记',
        role: '当前角色',
        members: '成员',
        metrics: {
          roadmap: '节点',
          active: '进行中',
          notes: '笔记',
          completion: '完成度',
        },
        recentTitle: '最近笔记',
        noWorkspace: '当前没有可用空间。',
        loading: '正在加载总览...',
        errorFallback: '加载总览失败',
        noSummary: '这条笔记还没有摘要。',
        noNotes: '还没有笔记，先把关键过程记下来。',
        teamRoles: {
          owner: '所有者',
          admin: '管理员',
          member: '成员',
          viewer: '只读',
        },
      }
    : {
        kicker: 'Overview',
        title: 'Keep this workspace moving',
        summary: 'Show only the signals that matter right now: nodes, notes, completion, and the core entry points.',
        roadmapAction: 'Open roadmap',
        primaryAction: authStore.hasWriteAccess ? 'Open editor' : 'View roadmap',
        secondaryAction: authStore.hasWriteAccess ? 'Open notes' : 'View notes',
        role: 'Current role',
        members: 'Members',
        metrics: {
          roadmap: 'Nodes',
          active: 'Active',
          notes: 'Notes',
          completion: 'Completion',
        },
        recentTitle: 'Recent notes',
        noWorkspace: 'There is no active workspace.',
        loading: 'Loading overview...',
        errorFallback: 'Unable to load overview',
        noSummary: 'This note does not have a summary yet.',
        noNotes: 'No notes yet. Start capturing the work.',
        teamRoles: {
          owner: 'Owner',
          admin: 'Admin',
          member: 'Member',
          viewer: 'Viewer',
        },
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

const currentWorkspace = computed(() => overview.value?.workspace ?? authStore.activeWorkspace)
const workspaceName = computed(() => currentWorkspace.value?.workspace_name ?? '--')
const metrics = computed(() => overview.value?.metrics)
const recentNotes = computed(() => overview.value?.notes ?? [])
const currentRole = computed(
  () => roleLabelMap.value[(currentWorkspace.value?.role ?? authStore.activeRole ?? 'viewer') as WorkspaceRole],
)
const membersTotal = computed(() => overview.value?.team.role_counts ? metrics.value?.members_total ?? 0 : 0)

const fetchOverview = async () => {
  if (!authStore.activeWorkspaceId) {
    overview.value = null
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    overview.value = await workspaceApi.getOverview(authStore.activeWorkspaceId)
  } catch (error: any) {
    overview.value = null
    errorMessage.value = error.message || copy.value.errorFallback
  } finally {
    loading.value = false
  }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchOverview()
  },
  { immediate: true },
)
</script>

<template>
  <div class="admin-page">
    <div v-if="errorMessage" class="product-error mb-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <div v-if="loading && !overview" class="admin-empty">
      {{ copy.loading }}
    </div>

    <div v-else-if="!currentWorkspace" class="admin-empty">
      {{ copy.noWorkspace }}
    </div>

    <template v-else>
      <header class="admin-card p-6 md:p-8">
        <div class="admin-kicker">{{ copy.kicker }}</div>
        <div class="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div class="min-w-0">
            <h1 class="admin-headline">{{ workspaceName }}</h1>
            <p class="admin-subtitle mt-4 max-w-3xl">{{ copy.summary }}</p>

            <div class="mt-5 flex flex-wrap gap-2">
              <span class="admin-chip">{{ copy.role }} · {{ currentRole }}</span>
              <span class="admin-chip">{{ copy.members }} · {{ membersTotal }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <button class="product-button-secondary" type="button" @click="router.push('/roadmap')">
              {{ copy.roadmapAction }}
            </button>
            <button
              class="product-button-dark"
              type="button"
              @click="router.push('/roadmap')"
            >
              {{ copy.primaryAction }}
            </button>
            <button class="product-button-secondary" type="button" @click="router.push('/admin/notes')">
              {{ copy.secondaryAction }}
            </button>
          </div>
        </div>
      </header>

      <section class="admin-kpi-grid mt-6">
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.roadmap }}</div>
          <div class="admin-kpi-value">{{ metrics?.roadmap_total ?? 0 }}</div>
        </article>
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.active }}</div>
          <div class="admin-kpi-value">{{ metrics?.roadmap_in_progress ?? 0 }}</div>
        </article>
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.notes }}</div>
          <div class="admin-kpi-value">{{ metrics?.notes_total ?? 0 }}</div>
        </article>
      </section>

      <section class="mt-6">
        <article class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.recentTitle }}</div>
            <button class="text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="router.push('/admin/notes')">
              {{ copy.secondaryAction }}
            </button>
          </div>

          <div v-if="recentNotes.length > 0" class="mt-5 space-y-3">
            <article
              v-for="note in recentNotes.slice(0, 4)"
              :key="note.id"
              class="admin-list-card cursor-pointer"
              @click="router.push(`/note/${note.id}`)"
            >
              <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--ink-soft)]">
                <span>{{ formatDate(note.created_at) }}</span>
              </div>
              <div class="mt-2 text-base font-semibold text-[var(--ink-strong)]">{{ note.title }}</div>
              <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noSummary }}</p>
            </article>
          </div>

          <div v-else class="admin-empty mt-5 !p-8">
            {{ copy.noNotes }}
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
