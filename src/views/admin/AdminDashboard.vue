<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type {
  WorkspaceOnboardingChecklistItem,
  WorkspaceOverview,
  WorkspaceRole,
} from '@/types'

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
        title: '先看当前推进，再决定下一步',
        summary: '这里只回答三件事：路线图清不清楚、笔记有没有沉淀、接下来最该推进什么。',
        primaryAction: authStore.hasWriteAccess ? '进入路线图' : '查看路线图',
        secondaryAction: authStore.hasWriteAccess ? '进入笔记' : '查看笔记',
        role: '当前角色',
        metrics: {
          members: '成员',
          roadmap: '节点',
          notes: '笔记',
          completion: '完成率',
        },
        focusTitle: '当前重点',
        focusRoadmap: '路线图状态',
        focusNotes: '笔记沉淀',
        checklistTitle: '接下来该做的事',
        teamTitle: '协作基础',
        notesTitle: '最新笔记',
        noWorkspace: '当前没有可用空间。',
        loading: '正在加载总览...',
        errorFallback: '加载总览失败',
        noSummary: '这条笔记还没有摘要。',
        noNotes: '还没有笔记，先把关键过程记下来。',
        done: '已完成',
        todo: '下一步',
        completed: '已完成',
        inProgress: '进行中',
        pending: '待开始',
        teamRoles: {
          owner: '所有者',
          admin: '管理员',
          member: '成员',
          viewer: '只读',
        },
      }
    : {
        kicker: 'Overview',
        title: 'See the current progress before choosing the next move',
        summary: 'This page answers only three things: whether the roadmap is clear, whether notes are being captured, and what should move next.',
        primaryAction: authStore.hasWriteAccess ? 'Open roadmap' : 'View roadmap',
        secondaryAction: authStore.hasWriteAccess ? 'Open notes' : 'View notes',
        role: 'Current role',
        metrics: {
          members: 'Members',
          roadmap: 'Nodes',
          notes: 'Notes',
          completion: 'Completion',
        },
        focusTitle: 'Current focus',
        focusRoadmap: 'Roadmap status',
        focusNotes: 'Knowledge capture',
        checklistTitle: 'Next actions',
        teamTitle: 'Team foundation',
        notesTitle: 'Latest notes',
        noWorkspace: 'There is no active workspace.',
        loading: 'Loading overview...',
        errorFallback: 'Unable to load overview',
        noSummary: 'This note does not have a summary yet.',
        noNotes: 'No notes yet. Start capturing the work.',
        done: 'Done',
        todo: 'Next',
        completed: 'Completed',
        inProgress: 'In progress',
        pending: 'Todo',
        teamRoles: {
          owner: 'Owners',
          admin: 'Admins',
          member: 'Members',
          viewer: 'Viewers',
        },
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

const onboardingCopyMap = computed<
  Record<string, Pick<WorkspaceOnboardingChecklistItem, 'title' | 'description' | 'cta_label'>>
>(() =>
  localeStore.isChinese
    ? {
        roadmap_foundation: {
          title: '补齐路线图基础节点',
          description: '先把关键路径画出来，团队才能对齐推进顺序。',
          cta_label: '进入路线图',
        },
        invite_team: {
          title: '邀请第一批协作者',
          description: '让空间从个人记录，变成真正的协作空间。',
          cta_label: authStore.canManageMembers ? '管理成员' : '查看空间',
        },
        seed_notes: {
          title: '记录首批关键笔记',
          description: '把结论、实验和方法沉淀下来，后续才有复用价值。',
          cta_label: '进入笔记',
        },
      }
    : {
        roadmap_foundation: {
          title: 'Build the roadmap foundation',
          description: 'Draw the key path first so the team can align on order.',
          cta_label: 'Open roadmap',
        },
        invite_team: {
          title: 'Invite the first collaborators',
          description: 'Turn this from a personal space into a collaborative workspace.',
          cta_label: authStore.canManageMembers ? 'Manage members' : 'View workspace',
        },
        seed_notes: {
          title: 'Capture the first notes',
          description: 'Save methods, findings, and decisions so they can be reused later.',
          cta_label: 'Open notes',
        },
      }
)

const currentWorkspace = computed(() => overview.value?.workspace ?? authStore.activeWorkspace)
const workspaceName = computed(() => currentWorkspace.value?.workspace_name ?? '--')
const metrics = computed(() => overview.value?.metrics)
const recentNotes = computed(() => overview.value?.notes ?? [])
const currentRole = computed(() => roleLabelMap.value[(currentWorkspace.value?.role ?? authStore.activeRole ?? 'viewer') as WorkspaceRole])

const onboardingItems = computed(() =>
  (overview.value?.onboarding ?? []).map((item) => {
    const localized = onboardingCopyMap.value[item.key]
    return localized ? { ...item, ...localized } : item
  })
)

const teamBreakdown = computed(() => {
  const counts = overview.value?.team.role_counts
  if (!counts) return []

  return [
    { label: copy.value.teamRoles.owner, value: counts.owner },
    { label: copy.value.teamRoles.admin, value: counts.admin },
    { label: copy.value.teamRoles.member, value: counts.member },
    { label: copy.value.teamRoles.viewer, value: counts.viewer },
  ]
})

const suggestedNextMove = computed(() => {
  if (!metrics.value) return ''
  if (metrics.value.roadmap_total === 0) {
    return localeStore.isChinese ? '先把路线图主线画出来。' : 'Draw the main roadmap path first.'
  }
  if (metrics.value.notes_total < Math.min(metrics.value.roadmap_total, 3)) {
    return localeStore.isChinese ? '把正在推进的节点对应笔记补齐。' : 'Capture notes for the active roadmap nodes.'
  }
  if (metrics.value.members_total <= 1) {
    return localeStore.isChinese ? '邀请协作者加入，一起推进。' : 'Invite collaborators so the work can move together.'
  }
  return localeStore.isChinese ? '路线和记录都在形成，继续稳定推进。' : 'The path and knowledge base are forming. Keep it moving.'
})

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
  { immediate: true }
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
      <header class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-end">
        <div>
          <div class="admin-kicker">{{ copy.kicker }}</div>
          <h1 class="admin-headline mt-3">{{ workspaceName }}</h1>
          <p class="admin-subtitle mt-5 max-w-3xl">{{ copy.summary }}</p>

          <div class="mt-6 flex flex-wrap gap-3">
            <button class="product-button-dark" type="button" @click="router.push('/admin/roadmap')">
              {{ copy.primaryAction }}
            </button>
            <button class="product-button-secondary" type="button" @click="router.push('/admin/notes')">
              {{ copy.secondaryAction }}
            </button>
          </div>
        </div>

        <article class="admin-card p-6">
          <div class="admin-kpi-label">{{ copy.role }}</div>
          <div class="mt-3 text-3xl font-bold tracking-[-0.05em] text-[var(--ink-strong)]">{{ currentRole }}</div>
          <div class="mt-5 text-sm font-semibold text-[var(--ink-main)]">{{ suggestedNextMove }}</div>
        </article>
      </header>

      <section class="admin-kpi-grid mt-6">
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.members }}</div>
          <div class="admin-kpi-value">{{ metrics?.members_total ?? 0 }}</div>
        </article>
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.roadmap }}</div>
          <div class="admin-kpi-value">{{ metrics?.roadmap_total ?? 0 }}</div>
        </article>
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.notes }}</div>
          <div class="admin-kpi-value">{{ metrics?.notes_total ?? 0 }}</div>
        </article>
        <article class="admin-kpi-card">
          <div class="admin-kpi-label">{{ copy.metrics.completion }}</div>
          <div class="admin-kpi-value">{{ metrics?.completion_rate ?? 0 }}%</div>
        </article>
      </section>

      <section class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.focusTitle }}</div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div class="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.96)] p-5">
              <div class="text-sm font-semibold text-[var(--ink-soft)]">{{ copy.focusRoadmap }}</div>
              <div class="mt-3 text-lg font-semibold text-[var(--ink-strong)]">
                {{ metrics?.roadmap_in_progress ?? 0 }} {{ copy.inProgress }}
              </div>
              <div class="mt-3 h-2 rounded-full bg-[rgba(15,23,42,0.08)]">
                <div class="h-2 rounded-full bg-[var(--ink-strong)]" :style="{ width: `${metrics?.completion_rate ?? 0}%` }"></div>
              </div>
              <div class="mt-3 text-sm text-[var(--ink-soft)]">
                {{ metrics?.roadmap_completed ?? 0 }} {{ copy.completed }} / {{ metrics?.roadmap_todo ?? 0 }} {{ copy.pending }}
              </div>
            </div>

            <div class="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.96)] p-5">
              <div class="text-sm font-semibold text-[var(--ink-soft)]">{{ copy.focusNotes }}</div>
              <div class="mt-3 text-lg font-semibold text-[var(--ink-strong)]">
                {{ metrics?.notes_total ?? 0 }} / {{ Math.max(metrics?.roadmap_total ?? 0, 1) }}
              </div>
              <div class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ suggestedNextMove }}</div>
            </div>
          </div>
        </article>

        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.checklistTitle }}</div>
          <div class="mt-5 space-y-3">
            <article
              v-for="item in onboardingItems"
              :key="item.key"
              class="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.96)] p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <span :class="item.done ? 'admin-chip-green' : 'admin-chip'">{{ item.done ? copy.done : copy.todo }}</span>
                <button class="text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="router.push(item.cta_path)">
                  {{ item.cta_label }}
                </button>
              </div>
              <div class="mt-3 text-base font-semibold text-[var(--ink-strong)]">{{ item.title }}</div>
              <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
            </article>
          </div>
        </article>
      </section>

      <section class="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.teamTitle }}</div>
          <div class="mt-5 grid gap-3">
            <article
              v-for="item in teamBreakdown"
              :key="item.label"
              class="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.96)] px-4 py-4"
            >
              <div class="text-sm font-semibold text-[var(--ink-soft)]">{{ item.label }}</div>
              <div class="mt-2 text-xl font-semibold text-[var(--ink-strong)]">{{ item.value }}</div>
            </article>
          </div>
        </article>

        <article class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.notesTitle }}</div>
            <button class="text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="router.push('/admin/notes')">
              {{ copy.secondaryAction }}
            </button>
          </div>

          <div v-if="recentNotes.length > 0" class="mt-5 grid gap-3 md:grid-cols-2">
            <article
              v-for="note in recentNotes.slice(0, 4)"
              :key="note.id"
              class="admin-list-card cursor-pointer"
              @click="router.push(`/note/${note.id}`)"
            >
              <div class="text-xs font-semibold text-[var(--ink-soft)]">{{ formatDate(note.created_at) }}</div>
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
